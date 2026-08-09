# 🗄️ Database Design — Thiết Kế Cơ Sở Dữ Liệu

> **Nguồn:** `docs/archive/02-DATABASE.md`
> **Nguyên tắc:** Mọi số tiền dùng `DECIMAL(15,2)` — TUYỆT ĐỐI không dùng FLOAT/DOUBLE

---

## 1. ERD Tổng Quan

```
USERS ─────────────── MERCHANTS (quan hệ 1-1 qua user_id UNIQUE)
  │                       │
  │ (1 user 1 account)    │ (1 merchant 1 account)
  ▼                       ▼
ACCOUNTS (owner_type=USER) ─── ACCOUNTS (owner_type=MERCHANT)
  │                                     │
  └──────────────────┬──────────────────┘
                     │ (source/dest account)
                     ▼
               TRANSACTIONS
                   │   │
                   │   └──► WEBHOOK_LOGS (thông báo merchant)
                   │
                   └──► LEDGER_ENTRIES (2 dòng mỗi transaction)
```

---

## 2. Thứ Tự Migration

| Migration | Bảng | Phụ thuộc |
|---|---|---|
| V1 | `users` | Kế thừa starter |
| V2 | `merchants` | users |
| V3 | `accounts` | — (polymorphic) |
| V4 | `transactions` | accounts, merchants |
| V5 | `ledger_entries` | transactions, accounts |
| V6 | `webhook_logs` | transactions, merchants |
| V7 | Indexes | Tất cả bảng trên |
| V28-V30 | BNPL: credit_lines, loan_schedules, credit_events | users, loans |
| V31-V33 | Refund: refunds, settlement_buckets, payouts | transactions, merchants |

---

## 3. Chi Tiết Từng Bảng

### `merchants` (V2)
```sql
CREATE TABLE merchants (
    id         BIGSERIAL PRIMARY KEY,
    user_id    BIGINT NOT NULL UNIQUE REFERENCES users(id),
    merchant_name VARCHAR(255) NOT NULL,
    merchant_code VARCHAR(50)  NOT NULL UNIQUE,
    api_key    VARCHAR(255) NOT NULL UNIQUE,  -- Sinh tự động khi tạo
    webhook_url VARCHAR(500),
    active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```
**Thiết kế:** `user_id UNIQUE` → 1 user chỉ được là 1 merchant. `api_key` được sinh ngẫu nhiên trong `MerchantService.create()`.

---

### `accounts` (V3)
```sql
CREATE TABLE accounts (
    id             BIGSERIAL PRIMARY KEY,
    owner_id       BIGINT NOT NULL,
    owner_type     VARCHAR(20) NOT NULL,     -- USER | MERCHANT | SYSTEM
    account_number VARCHAR(20) NOT NULL UNIQUE,
    balance        DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    currency       VARCHAR(3) NOT NULL DEFAULT 'VND',
    status         VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',  -- ACTIVE | FROZEN | CLOSED
    version        BIGINT NOT NULL DEFAULT 0,  -- Cho optimistic locking
    created_at     TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMP NOT NULL DEFAULT NOW()
);
```
**Thiết kế:**
- `owner_id + owner_type` là polymorphic reference (không phải FK trực tiếp) vì account có thể thuộc `USER`, `MERCHANT`, hoặc `SYSTEM`.
- Tài khoản `SYSTEM` dùng cho bút toán trung gian (nạp tiền, phí, ...).
- `version` cho `@Version` (JPA optimistic locking) — nhưng dự án này chọn **Pessimistic Lock** bằng `SELECT ... FOR UPDATE`.

---

### `transactions` (V4)
```sql
CREATE TABLE transactions (
    id               BIGSERIAL PRIMARY KEY,
    transaction_ref  VARCHAR(50)  NOT NULL UNIQUE,   -- Mã public (VD: TXN-20260720-000123)
    idempotency_key  VARCHAR(100) UNIQUE,             -- nullable, nhưng nếu có phải unique
    source_account_id BIGINT NOT NULL REFERENCES accounts(id),
    dest_account_id  BIGINT NOT NULL REFERENCES accounts(id),
    amount           DECIMAL(15,2) NOT NULL,
    currency         VARCHAR(3) NOT NULL DEFAULT 'VND',
    type             VARCHAR(20) NOT NULL,  -- PAYMENT | REFUND | TOPUP | WITHDRAW
    status           VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    merchant_id      BIGINT REFERENCES merchants(id),
    description      TEXT,
    metadata         JSONB,
    created_at       TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMP NOT NULL DEFAULT NOW()
);
```
**Status Flow:**
```
PENDING → PROCESSING → COMPLETED
                    → FAILED
PENDING → EXPIRED (timeout)
```
**Thiết kế:**
- `TOPUP`: source_account là tài khoản SYSTEM (nạp tiền ảo từ không khí).
- `idempotency_key` nullable nhưng UNIQUE → giao dịch hệ thống không cần key, nếu có thì bắt buộc duy nhất.

---

