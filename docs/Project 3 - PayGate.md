---
tags:
  - training
  - project
  - paygate
  - nhom-3
created: 2026-07-19
updated: 2026-07-19
---

# Project 3 — PayGate (Payment Gateway Simulator)

**Team**: 3 (2 people)
**Domain**: Payment Processing — payment gateway simulation with double-entry ledger
**Prefix**: PAY
Repo: https://github.com/TuanHoAnh/PayGate
## Business Description

Payment gateway simulation system:
- Merchant management (payment-accepting entities)
- Wallet/account management
- Payment transaction processing
- Double-entry bookkeeping
- Webhook notification to merchants
- Idempotency key to prevent duplicate payments

## Database Schema

### Core Tables

```sql
-- V2__create_merchant_tables.sql (V1 is users from starter)
CREATE TABLE merchants (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE REFERENCES users(id),
    merchant_name VARCHAR(255) NOT NULL,
    merchant_code VARCHAR(50) NOT NULL UNIQUE,
    api_key VARCHAR(255) NOT NULL UNIQUE,
    webhook_url VARCHAR(500),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- V3__create_account_tables.sql
CREATE TABLE accounts (
    id BIGSERIAL PRIMARY KEY,
    owner_id BIGINT NOT NULL,
    owner_type VARCHAR(20) NOT NULL,     -- USER, MERCHANT, SYSTEM
    account_number VARCHAR(20) NOT NULL UNIQUE,
    balance DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(3) NOT NULL DEFAULT 'VND',
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- V4__create_transaction_tables.sql
CREATE TABLE transactions (
    id BIGSERIAL PRIMARY KEY,
    transaction_ref VARCHAR(50) NOT NULL UNIQUE,
    idempotency_key VARCHAR(100) UNIQUE,
    source_account_id BIGINT NOT NULL REFERENCES accounts(id),
    dest_account_id BIGINT NOT NULL REFERENCES accounts(id),
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'VND',
    type VARCHAR(20) NOT NULL,          -- PAYMENT, REFUND, TOPUP, WITHDRAW
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    merchant_id BIGINT REFERENCES merchants(id),
    description TEXT,
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- V5__create_ledger_entries.sql
CREATE TABLE ledger_entries (
    id BIGSERIAL PRIMARY KEY,
    transaction_id BIGINT NOT NULL REFERENCES transactions(id),
    account_id BIGINT NOT NULL REFERENCES accounts(id),
    entry_type VARCHAR(6) NOT NULL,     -- DEBIT, CREDIT
    amount DECIMAL(15,2) NOT NULL,
    balance_after DECIMAL(15,2) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- V6__create_webhook_log.sql
CREATE TABLE webhook_logs (
    id BIGSERIAL PRIMARY KEY,
    transaction_id BIGINT NOT NULL REFERENCES transactions(id),
    merchant_id BIGINT NOT NULL REFERENCES merchants(id),
    url VARCHAR(500) NOT NULL,
    payload JSONB NOT NULL,
    response_status INT,
    response_body TEXT,
    attempt INT NOT NULL DEFAULT 1,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    next_retry_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- V7__create_indexes.sql
CREATE INDEX idx_transactions_ref ON transactions(transaction_ref);
CREATE INDEX idx_transactions_idempotency ON transactions(idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX idx_transactions_source ON transactions(source_account_id);
CREATE INDEX idx_transactions_dest ON transactions(dest_account_id);
CREATE INDEX idx_transactions_merchant ON transactions(merchant_id);
CREATE INDEX idx_transactions_status ON transactions(status) WHERE status IN ('PENDING', 'PROCESSING');
CREATE INDEX idx_ledger_transaction ON ledger_entries(transaction_id);
CREATE INDEX idx_ledger_account ON ledger_entries(account_id);
CREATE INDEX idx_webhook_pending ON webhook_logs(status, next_retry_at) WHERE status = 'PENDING';
```

### Transaction Status Flow
```
PENDING → PROCESSING → COMPLETED
                     → FAILED
       → EXPIRED (timeout)
```

### Double-Entry Principle
```
Payment 100,000 VND from User → Merchant:
  DEBIT   user_account    100,000 (balance decreases)
  CREDIT  merchant_account 100,000 (balance increases)

Sum of all DEBIT = Sum of all CREDIT (always)
```

## API Endpoints

### Accounts
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/v1/accounts/me` | USER | My account info + balance |
| GET | `/api/v1/accounts/{id}/balance` | USER | Account balance (cached) |
| POST | `/api/v1/accounts/topup` | USER | Top-up balance |
| GET | `/api/v1/accounts/{id}/history` | USER | Transaction history |

### Merchants (Admin)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/v1/admin/merchants` | ADMIN | Register merchant |
| GET | `/api/v1/admin/merchants` | ADMIN | List merchants |
| PUT | `/api/v1/admin/merchants/{id}` | ADMIN | Update merchant |

