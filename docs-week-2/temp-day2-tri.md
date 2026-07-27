# Day 2 Plan — Trí (Thứ Tư 29/07/2026)

**Branch:** `feature/w2-reward-loan-service`
**REQ:** REQ-PAY-W2-B-104, B-105, B-401, B-402
**Mục tiêu:** Service Layer & Core Business Logic cho Reward/Voucher + Entity layer cho Loan.

---

## 0. Blocker cần xử lý TRƯỚC (sync với team)

Đọc code Week 1 thật thì có 2 chỗ phải sửa hạ tầng dùng chung trước khi làm LoyaltyService:

### 0.1. Mở rộng `PaymentCompletedEvent`
Hiện tại record chỉ có: `transactionRef, merchantId, webhookUrl, amount, status, userEmail, senderUsername, recipientAccountNo, description`.
→ **Thiếu `transactionType` và `userId`** — LoyaltyService cần cả 2 để tính điểm theo loại giao dịch và ghi `point_transactions.user_id`.

**Việc cần làm:**
- Thêm field `transactionType` (String hoặc `TransactionType`) và `userId` (Long) vào event.
- Cập nhật nơi publish trong `TransactionServiceImpl` để truyền 2 field này.
- ⚠️ Đây là shared infra — Vinh (QR) và Nhi (Vault/Bill) cũng publish event này để tích điểm. **Sync trước khi sửa** để tránh conflict.

### 0.2. Bổ sung `TransactionType` enum
Hiện tại: `PAYMENT, REFUND, TOPUP, WITHDRAW`.
→ Business rule tích điểm cần thêm: `BILL_PAYMENT`, `LOAN_REPAYMENT`, `LOAN_DISBURSEMENT`, `VAULT_DEPOSIT`.
- Enum thuộc shared scope → merge sớm trong ngày (theo dependency order trong doc phân công).

---

## 1. REQ-PAY-W2-B-104 — LoyaltyService (Event Listener)

**Interface + Impl:**
- `LoyaltyService` (interface) + `LoyaltyServiceImpl`.
- Listener nhận `PaymentCompletedEvent` (RabbitMQ consumer / `@RabbitListener`, theo pattern consumer Week 1).

**Logic tính điểm (chỉ khi `status == COMPLETED`):**
| TransactionType | Tỷ lệ |
|---|---|
| `PAYMENT` / `BILL_PAYMENT` | 10.000₫ = 1 điểm |
| `LOAN_REPAYMENT` | 10.000₫ = 2 điểm |
| `VAULT_DEPOSIT` | 20.000₫ = 1 điểm |

- Giao dịch `PENDING`/`FAILED` → bỏ qua, không tích.
- Ghi bản ghi `PointTransaction` (type=`EARN`, points, description, transactionRef=event.transactionRef, user).
- ⚠️ **Idempotency**: consumer có thể nhận lại event (retry) → check `transactionRef` đã tích chưa (dùng `PointTransactionRepository`) trước khi ghi, tránh tích điểm 2 lần.

---

## 2. REQ-PAY-W2-B-105 — VoucherService

**Interface + Impl** với 3 nhóm method:

### 2.1. CRUD (Admin)
- `create()`, `getAll()` / `getById()`, `update()` — quản lý kho voucher.
- Dùng `VoucherMapper` (đã tạo Day 1) để trả `VoucherResponse`.

### 2.2. `redeem(userId, voucherId)` — đổi điểm lấy voucher
- Kiểm tra tổng điểm user (`PointTransactionRepository.getTotalPointsByUserId`) ≥ `voucher.pointsRequired`.
- Kiểm tra `remainingQty > 0` và chưa hết hạn (`expiresAt`).
- Ghi `PointTransaction` type=`REDEEM` (points âm), giảm `remainingQty`, tạo `UserVoucher` status=`AVAILABLE`.
- ⚠️ Concurrency: giảm `remainingQty` cần khóa (pessimistic lock / atomic update) tránh oversell — tái dùng Account Lock Pattern nếu phù hợp.

### 2.3. `applyVoucher(userId, code, orderAmount)` — validate & tính giảm giá
- Tìm `UserVoucher` status=`AVAILABLE` của user theo voucher code.
- Validate: chưa hết hạn, `orderAmount >= minOrderAmount`, `applicableType` khớp loại giao dịch.
- Trả về số tiền giảm (`discountAmount`) — chưa đánh dấu USED ở bước apply (đánh dấu `USED` + `usedAt` khi giao dịch thực sự COMPLETED, để Day 3 controller/payment flow xử lý).

**DTO cần tạo:** `RedeemVoucherRequest`, `ApplyVoucherRequest`, `ApplyVoucherResponse` (discountAmount, finalAmount...), `PointBalanceResponse` (nếu chưa có).

---

## 3. REQ-PAY-W2-B-401 — Entity `Loan` + Migration

**Entity `Loan`** (extends BaseEntity theo pattern Voucher):
- `userId` (ManyToOne user), `accountId`, `loanRef` (unique), `amount`, `interestRate`, `termMonths`, `monthlyAmount`, `totalRepayable`, `remainingAmount`, `status` (enum), `adminNote`, `disbursedAt`.
- Enum `LoanStatus`: PENDING / APPROVED / REJECTED / DISBURSED / PAID_OFF (xác nhận lại với SRS).

**Migration `V14__create_loans_and_schedules.sql`** (V11–V13 đã dùng):
- Bảng `loans` + FK user/account.
- Cập nhật `TransactionType` thêm `LOAN_DISBURSEMENT`, `LOAN_REPAYMENT` (mục 0.2).

---

## 4. REQ-PAY-W2-B-402 — Entity `LoanSchedule` + Migration

**Entity `LoanSchedule`:**
- `loanId` (ManyToOne Loan), `periodNumber`, `amountDue`, `dueDate`, `status` (PENDING/PAID/OVERDUE), `paidAt`, `transactionRef`.
- Enum `LoanScheduleStatus`.

**Migration:** gộp chung `V14__create_loans_and_schedules.sql` (loans trước, loan_schedules sau — giữ đúng thứ tự FK).
- Repositories: `LoanRepository`, `LoanScheduleRepository`.

---

## 5. Thứ tự thực hiện đề xuất

1. Sync team → sửa `PaymentCompletedEvent` + `TransactionType` enum (mục 0), merge sớm.
2. `VoucherService` (CRUD + redeem + apply) — dùng lại entity/repo/mapper Day 1, ít phụ thuộc.
3. `LoyaltyService` listener — cần event đã mở rộng ở bước 1.
4. Entity `Loan` + `LoanSchedule` + migration V14 + repositories.
5. `mvn compile` + viết unit test cho logic tính điểm & redeem (rate, idempotency, oversell).

---

## 6. Definition of Done — Day 2

- [ ] `PaymentCompletedEvent` mang `transactionType` + `userId`; publish cập nhật; merge shared.
- [ ] `TransactionType` bổ sung 4 giá trị mới, merge shared.
- [ ] `LoyaltyServiceImpl` tích điểm đúng tỷ lệ, chỉ COMPLETED, idempotent theo transactionRef.
- [ ] `VoucherServiceImpl`: CRUD + redeem (trừ điểm, giảm remainingQty an toàn) + applyVoucher (validate + tính giảm).
- [ ] Entity `Loan` + `LoanSchedule` + migration `V14` + 2 repositories.
- [ ] `mvn compile` pass, MapStruct/JPA validate OK.
- [ ] Unit test cho loyalty rate & voucher redeem pass.
