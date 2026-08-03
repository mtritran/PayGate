---
tags:
  - training
  - project
  - paygate
  - srs
created: 2026-07-20
---

# Software Requirements Specification (SRS) — PayGate

**Dự án**: Project 3 — PayGate (Payment Gateway Simulator)
**Team**: 3 (2 thành viên)
**Prefix mã yêu cầu**: PAY
**Repo**: https://github.com/TuanHoAnh/PayGate

---

## 1. Giới thiệu

### 1.1. Mục đích
Tài liệu này mô tả các yêu cầu chức năng và phi chức năng của hệ thống **PayGate** — một hệ thống mô phỏng cổng thanh toán (payment gateway) có sổ cái ghi kép (double-entry ledger), dùng làm bài tập đào tạo xây dựng hệ thống backend/frontend theo kiến trúc layered (Spring Boot) + Angular.

### 1.2. Phạm vi
Hệ thống cho phép:
- Quản lý merchant (đơn vị chấp nhận thanh toán).
- Quản lý tài khoản ví (account) của user/merchant/system.
- Xử lý giao dịch thanh toán, hoàn tiền với đảm bảo tính toàn vẹn qua sổ cái ghi kép.
- Gửi webhook thông báo kết quả giao dịch tới merchant.
- Chống trùng lặp giao dịch bằng idempotency key.
- Xử lý bất đồng bộ qua RabbitMQ, cache qua Redis.

### 1.3. Đối tượng sử dụng
| Vai trò | Mô tả |
|---|---|
| USER | Người dùng cuối, sở hữu tài khoản ví, thực hiện thanh toán, top-up |
| MERCHANT (qua ADMIN) | Đơn vị nhận thanh toán, được đăng ký/quản lý bởi ADMIN |
| ADMIN | Quản trị viên hệ thống — quản lý merchant, xác minh sổ cái, thực hiện refund |

### 1.4. Định nghĩa & thuật ngữ
| Thuật ngữ | Ý nghĩa |
|---|---|
| Ledger (sổ cái) | Bảng ghi nhận từng bút toán DEBIT/CREDIT cho mỗi giao dịch |
| Double-entry | Nguyên tắc kế toán ghi kép: mỗi giao dịch tạo 2 bút toán cân bằng |
| Idempotency key | Khóa duy nhất do client gửi kèm để đảm bảo 1 request chỉ xử lý 1 lần |
| Webhook | Cơ chế hệ thống chủ động gọi HTTP tới merchant khi có sự kiện |
| Transaction ref | Mã tham chiếu duy nhất định danh 1 giao dịch |

---

## 2. Mô tả tổng quan hệ thống

### 2.1. Bối cảnh nghiệp vụ
PayGate mô phỏng luồng thanh toán giữa người dùng (chủ ví) và merchant, tương tự các cổng thanh toán thực tế (MoMo, VNPay...). Mỗi giao dịch tiền phải luôn được ghi nhận đối xứng: tiền giảm ở tài khoản nguồn (DEBIT) và tăng ở tài khoản đích (CREDIT) với tổng DEBIT = tổng CREDIT toàn hệ thống tại mọi thời điểm.

### 2.2. Chức năng chính
1. Merchant Management (CRUD, do ADMIN quản lý)
2. Account Management (tạo tự động khi đăng ký, top-up, xem số dư/lịch sử)
3. Payment Transaction Processing (tạo thanh toán, truy vấn, refund)
4. Double-entry Ledger (ghi và xác minh sổ cái)
5. Webhook Notification (gửi + retry + log)
6. Idempotency (chống trùng lặp thanh toán)

### 2.3. Giả định & ràng buộc
- Kế thừa module `users` (đăng ký/đăng nhập/JWT) từ dự án starter.
- Đơn vị tiền tệ mặc định: VND.
- Không tích hợp cổng thanh toán thật (chỉ mô phỏng nội bộ).
- Toàn bộ số tiền dùng kiểu `BigDecimal/DECIMAL(15,2)` — không dùng số thực (double/float).

---

## 3. Yêu cầu chức năng (Functional Requirements)

