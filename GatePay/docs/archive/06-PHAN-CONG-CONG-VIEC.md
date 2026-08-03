---
tags:
  - training
  - project
  - paygate
  - phan-cong
created: 2026-07-20
updated: 2026-07-20
---

# Bảng phân công công việc — PayGate (21/07/2026 – 09/08/2026)

**Nguyên tắc phân chia**: mỗi người phụ trách trọn vẹn cả Backend + Frontend cho nhóm tính năng của mình.
- **Trí**: Merchant + Webhook/Messaging + Admin UI (Ledger, Webhook Log, Dashboard)
- **Vinh**: Account + Transaction/Payment + Idempotency/Cache + User UI

> **Lịch rút gọn**: toàn bộ implementation dồn vào **Tuần 1** (6 ngày làm liên tục). Tuần 2 = testing sâu. Tuần 3 = fix bug + end-to-end + demo.
> Nhánh git: `feature/pay-<mã-req-lowercase>-<mô-tả>` — PR review chéo Trí ↔ Vinh trước khi merge `develop`.

---

## TUẦN 1: 21/07 – 26/07/2026 — Full Implementation (BE + FE)

---

### Ngày 1 — Thứ Hai 21/07/2026

| Người | REQ | Công việc | Branch |
|---|---|---|---|
| **Trí** | REQ-PAY-B-101 | Entity `Merchant` (id, userId, merchantName, merchantCode, apiKey, webhookUrl, active) + `V2__create_merchants.sql` | `feature/pay-b-101-merchant-entity` |
| **Trí** | REQ-PAY-B-103 | `MerchantService` CRUD, tự sinh `apiKey` (UUID), `MerchantMapper` MapStruct | (trong branch B-101) |
| **Vinh** | REQ-PAY-B-102 | Entity `Account` (ownerId, ownerType, accountNumber, balance, currency, status, version) + `V3__create_accounts.sql` | `feature/pay-b-102-account-entity` |
| **Vinh** | REQ-PAY-B-107 | Flyway `V4__create_transactions.sql`, `V5__create_ledger_entries.sql`, `V6__create_webhook_logs.sql`, `V7__create_indexes.sql` | (trong branch B-102) |
| **Vinh** | REQ-PAY-B-104 | `AccountService`: `createAccount()`, `getBalance()`, `topUp()`, `AccountMapper` MapStruct | (trong branch B-102) |

> 🔔 **Cuối ngày 1**: Trí + Vinh sync và thống nhất `PaymentCompletedEvent` interface (fields: transactionRef, merchantId, webhookUrl, amount, status) trước khi tách nhánh ngày 2.

---

### Ngày 2 — Thứ Ba 22/07/2026

| Người | REQ | Công việc | Branch |
|---|---|---|---|
| **Trí** | REQ-PAY-B-105 | `MerchantController`: `POST /api/v1/admin/merchants`, `GET /api/v1/admin/merchants` (phân trang), `PUT /api/v1/admin/merchants/{id}` + Swagger `@Operation` | `feature/pay-b-105-merchant-rest` |
| **Trí** | REQ-PAY-B-207 | `RabbitMQConfig`: khai báo `payment.exchange` (topic) + 4 queue + binding. `PaymentEventPublisher` publish `PaymentCompletedEvent` với routing key `payment.completed` | `feature/pay-b-207-rabbitmq-setup` |
| **Vinh** | REQ-PAY-B-106 | `AccountController`: `GET /api/v1/accounts/me`, `GET /api/v1/accounts/{id}/balance`, `POST /api/v1/accounts/topup` + Swagger `@Operation` | `feature/pay-b-106-account-rest` |
| **Vinh** | REQ-PAY-B-201 *(phần 1)* | `TransactionService.processPayment()`: `@Transactional(SERIALIZABLE)`, kiểm tra idempotency Redis trước, `SELECT ... FOR UPDATE` 2 account theo thứ tự id tăng dần, validate balance, update balance | `feature/pay-b-201-process-payment` |

---

### Ngày 3 — Thứ Tư 23/07/2026