### Transactions
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/v1/transactions/pay` | USER | Create payment (with idempotency key) |
| GET | `/api/v1/transactions/{ref}` | USER | Get transaction by ref |
| POST | `/api/v1/transactions/{ref}/refund` | ADMIN | Refund transaction |
| GET | `/api/v1/transactions` | USER | My transactions (paginated) |

### Ledger (Admin)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/v1/admin/ledger/verify` | ADMIN | Verify double-entry balance |
| GET | `/api/v1/admin/ledger/account/{id}` | ADMIN | Account ledger entries |

## Challenge Details

### DB: Double-Entry Ledger + Idempotency
- SERIALIZABLE isolation for payment processing
- Lock accounts in ID order to prevent deadlock
- Idempotency key prevents duplicate payments
- Every transaction creates exactly 2 balanced ledger entries

### Redis: Transaction Dedup + Balance Cache
- **Transaction Dedup**: `tx:dedup:{idempotencyKey}` → transactionRef, TTL 24h
- **Balance Cache**: `account:balance:{accountId}` → balance, TTL 5 min

### RabbitMQ: Payment Flow
```
PaymentRequestEvent → payment.exchange
  → payment.validate.queue → ValidationConsumer → Process → PaymentCompletedEvent
    → settlement.queue → SettlementConsumer
    → webhook.queue → WebhookConsumer → Call merchant URL (retry 5x exponential)
```

| Exchange | Type | Queue | Routing Key |
|----------|------|-------|-------------|
| payment.exchange | Topic | payment.validate.queue | payment.request |
| payment.exchange | Topic | settlement.queue | payment.completed |
| payment.exchange | Topic | webhook.queue | payment.completed |
| payment.exchange | Topic | notification.queue | payment.# |

---

## Weekly Requirements

### Week 1 Requirements

#### Backend
- [ ] REQ-PAY-B-101: Create `Merchant` entity with fields: id, userId, merchantName, merchantCode, apiKey, webhookUrl, active. Add Flyway migration V2.
- [ ] REQ-PAY-B-102: Create `Account` entity with fields: id, ownerId, ownerType (USER/MERCHANT/SYSTEM), accountNumber, balance (BigDecimal), currency, status, version. Add Flyway migration V3.
- [ ] REQ-PAY-B-103: Implement `MerchantService` with CRUD operations. Auto-generate apiKey on creation. Use MapStruct for mapping.
- [ ] REQ-PAY-B-104: Implement `AccountService` with operations: createAccount (auto on user registration), getBalance, topUp. Use MapStruct.
- [ ] REQ-PAY-B-105: Create merchant REST endpoints: `POST /api/v1/admin/merchants`, `GET /api/v1/admin/merchants`, `PUT /api/v1/admin/merchants/{id}`.
- [ ] REQ-PAY-B-106: Create account REST endpoints: `GET /api/v1/accounts/me`, `GET /api/v1/accounts/{id}/balance`, `POST /api/v1/accounts/topup`.
- [ ] REQ-PAY-B-107: Add Flyway migrations V4 for transactions, V5 for ledger_entries, V6 for webhook_logs, V7 for indexes.

#### Angular
- [ ] REQ-PAY-F-101: Create `MerchantListComponent` displaying merchants in a table with columns: Name, Code, Status, Webhook URL.
- [ ] REQ-PAY-F-102: Create `MerchantFormComponent` with reactive form for create/edit merchant.
- [ ] REQ-PAY-F-103: Create `AccountDashboardComponent` showing user's account balance, account number.
- [ ] REQ-PAY-F-104: Add merchant and account routes. Wire up sidebar navigation.

#### Testing
- [ ] REQ-PAY-T-101: Write unit tests for `MerchantService`: create (valid + duplicate code), getById, update. Min 4 tests.
- [ ] REQ-PAY-T-102: Write unit tests for `AccountService`: create, getBalance, topUp. Min 3 tests.
- [ ] REQ-PAY-T-103: Verify Swagger UI shows all endpoints correctly.

### Week 2 Requirements

