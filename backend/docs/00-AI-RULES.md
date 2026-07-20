---
tags:
  - training
  - project
  - paygate
  - ai-rules
created: 2026-07-20
---

# AI Rules — PayGate

> File này dành cho AI assistant (Copilot, Cursor, Antigravity...) đọc **đầu tiên** trước khi làm bất cứ task nào trong dự án.
> Mục tiêu: hiểu đúng context, đọc file theo đúng thứ tự, code theo đúng luồng — không đoán mò, không tự sáng tạo kiến trúc.

---

## 1. Thứ tự đọc tài liệu

Đọc theo thứ tự sau **trước khi bắt đầu bất kỳ task nào**:

| Thứ tự | File | Mục đích |
|---|---|---|
| 1 | `Project 3 - PayGate.md` | Bức tranh tổng quan: domain, tech stack, API endpoints tóm tắt, checklist requirement |
| 2 | `01-SRS.md` | Chi tiết yêu cầu chức năng theo từng module, business rules bắt buộc |
| 3 | `02-DATABASE.md` | Schema chính xác của từng bảng (tên cột, kiểu dữ liệu, constraint, index) |
| 4 | `03-ARCHITECTURE.md` | Cấu trúc package, luồng data, payment flow sequence diagram, messaging architecture |
| 5 | `04-API-SPEC.md` | Request/Response schema, validation rules, HTTP status code cho từng endpoint |
| 6 | `05-GIT-WORKFLOW.md` | Branching strategy, commit convention, PR process |
| 7 | `06-PHAN-CONG-CONG-VIEC.md` | Task của ngày hôm nay: REQ code, công việc cụ thể, branch name |

> **Khi nhận task cụ thể** (ví dụ "implement REQ-PAY-B-201"):
> → Xem `06-PHAN-CONG` để biết scope → Xem `01-SRS` để hiểu business rule → Xem `02-DATABASE` để biết schema → Xem `04-API-SPEC` để biết request/response → Xem `03-ARCHITECTURE` để biết đặt file vào đâu.

---

## 2. Tài liệu template kỹ thuật (ngoài thư mục này)

Trước khi viết code BE hoặc FE, phải đọc **bắt buộc**:

| Template | Đường dẫn | Nội dung |
|---|---|---|
| Backend template | `d:\Java\training-starter\backend_code_template.md` | Layered architecture chuẩn, naming convention, cách viết Entity/Service/Controller/Mapper/DTO/Exception |
| Frontend template | `d:\Java\training-starter\frontend_code_template.md` | Angular standalone component, service pattern, interceptor, model type |

> Mọi code sinh ra **phải tuân thủ** hai template này. Không tự sáng tạo pattern khác dù có vẻ "đúng hơn".

---

## 3. Luồng implement một feature Backend (chuẩn)

Làm **đúng thứ tự** dưới đây, không bỏ bước:

```
1. Flyway migration SQL  →  src/main/resources/db/migration/V{n}__{description}.sql
2. Entity class          →  com.training.paygate.entity/{Name}.java
3. Repository interface  →  com.training.paygate.repository/{Name}Repository.java
4. DTO Request           →  com.training.paygate.dto.request/{Name}Request.java
5. DTO Response          →  com.training.paygate.dto.response/{Name}Response.java
6. MapStruct Mapper      →  com.training.paygate.mapper/{Name}Mapper.java
7. Service interface     →  com.training.paygate.service/{Name}Service.java
8. Service impl          →  com.training.paygate.service/impl/{Name}ServiceImpl.java
9. Controller            →  com.training.paygate.controller/{Name}Controller.java
10. Exception (nếu cần) →  com.training.paygate.exception/{Name}Exception.java
```

**Lý do quan trọng của thứ tự này**:
- Migration trước → Entity mới biết cột nào tồn tại trong DB
- Repository trước Service → Service inject repository qua constructor
- DTO + Mapper trước Controller → Controller trả về DTO, không bao giờ trả Entity thô
- Service trước Controller → Controller chỉ gọi service, không chứa logic

---

## 4. Luồng implement một feature Frontend (chuẩn)

```
1. Model/Interface type  →  src/app/core/models/{name}.model.ts
2. Service               →  src/app/features/{module}/{name}.service.ts
3. Component             →  src/app/features/{module}/{name}/
   ├── {name}.component.ts
   ├── {name}.component.html
   └── {name}.component.scss
4. Route                 →  src/app/app.routes.ts  (thêm route + guard)
5. Sidebar/Nav link      →  layout component (thêm link điều hướng)
```

---

## 5. Quy tắc code bắt buộc

### Backend
- **KHÔNG** để business logic trong Controller. Controller chỉ validate DTO + gọi Service + trả ApiResponse.
- **KHÔNG** trả `Entity` trực tiếp từ Controller. Luôn dùng `Mapper` chuyển sang `Response DTO`.
- **KHÔNG** dùng `double` hay `float` cho tiền. Luôn dùng `BigDecimal`, DB dùng `DECIMAL(15,2)`.
- **KHÔNG** gọi webhook trực tiếp từ `TransactionService`. Chỉ publish event lên RabbitMQ, `WebhookConsumer` mới gọi.
- `@Transactional(isolation = Isolation.SERIALIZABLE)` chỉ dùng trong `TransactionService.processPayment()`.
- Lock account theo thứ tự `id` tăng dần (`SELECT ... FOR UPDATE`) để tránh deadlock — xem `02-DATABASE.md` mục 5.
- Exception mapping → HTTP status: xem `04-API-SPEC.md` mục 6.