| Người | REQ | Công việc | Branch |
|---|---|---|---|
| **Trí** | REQ-PAY-B-204 | `LedgerController`: `GET /api/v1/admin/ledger/verify`, `GET /api/v1/admin/ledger/account/{id}`. `LedgerService` + `LedgerRepository` query tổng DEBIT/CREDIT | `feature/pay-b-204-ledger-rest` |
| **Trí** | REQ-PAY-B-208 | `WebhookConsumer`: lắng nghe `webhook.queue`, HTTP POST tới `merchant.webhookUrl`, log kết quả vào `webhook_logs` (attempt, status, responseStatus, responseBody) | `feature/pay-b-208-webhook-consumer` |
| **Vinh** | REQ-PAY-B-201 *(phần 2)* | Tiếp `processPayment()`: tạo `Transaction` (status=COMPLETED), tạo 2 `LedgerEntry` (1 DEBIT + 1 CREDIT cùng amount), ghi `balance_after`, publish `PaymentCompletedEvent` lên RabbitMQ | (tiếp branch B-201) |
| **Vinh** | REQ-PAY-B-205 | `IdempotencyCacheService`: check Redis `tx:dedup:{key}` trước DB, set `transactionRef` sau commit, TTL 24h | (trong branch B-201) |
| **Vinh** | REQ-PAY-B-206 | `BalanceCacheService`: cache `account:balance:{id}` TTL 5 phút, invalidate ngay sau transaction | `feature/pay-b-206-balance-cache` |

---

### Ngày 4 — Thứ Năm 24/07/2026

| Người | REQ | Công việc | Branch |
|---|---|---|---|
| **Trí** | REQ-PAY-B-304 | `WebhookConsumer` retry exponential backoff: immediate → 1min → 5min → 30min → 2h (5 lần max). Lần 5 thất bại → mark `FAILED`. | (tiếp branch B-208) |
| **Trí** | REQ-PAY-B-306 | `@Tag`, `@Operation(summary=...)`, `@ApiResponse` đầy đủ cho toàn bộ 4 controller. Verify Swagger UI `/swagger-ui.html` | `feature/pay-b-306-swagger-full` |
| **Vinh** | REQ-PAY-B-202 | `TransactionController`: `POST /api/v1/transactions/pay`, `GET /api/v1/transactions/{ref}` (kèm ledgerEntries), `GET /api/v1/transactions` (phân trang, filter) + Swagger | `feature/pay-b-202-transaction-rest` |
| **Vinh** | REQ-PAY-B-203 | Refund: `POST /api/v1/transactions/{ref}/refund` — validate COMPLETED, tạo Transaction REFUND, 2 LedgerEntry đảo ngược, cập nhật balance 2 account | `feature/pay-b-203-refund` |
| **Vinh** | REQ-PAY-B-209 | `GET /api/v1/accounts/{id}/history` phân trang, sort createdAt DESC | `feature/pay-b-209-account-history` |

---

### Ngày 5 — Thứ Sáu 25/07/2026

| Người | REQ | Công việc | Branch |
|---|---|---|---|
| **Trí** | REQ-PAY-F-101 | `MerchantListComponent`: bảng merchant (Name, Code, Status, Webhook URL), phân trang, gọi `GET /admin/merchants` | `feature/pay-f-101-merchant-list` |
| **Trí** | REQ-PAY-F-102 | `MerchantFormComponent`: reactive form create/edit, validate required fields, gọi `POST/PUT /admin/merchants` | (trong branch F-101) |
| **Trí** | REQ-PAY-F-104 | Route `/admin/merchants`, sidebar link, `AdminGuard` | (trong branch F-101) |
| **Trí** | REQ-PAY-F-301 | `AdminLedgerComponent`: gọi `GET /admin/ledger/verify`, hiển thị totalDebit, totalCredit, badge `balanced` | `feature/pay-f-301-admin-ledger` |
| **Vinh** | REQ-PAY-F-103 | `AccountDashboardComponent`: số dư + số tài khoản, gọi `GET /accounts/me` | `feature/pay-f-103-account-dashboard` |
| **Vinh** | REQ-PAY-F-104 | Route `/accounts/dashboard`, `/accounts/topup`, `AuthGuard` | (trong branch F-103) |
| **Vinh** | REQ-PAY-F-201 | `PaymentFormComponent`: form thanh toán (destAccountId, amount, description, idempotencyKey auto UUID), dialog xác nhận | `feature/pay-f-201-payment-form` |
| **Vinh** | REQ-PAY-F-202 | `TransactionListComponent`: danh sách (Ref, Date, Type, Amount, Status), phân trang | (trong branch F-201) |

---

### Ngày 6 — Thứ Bảy 26/07/2026 — Hoàn thiện FE + Unit Test + Wrap-up