Định dạng mã: `REQ-PAY-{B|F|T|W}-{tuần}{số thứ tự}` (B=Backend, F=Frontend, T=Testing, W=Week4 tổng hợp).

### 3.1. Module Merchant
| Mã | Mô tả | Actor |
|---|---|---|
| REQ-PAY-B-101 | Tạo entity `Merchant` (id, userId, merchantName, merchantCode, apiKey, webhookUrl, active) + Flyway V2 | Dev |
| REQ-PAY-B-103 | `MerchantService`: CRUD, tự sinh `apiKey` khi tạo, dùng MapStruct | Dev |
| REQ-PAY-B-105 | REST: `POST/GET/PUT /api/v1/admin/merchants` | ADMIN |
| REQ-PAY-F-101/102 | UI danh sách + form tạo/sửa merchant | ADMIN |

**Quy tắc nghiệp vụ**:
- `merchant_code` và `api_key` là duy nhất toàn hệ thống.
- Một `user` chỉ được gắn với tối đa một `merchant` (`user_id UNIQUE`).
- Merchant bị `active = false` không được nhận giao dịch thanh toán mới.

### 3.2. Module Account
| Mã | Mô tả | Actor |
|---|---|---|
| REQ-PAY-B-102 | Entity `Account` (ownerId, ownerType, accountNumber, balance, currency, status, version) + Flyway V3 | Dev |
| REQ-PAY-B-104 | `AccountService`: createAccount (tự động khi user đăng ký), getBalance, topUp | Dev |
| REQ-PAY-B-106 | REST: `GET /accounts/me`, `GET /accounts/{id}/balance`, `POST /accounts/topup` | USER |
| REQ-PAY-B-209 | REST: `GET /accounts/{id}/history` (phân trang) | USER |
| REQ-PAY-F-103/104 | Dashboard hiển thị số dư + số tài khoản; routing | USER |

**Quy tắc nghiệp vụ**:
- Mỗi user tự động có 1 account loại `USER` khi đăng ký thành công.
- Mỗi merchant tự động có 1 account loại `MERCHANT` khi được ADMIN tạo.
- Số dư không được âm (`balance >= 0`) tại mọi thời điểm — kiểm soát bằng validation + lock.
- `version` dùng cho optimistic/pessimistic locking khi cập nhật song song.

### 3.3. Module Transaction & Ledger
| Mã | Mô tả | Actor |
|---|---|---|
| REQ-PAY-B-201 | `processPayment()`: SERIALIZABLE isolation, khóa account theo thứ tự id, kiểm tra idempotency, kiểm tra số dư, cập nhật số dư, tạo transaction + 2 ledger entries, publish event | Dev |
| REQ-PAY-B-202 | REST: `POST /transactions/pay`, `GET /transactions/{ref}`, `GET /transactions` | USER |
| REQ-PAY-B-203 | REST refund: `POST /transactions/{ref}/refund` — tạo bút toán đảo ngược, chỉ áp dụng cho giao dịch `COMPLETED` | ADMIN |
| REQ-PAY-B-204 | REST ledger: `GET /admin/ledger/verify`, `GET /admin/ledger/account/{id}` | ADMIN |
| REQ-PAY-F-201/202/203 | Form thanh toán (có xác nhận), danh sách giao dịch, chi tiết giao dịch kèm ledger | USER |
| REQ-PAY-F-301 | UI xác minh sổ cái (tổng debit/credit, trạng thái cân bằng) | ADMIN |

**Quy tắc nghiệp vụ**:
- Mỗi giao dịch thành công tạo đúng **2** bản ghi `ledger_entries`: 1 DEBIT + 1 CREDIT, cùng `amount`, khác `account_id`.
- Luồng trạng thái transaction: `PENDING → PROCESSING → COMPLETED | FAILED`, hoặc `PENDING → EXPIRED` (timeout).
- Khi xử lý 2 tài khoản đồng thời (A→B), luôn khóa theo thứ tự `id` tăng dần để tránh deadlock.
- Idempotency: nếu `idempotency_key` đã tồn tại → trả về kết quả giao dịch cũ, không tạo giao dịch mới.
- `GET /admin/ledger/verify` phải trả về đúng: tổng DEBIT toàn hệ thống = tổng CREDIT toàn hệ thống.