### Frontend
- Mọi HTTP call đi qua `{Name}Service`, **không** gọi `HttpClient` trực tiếp trong Component.
- Dùng `ApiResponse<T>` và `PageResponse<T>` wrap kết quả — xem `frontend_code_template.md`.
- Route `/admin/**` phải có `AdminGuard`. Route user phải có `AuthGuard`.
- Reactive form với `FormBuilder`, không dùng template-driven form.

---

## 6. Mapping REQ code → vị trí code

Khi nhận một REQ code, tra bảng dưới để biết nên tạo/sửa file nào:

| REQ prefix | Loại | Vị trí chính |
|---|---|---|
| `REQ-PAY-B-1xx` | BE Tuần 1 — Entity, Service, REST cơ bản | `entity/`, `service/`, `controller/`, `db/migration/` |
| `REQ-PAY-B-2xx` | BE Tuần 1 — Transaction, Ledger, Cache, Messaging | `service/TransactionService*`, `messaging/`, `cache/` |
| `REQ-PAY-B-3xx` | BE — Integration test, performance, Swagger | `src/test/`, Swagger annotation trên Controller |
| `REQ-PAY-F-1xx` | FE Tuần 1 — Merchant/Account component cơ bản | `features/merchants/`, `features/accounts/` |
| `REQ-PAY-F-2xx` | FE Tuần 1 — Transaction/Payment component | `features/transactions/` |
| `REQ-PAY-F-3xx` | FE Tuần 1 — Admin UI | `features/admin/` |
| `REQ-PAY-T-xxx` | Test | `src/test/java/...` |
| `REQ-PAY-W-xxx` | Week 3 — E2E, bug fix, perf, demo | Nhiều nơi |

---

## 7. Các business invariant tuyệt đối KHÔNG được vi phạm

Đây là những rule mà nếu code sai sẽ fail test và review:

1. **Double-entry balance**: mỗi transaction tạo đúng **2** `ledger_entries` — 1 DEBIT + 1 CREDIT, cùng `amount`. Tổng DEBIT toàn hệ thống = Tổng CREDIT toàn hệ thống tại mọi thời điểm.
2. **Số dư không âm**: `balance >= 0` tại mọi thời điểm. Kiểm tra trước khi trừ tiền, bên trong transaction SERIALIZABLE.
3. **Idempotency**: nếu `idempotency_key` đã tồn tại trong Redis → trả kết quả giao dịch cũ, **không tạo giao dịch mới**, không trả lỗi.
4. **Lock ordering**: khi xử lý 2 account, luôn lock account có `id` nhỏ hơn trước → tránh deadlock A→B và B→A đồng thời.
5. **Merchant inactive**: merchant có `active = false` không được nhận thanh toán mới.
6. **Refund condition**: chỉ refund được giao dịch có `status = COMPLETED`. Giao dịch FAILED hoặc PENDING → trả 409.

---

## 8. Key-value Redis cần nhớ

| Mục đích | Key pattern | TTL | Ghi khi nào | Đọc khi nào | Invalidate khi nào |
|---|---|---|---|---|---|
| Chống trùng giao dịch | `tx:dedup:{idempotencyKey}` | 24h | Sau khi `processPayment()` commit thành công | Đầu tiên trong `processPayment()` | Không cần xóa, tự expire |
| Cache số dư | `account:balance:{accountId}` | 5 phút | Sau `topUp` | Trong `GET /accounts/{id}/balance` | Ngay sau bất kỳ transaction nào ảnh hưởng account đó |

---

## 9. RabbitMQ — routing key và consumer

| Event | Routing key | Consumer nhận | Việc consumer làm |
|---|---|---|---|
| `PaymentCompletedEvent` | `payment.completed` | `WebhookConsumer` | Gọi `merchant.webhookUrl`, log vào `webhook_logs` |
| `PaymentCompletedEvent` | `payment.completed` | `SettlementConsumer` | (tùy mức triển khai) |
| `PaymentRequestEvent` | `payment.request` | `ValidationConsumer` | (tùy mức triển khai) |

`TransactionService` chỉ **publish**, không tự gọi webhook.

---

## 10. Thứ tự ưu tiên khi bị conflict hoặc không rõ

1. `04-API-SPEC.md` — đây là nguồn chân lý cho contract API (request/response/status code).
2. `02-DATABASE.md` — đây là nguồn chân lý cho tên cột, kiểu dữ liệu, constraint.
3. `01-SRS.md` — đây là nguồn chân lý cho business rule.
4. `backend_code_template.md` — đây là nguồn chân lý cho cách viết code.
5. Nếu vẫn không rõ → ghi vào mục **Blockers/Questions** của daily report, không tự suy diễn.

---

## 11. Checklist trước khi tạo PR

- [ ] Entity field name khớp chính xác với tên cột trong SQL migration (`02-DATABASE.md`)
- [ ] Không có business logic trong Controller
- [ ] Mọi endpoint trả `ApiResponse<T>` hoặc `ApiResponse<PageResponse<T>>`
- [ ] `@Transactional` đặt đúng chỗ (Service, không phải Controller hay Repository)
- [ ] Có `@Operation(summary = ...)` trên mọi method Controller (Swagger)
- [ ] Có unit test cho Service (ít nhất test happy path + 1 error case)
- [ ] Commit message theo Conventional Commits: `feat(merchant): add Merchant entity and V2 migration`
- [ ] Branch name đúng format: `feature/pay-b-101-merchant-entity`