| Người | REQ | Công việc | Branch |
|---|---|---|---|
| **Trí** | REQ-PAY-F-302 | `WebhookLogComponent`: danh sách log webhook (URL, Status, Attempt, ResponseStatus), filter status | `feature/pay-f-302-webhook-log` |
| **Trí** | REQ-PAY-F-303 | `AdminDashboardComponent`: summary cards tổng giao dịch, total volume, số FAILED | `feature/pay-f-303-admin-dashboard` |
| **Trí** | REQ-PAY-T-101 | Unit test `MerchantService`: create valid, create duplicate code → 409, getById found, getById not found. **≥4 test** | `feature/pay-t-101-merchant-test` |
| **Vinh** | REQ-PAY-F-203 | `TransactionDetailComponent`: chi tiết giao dịch + 2 LedgerEntry (DEBIT/CREDIT) | (trong branch F-201) |
| **Vinh** | REQ-PAY-F-204 | `TopUpComponent`: form nạp tiền, gọi `POST /accounts/topup`, hiển thị số dư mới | (trong branch F-201) |
| **Vinh** | REQ-PAY-T-102 | Unit test `AccountService`: createAccount, getBalance (cache hit/miss), topUp valid. **≥3 test** | `feature/pay-t-102-account-test` |
| **Vinh** | REQ-PAY-T-201 | Unit test `processPayment()`: success, insufficient balance → exception, duplicate idempotencyKey → trả cũ. **≥3 test** | `feature/pay-t-201-payment-test` |
| **Cả 2** | REQ-PAY-T-103 | Verify Swagger UI hiển thị đúng tất cả endpoint. Smoke test thủ công: topup → pay → check ledger verify. |
| **Cả 2** | — | PR review chéo, merge `develop → main`, gắn tag `v0.1-week1` |

---

## TUẦN 2: 27/07 – 02/08/2026 — Testing Sâu

---

### Ngày 7 — Thứ Hai 27/07/2026

| Người | REQ | Công việc | Branch |
|---|---|---|---|
| **Vinh** | REQ-PAY-B-301 | Integration test (Testcontainers setup + PostgreSQL container): full payment flow — register → topup → pay → verify balances + 2 ledger entries | `feature/pay-b-301-integration-test` |
| **Trí** | REQ-PAY-T-202 | Unit test ledger: DEBIT sum = CREDIT sum sau 1 giao dịch, sau nhiều giao dịch. **≥2 test** | `feature/pay-t-202-ledger-test` |
| **Trí** | — | Bắt đầu đọc code Vinh, chuẩn bị test case cho concurrent (ngày 8) |

---

### Ngày 8 — Thứ Ba 28/07/2026

| Người | REQ | Công việc | Branch |
|---|---|---|---|
| **Vinh** | REQ-PAY-B-302 | Concurrent payment test: 10 thread cùng trừ tiền 1 account (balance=1000, mỗi lần 100). Verify: balance cuối = 0, không transaction nào tạo số dư âm | `feature/pay-b-302-concurrent-test` |
| **Vinh** | REQ-PAY-B-303 | Idempotency test: gửi cùng `PaymentRequest` 2 lần với cùng `idempotencyKey`. Verify: chỉ 1 `Transaction` được tạo, response lần 2 = response lần 1 | `feature/pay-b-303-idempotency-test` |
| **Trí** | REQ-PAY-T-301 *(merchant/webhook)* | Integration test: tạo merchant → tạo account merchant → topup user → pay → verify `webhook_logs` có entry | `feature/pay-t-301-merchant-webhook` |

---

### Ngày 9 — Thứ Tư 29/07/2026

| Người | REQ | Công việc | Branch |
|---|---|---|---|
| **Vinh** | REQ-PAY-T-301 *(transaction/refund)* | Integration test (Testcontainers): topup → payment → verify ledger → refund → verify ledger reverse → balance restored. **≥3 test** trong batch này | (trong branch B-301) |
| **Vinh** | REQ-PAY-T-302 | Concurrent locking test: 15 thread cùng trừ tiền, verify không lần nào balance âm và `version` increment đúng | (trong branch B-302) |
| **Trí** | REQ-PAY-B-305 | `EXPLAIN ANALYZE` các query: transaction by ref, ledger by transaction_id, webhook_logs pending. Xác minh partial index hoạt động. Ghi kết quả vào `docs/index-analysis.md`. | — |

---

### Ngày 10 — Thứ Năm 30/07/2026

| Người | REQ | Công việc | Branch |
|---|---|---|---|
| **Cả 2** | REQ-PAY-T-303 | Deadlock prevention test: Thread A (A→B) và Thread B (B→A) chạy đồng thời. Verify cả 2 thành công nhờ lock theo thứ tự id. | `feature/pay-t-303-deadlock-test` |
| **Cả 2** | — | Review tất cả test đã viết, đảm bảo ≥5 integration test pass với Testcontainers. Fix flaky test nếu có. |