### 3.4. Module Webhook & Idempotency (hạ tầng)
| Mã | Mô tả |
|---|---|
| REQ-PAY-B-205 | Idempotency cache Redis `tx:dedup:{key}` → transactionRef, TTL 24h |
| REQ-PAY-B-206 | Balance cache Redis `account:balance:{id}`, TTL 5 phút, invalidate khi có giao dịch |
| REQ-PAY-B-207 | Khai báo RabbitMQ: `payment.exchange` (topic) + 4 queue (validate, settlement, webhook, notification) + `PaymentEventPublisher` |
| REQ-PAY-B-208 | `WebhookConsumer`: gọi `webhook_url` của merchant với payload giao dịch, log vào `webhook_logs` |
| REQ-PAY-B-304 | Retry webhook exponential backoff: 5 lần (immediate, 1p, 5p, 30p, 2h); thất bại lần 5 → `FAILED` + alert |
| REQ-PAY-F-302 | UI xem log webhook (status, số lần thử, response) | ADMIN |

### 3.5. Dashboard tổng hợp
| Mã | Mô tả |
|---|---|
| REQ-PAY-F-303 | `AdminDashboardComponent`: tổng số giao dịch, tổng volume, số giao dịch thất bại |

---

## 4. Yêu cầu phi chức năng (Non-Functional Requirements)

| Nhóm | Yêu cầu |
|---|---|
| Toàn vẹn dữ liệu | Isolation `SERIALIZABLE` cho luồng thanh toán; double-entry luôn cân bằng |
| Hiệu năng | `ab -n 1000 -c 50` → avg response < 200ms, error rate < 1% (REQ-PAY-W-404) |
| Bảo mật | JWT auth cho USER/ADMIN; `api_key` merchant không lộ ra ngoài log; validate input chặt ở DTO |
| Khả năng mở rộng | Xử lý bất đồng bộ qua RabbitMQ cho settlement/webhook, tách khỏi luồng đồng bộ trả response |
| Độ tin cậy | Webhook retry 5 lần với backoff; idempotency chống trùng do client retry |
| Khả năng kiểm thử | ≥ 5 integration test (Testcontainers), test concurrency (10 luồng), test deadlock prevention |
| Khả năng quan sát | Swagger/OpenAPI đầy đủ cho toàn bộ controller; `EXPLAIN ANALYZE` xác minh index |
| Khả năng bảo trì | Tuân thủ layered architecture chuẩn theo `backend_code_template.md` / `frontend_code_template.md` |

---

## 5. Lộ trình theo tuần (tóm tắt)
| Tuần | Trọng tâm |
|---|---|
| Tuần 1 | Nền tảng: entity Merchant/Account, CRUD, migration V2-V7, UI danh sách/form cơ bản |
| Tuần 2 | Lõi nghiệp vụ: xử lý thanh toán, ledger, idempotency, cache, RabbitMQ, webhook, UI thanh toán |
| Tuần 3 | Kiểm thử sâu (concurrency, idempotency, deadlock, performance index) + Admin UI + End-to-end + Cross-review team khác + Fix bug + Performance test + README + Demo |

Chi tiết đầy đủ từng checklist requirement xem file gốc `Project 3 - PayGate.md`.

---

## 6. Tiêu chí nghiệm thu (Definition of Done) tổng quát
- Toàn bộ endpoint có Swagger annotation và hoạt động đúng qua Postman/Swagger UI.
- Unit test + integration test đạt yêu cầu tối thiểu theo từng tuần, pass CI.
- `GET /admin/ledger/verify` luôn trả `balanced = true` sau mọi thao tác thanh toán/refund.
- Test concurrency 10 luồng cùng trừ tiền 1 tài khoản không cho phép số dư âm.
- README có hướng dẫn cài đặt, kiến trúc, API docs.
- End-to-end flow hoàn chỉnh hoạt động và sẵn sàng demo cuối tuần 3 (09/08/2026).
- Cross-review ≥ 10 comment cho team khác và performance test `ab -n 1000 -c 50` pass trước demo.