### `ledger_entries` (V5)
```sql
CREATE TABLE ledger_entries (
    id             BIGSERIAL PRIMARY KEY,
    transaction_id BIGINT NOT NULL REFERENCES transactions(id),
    account_id     BIGINT NOT NULL REFERENCES accounts(id),
    entry_type     VARCHAR(6) NOT NULL,      -- DEBIT hoặc CREDIT
    amount         DECIMAL(15,2) NOT NULL,
    balance_after  DECIMAL(15,2) NOT NULL,   -- Snapshot số dư sau bút toán
    created_at     TIMESTAMP NOT NULL DEFAULT NOW()
);
```
**Bất biến bắt buộc:**
```sql
-- Query này PHẢI luôn trả balanced=true
SELECT
  SUM(CASE WHEN entry_type='DEBIT'  THEN amount ELSE 0 END) AS total_debit,
  SUM(CASE WHEN entry_type='CREDIT' THEN amount ELSE 0 END) AS total_credit
FROM ledger_entries;
-- total_debit == total_credit tại mọi thời điểm
```

**Mỗi transaction tạo đúng 2 dòng:**
```
Transaction: User A → Merchant B, amount=100k
  Row 1: account_id=A, entry_type=DEBIT,  amount=100k, balance_after=200k
  Row 2: account_id=B, entry_type=CREDIT, amount=100k, balance_after=350k
```

---

### `webhook_logs` (V6)
```sql
CREATE TABLE webhook_logs (
    id             BIGSERIAL PRIMARY KEY,
    transaction_id BIGINT NOT NULL REFERENCES transactions(id),
    merchant_id    BIGINT NOT NULL REFERENCES merchants(id),
    url            VARCHAR(500) NOT NULL,
    payload        JSONB NOT NULL,
    response_status INT,
    response_body  TEXT,
    attempt        INT NOT NULL DEFAULT 1,
    status         VARCHAR(20) NOT NULL DEFAULT 'PENDING',  -- PENDING | SUCCESS | FAILED
    next_retry_at  TIMESTAMP,
    created_at     TIMESTAMP NOT NULL DEFAULT NOW()
);
```
**Retry strategy:** 1p → 5p → 30p → 2h (tối đa 5 lần). Sau lần 5 → `FAILED`.

---

### Indexes (V7)
```sql
CREATE INDEX idx_transactions_ref ON transactions(transaction_ref);
CREATE INDEX idx_transactions_idempotency ON transactions(idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX idx_transactions_source ON transactions(source_account_id);
CREATE INDEX idx_transactions_dest ON transactions(dest_account_id);
CREATE INDEX idx_transactions_status ON transactions(status) WHERE status IN ('PENDING', 'PROCESSING');
CREATE INDEX idx_ledger_transaction ON ledger_entries(transaction_id);
CREATE INDEX idx_ledger_account ON ledger_entries(account_id);
CREATE INDEX idx_webhook_pending ON webhook_logs(status, next_retry_at) WHERE status = 'PENDING';
```
> Dùng **Partial Index** cho cột trạng thái → tối ưu query "đang chờ xử lý". Verify bằng `EXPLAIN ANALYZE`.

---

## 4. Chiến Lược Locking & Concurrency

### Tại Sao Cần Lock?
Hai user cùng lúc thanh toán từ 1 tài khoản → cả 2 đọc số dư 500k → cả 2 trừ 400k → số dư âm 300k. **KHÔNG ĐƯỢC PHÉP.**

### Cách Làm
```java
// TransactionServiceImpl.java
@Transactional(isolation = Isolation.SERIALIZABLE)
public TransactionResponse processPayment(PaymentRequest request) {
    // Luôn lock theo thứ tự id tăng dần để tránh deadlock
    Long smallerId = Math.min(sourceId, destId);
    Long largerId  = Math.max(sourceId, destId);

    Account first  = accountRepository.findByIdForUpdate(smallerId); // SELECT ... FOR UPDATE
    Account second = accountRepository.findByIdForUpdate(largerId);

    // ... validate, update balance, insert ledger ...
}
```

**Tại sao lock theo thứ tự id?**
```
Nếu không có thứ tự:
  Thread 1: Lock Account A → chờ Lock Account B
  Thread 2: Lock Account B → chờ Lock Account A
  → DEADLOCK!

Nếu có thứ tự (nhỏ trước, lớn sau):
  Thread 1: Lock Account A (id=1) → Lock Account B (id=2) → done
  Thread 2: Lock Account A (id=1) → phải CHỜ Thread 1 xong → Lock Account B → done
  → Không deadlock!
```

---

## 5. Ràng Buộc Toàn Vẹn Dữ Liệu

| Ràng buộc | Cách enforce |
|---|---|
| Số dư không âm | Check trước khi debit trong Service |
| DEBIT = CREDIT | Tạo 2 dòng trong cùng 1 transaction |
| Idempotency key unique | `UNIQUE` constraint ở DB |
| Merchant code unique | `UNIQUE` constraint ở DB |
| 1 user = 1 merchant | `user_id UNIQUE` ở bảng merchants |
| Balance không float | `DECIMAL(15,2)` không dùng `DOUBLE` |

---

## Liên kết
- [[System Overview]] — Kiến trúc tổng thể
- [[Feature 00 - Payment Gateway]] — Checkout sessions
- [[Feature 01 - BNPL]] — credit_lines, loan_schedules
- [[Feature 04 - Refund & Settlement]] — refunds, settlement_buckets