---

### Ngày 11 — Thứ Sáu 31/07/2026

| Người | REQ | Công việc |
|---|---|---|
| **Cả 2** | REQ-PAY-W-404 | Performance test: `ab -n 1000 -c 50 http://localhost:8080/api/v1/accounts/me`. Mục tiêu avg < 200ms, error rate < 1%. Ghi kết quả. |
| **Cả 2** | — | Nếu performance test fail: phân tích bottleneck (N+1 query? Cache miss? Connection pool?), fix và test lại |

---

### Ngày 12 — Thứ Bảy 01/08/2026

| Người | Công việc |
|---|---|
| **Cả 2** | Buffer: fix các issue phát sinh từ tuần test. Bổ sung test case còn thiếu. |
| **Cả 2** | PR review, merge `develop → main`, gắn tag `v0.2-week2` |

---

## TUẦN 3: 03/08 – 09/08/2026 — Fix Bug + End-to-end + Demo

---

### Ngày 13 — Thứ Hai 03/08/2026

| Người | REQ | Công việc |
|---|---|---|
| **Cả 2** | REQ-PAY-W-401 | End-to-end smoke test đầy đủ: register → topup → pay → kiểm tra ledger verify = balanced → kiểm tra webhook_log |
| **Cả 2** | REQ-PAY-W-403 | Bắt đầu fix bug từ mentor-created GitHub Issues. Mỗi bug → branch `bugfix/pay-w-403-issue-<N>` + PR riêng. |

---

### Ngày 14 — Thứ Ba 04/08/2026

| Người | REQ | Công việc |
|---|---|---|
| **Cả 2** | REQ-PAY-W-403 | Tiếp tục fix bug. Đảm bảo ≥5 PR bug fix đã được merge. |
| **Cả 2** | REQ-PAY-W-402 | Cross-review repo Team 4 (StockPulse): đọc code, để lại **≥10 comment** xây dựng. Ghi vào `docs/cross-review-notes.md`. |

---

### Ngày 15 — Thứ Tư 05/08/2026

| Người | REQ | Công việc |
|---|---|---|
| **Cả 2** | REQ-PAY-W-403 | Fix tiếp bug còn lại. Chạy lại full test suite sau khi fix. |
| **Cả 2** | REQ-PAY-W-405 | Bắt đầu `README.md`: hướng dẫn cài đặt (Docker Compose), env vars, kiến trúc tổng quan |

---

### Ngày 16 — Thứ Năm 06/08/2026

| Người | REQ | Công việc |
|---|---|---|
| **Cả 2** | REQ-PAY-W-405 | Hoàn thiện README: link Swagger UI, mô tả API docs, architecture diagram, luồng thanh toán |
| **Cả 2** | — | Final regression: chạy toàn bộ test suite, verify ledger balanced, webhook retry log |

---

### Ngày 17 — Thứ Sáu 07/08/2026

| Người | REQ | Công việc |
|---|---|---|
| **Cả 2** | REQ-PAY-W-406 | Chuẩn bị slide/script demo 15-20 phút: kiến trúc → live demo luồng thanh toán → ledger verify → webhook retry → performance test results |
| **Cả 2** | — | Rehearsal demo nội bộ, fix last-minute issue |

---

### Ngày 18 — Thứ Bảy 08/08/2026

| Người | Công việc |
|---|---|
| **Cả 2** | Buffer cuối: fix issue phát sinh khi rehearsal |
| **Cả 2** | PR review cuối, merge `develop → main`, gắn tag `v1.0-final` |

---

### Ngày 19 — Chủ Nhật 09/08/2026 — DEMO DAY 🎯

| Người | REQ | Công việc |
|---|---|---|
| **Cả 2** | REQ-PAY-W-406 | **Demo** trước mentor: 15-20 phút — kiến trúc, live demo, Q&A |

---

## Ghi chú chung

- **Daily report**: cuối mỗi ngày, từng người fill report (What I did / What I learned / Blockers / Plan for tomorrow / Code references).
- **Tuần 1 làm dày**: mỗi ngày commit ít nhất 2-3 feature, không để task tràn sang tuần 2.
- **Sync bắt buộc cuối ngày 21/07**: thống nhất `PaymentCompletedEvent` interface.
- **Tag mốc**: `v0.1-week1` (26/07) → `v0.2-week2` (01/08) → `v1.0-final` (08/08).
- **Ưu tiên khi bị trễ tuần 1**: BE trước, FE sau; Unit test viết song song với service, không để dồn cuối.