#### Backend
- [ ] REQ-PAY-B-201: Implement `TransactionService.processPayment()` with SERIALIZABLE isolation. Check idempotency key first, lock accounts in ID order, validate balance, update balances, create transaction, create 2 ledger entries (DEBIT + CREDIT), publish event.
- [ ] REQ-PAY-B-202: Create transaction REST endpoints: `POST /api/v1/transactions/pay`, `GET /api/v1/transactions/{ref}`, `GET /api/v1/transactions` (my transactions, paginated).
- [ ] REQ-PAY-B-203: Implement refund endpoint: `POST /api/v1/transactions/{ref}/refund`. Create reverse ledger entries. Validate original transaction is COMPLETED.
- [ ] REQ-PAY-B-204: Create ledger admin endpoints: `GET /api/v1/admin/ledger/verify` (sum DEBIT = sum CREDIT), `GET /api/v1/admin/ledger/account/{id}` (ledger entries for account).
- [ ] REQ-PAY-B-205: Implement idempotency with Redis dedup cache: `tx:dedup:{key}` → check Redis before DB. TTL 24h.
- [ ] REQ-PAY-B-206: Implement balance cache: `account:balance:{id}` with 5-min TTL. Invalidate on transaction.
- [ ] REQ-PAY-B-207: Set up RabbitMQ: `payment.exchange` (topic), queues for validation, settlement, webhook, notification. Create `PaymentEventPublisher`.
- [ ] REQ-PAY-B-208: Implement `WebhookConsumer` — call merchant's webhook URL with transaction payload. Log each attempt in webhook_logs.
- [ ] REQ-PAY-B-209: Implement transaction history endpoint with pagination: `GET /api/v1/accounts/{id}/history`.

#### Angular
- [ ] REQ-PAY-F-201: Create `PaymentFormComponent` — form to create payment: destination account, amount, description, idempotency key. Show confirmation before submitting.
- [ ] REQ-PAY-F-202: Create `TransactionListComponent` — list user's transactions with columns: Ref, Date, Type, Amount, Status.
- [ ] REQ-PAY-F-203: Create `TransactionDetailComponent` — show transaction details including ledger entries.
- [ ] REQ-PAY-F-204: Create `TopUpComponent` — form to add balance to user's account.

#### Testing
- [ ] REQ-PAY-T-201: Write unit tests for `TransactionService.processPayment()`: success, insufficient balance, duplicate idempotency key. Min 3 tests.
- [ ] REQ-PAY-T-202: Write unit tests for ledger verification: verify DEBIT sum = CREDIT sum after multiple transactions. Min 2 tests.

### Week 3 Requirements
#### Backend
- [ ] REQ-PAY-B-301: Create integration test for payment flow: register → create account → topup → pay → verify balances + ledger entries.
- [ ] REQ-PAY-B-302: Write concurrent payment test: 10 threads simultaneously pay from same account (balance=1000, each pays 100). Verify final balance = 0, no negative balance.
- [ ] REQ-PAY-B-303: Write idempotency test: send same payment request twice with same idempotency_key. Verify only 1 transaction created, same response returned.
- [ ] REQ-PAY-B-304: Configure webhook retry with exponential backoff: 5 attempts (immediate, 1min, 5min, 30min, 2h). Failed after 5 → mark FAILED + alert.
- [ ] REQ-PAY-B-305: Run `EXPLAIN ANALYZE` on transaction queries. Verify indexes are used effectively.
- [ ] REQ-PAY-B-306: Add complete Swagger/OpenAPI annotations on all controllers.

#### Frontend
- [ ] REQ-PAY-F-301: Create `AdminLedgerComponent` — admin view showing ledger verification result (total debits, total credits, balanced status).
- [ ] REQ-PAY-F-302: Create `WebhookLogComponent` — admin view of webhook delivery logs with status, attempts, response.
- [ ] REQ-PAY-F-303: Create `AdminDashboardComponent` — summary cards: total transactions, total volume, failed transactions count.

#### Testing
- [ ] REQ-PAY-T-301: Write ≥ 5 integration tests using Testcontainers: account creation, top-up, payment, refund, ledger verification.
- [ ] REQ-PAY-T-302: Write concurrent test verifying account locking prevents negative balance.
- [ ] REQ-PAY-T-303: Write deadlock prevention test: 2 users pay each other simultaneously (A→B and B→A). Verify both succeed due to ordered locking.

#### End-to-end, Performance, Demo
- [ ] REQ-PAY-W-401: Complete end-to-end flow: register → create account → topup → pay → ledger entries created → webhook sent → verify balance.
- [ ] REQ-PAY-W-402: Cross-review Team 4 (StockPulse) code with ≥ 10 comments.
- [ ] REQ-PAY-W-403: Fix ≥ 5 bugs from mentor-created issues.
- [ ] REQ-PAY-W-404: Performance test with `ab -n 1000 -c 50`. Target: avg < 200ms, error rate < 1%.
- [ ] REQ-PAY-W-405: Complete README with setup guide, architecture description, API docs.
- [ ] REQ-PAY-W-406: Prepare and deliver 15-20 minute demo.
