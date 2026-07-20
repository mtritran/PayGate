---
tags:
  - training
  - project
  - paygate
  - api-spec
created: 2026-07-20
---

# API Specification — PayGate

Base URL: `/api/v1`
Auth: `Authorization: Bearer <JWT>` (trừ endpoint đăng ký/đăng nhập kế thừa từ starter)
Định dạng response chuẩn: `ApiResponse<T>` / `ApiResponse<PageResponse<T>>` (theo `common/ApiResponse.java`, `common/PageResponse.java`)

```json
// ApiResponse<T> mẫu thành công
{
  "success": true,
  "message": "OK",
  "data": { }
}
// ApiResponse mẫu lỗi
{
  "success": false,
  "message": "Insufficient balance",
  "data": null
}
```

---

## 1. Accounts

### 1.1. `GET /accounts/me`
- **Auth**: USER
- **Mô tả**: Lấy thông tin tài khoản ví + số dư của user hiện tại (theo JWT).
- **Response 200**:
```json
{
  "success": true,
  "data": {
    "id": 12,
    "ownerId": 5,
    "ownerType": "USER",
    "accountNumber": "AC00000012",
    "balance": 1500000.00,
    "currency": "VND",
    "status": "ACTIVE"
  }
}
```

### 1.2. `GET /accounts/{id}/balance`
- **Auth**: USER (chỉ chủ sở hữu) / ADMIN
- **Mô tả**: Lấy số dư (ưu tiên đọc từ cache Redis `account:balance:{id}`, TTL 5 phút).
- **Response 200**: `{ "success": true, "data": { "accountId": 12, "balance": 1500000.00, "currency": "VND" } }`
- **Lỗi**: `404` nếu account không tồn tại; `403` nếu không phải chủ sở hữu/ADMIN.

### 1.3. `POST /accounts/topup`
- **Auth**: USER
- **Request Body**:
```json
{ "amount": 500000.00, "description": "Top up qua thẻ demo" }
```
- **Validation**: `amount` bắt buộc, `> 0`.
- **Response 201**: trả về `TransactionResponse` (type=`TOPUP`, status=`COMPLETED`).
- **Lỗi**: `400` nếu amount không hợp lệ.

### 1.4. `GET /accounts/{id}/history`
- **Auth**: USER (chủ sở hữu) / ADMIN
- **Query params**: `page` (default 0), `size` (default 20), `sortBy` (default `createdAt`), `sortDir` (default `DESC`)
- **Response 200**: `ApiResponse<PageResponse<TransactionResponse>>`

---

## 2. Merchants (Admin)

### 2.1. `POST /admin/merchants`
- **Auth**: ADMIN
- **Request Body**:
```json
{
  "userId": 20,
  "merchantName": "Shop ABC",
  "merchantCode": "SHOPABC",
  "webhookUrl": "https://shopabc.example.com/webhook/paygate"
}
```
- **Validation**: `userId`, `merchantName`, `merchantCode` bắt buộc; `merchantCode` unique; `webhookUrl` optional nhưng nếu có phải đúng định dạng URL.
- **Xử lý**: hệ thống tự sinh `apiKey`; tự động tạo `Account` loại `MERCHANT` cho merchant này.
- **Response 201**: `MerchantResponse` (không lộ `apiKey` đầy đủ, có thể mask một phần).
- **Lỗi**: `409` nếu `merchantCode` hoặc `userId` đã tồn tại merchant.

### 2.2. `GET /admin/merchants`
- **Auth**: ADMIN
- **Query params**: `page`, `size`, `sortBy`, `sortDir`
- **Response 200**: `ApiResponse<PageResponse<MerchantResponse>>`

### 2.3. `PUT /admin/merchants/{id}`
- **Auth**: ADMIN
- **Request Body**: `{ "merchantName": "...", "webhookUrl": "...", "active": true }`
- **Response 200**: `MerchantResponse` cập nhật.
- **Lỗi**: `404` nếu không tồn tại.

---

## 3. Transactions

### 3.1. `POST /transactions/pay`
- **Auth**: USER
- **Header bắt buộc / body field**: `Idempotency-Key` (khuyến nghị truyền qua header `Idempotency-Key`, hoặc field `idempotencyKey` trong body — team tự thống nhất, tài liệu này mô tả theo body để đơn giản hoá validate bằng `@NotBlank`).
- **Request Body**:
```json
{
  "idempotencyKey": "b3f1c2b0-6b23-4a2a-9f2e-1e2b3c4d5e6f",
  "destAccountId": 45,
  "amount": 250000.00,
  "description": "Thanh toán đơn hàng #1023",
  "merchantId": 3
}
```
- **Validation**: `idempotencyKey` `@NotBlank`; `destAccountId` `@NotNull`; `amount` `@Positive`.
- **Luồng xử lý** (tóm tắt, chi tiết ở `03-ARCHITECTURE.md`):
  1. Kiểm tra `tx:dedup:{idempotencyKey}` trong Redis → nếu có, trả kết quả cũ.
  2. Mở transaction `SERIALIZABLE`, khóa 2 account theo thứ tự `id`.
  3. Kiểm tra số dư nguồn đủ, cập nhật 2 balance, tạo `Transaction` + 2 `LedgerEntry`.
  4. Publish `PaymentCompletedEvent` lên `payment.exchange`.
- **Response 201**:
```json
{
  "success": true,
  "message": "Payment processed successfully",
  "data": {
    "transactionRef": "TXN-20260720-000123",
    "status": "COMPLETED",
    "amount": 250000.00,
    "sourceAccountId": 12,
    "destAccountId": 45,
    "type": "PAYMENT",
    "createdAt": "2026-07-20T10:15:00"
  }
}
```
- **Lỗi**:
  - `400` — request không hợp lệ.
  - `402/422` — `InsufficientBalanceException` (số dư không đủ).
  - `200` (idempotent replay) — nếu `idempotencyKey` trùng, trả lại transaction đã xử lý trước đó thay vì lỗi.

### 3.2. `GET /transactions/{ref}`
- **Auth**: USER (chủ sở hữu 1 trong 2 account liên quan) / ADMIN
- **Response 200**: `TransactionResponse` kèm danh sách `ledgerEntries` (2 dòng).
- **Lỗi**: `404` nếu `transaction_ref` không tồn tại.

### 3.3. `GET /transactions`
- **Auth**: USER (chỉ giao dịch liên quan tới account của mình)
- **Query params**: `page`, `size`, `sortBy` (default `createdAt`), `sortDir` (default `DESC`), có thể mở rộng filter `status`, `type`.
- **Response 200**: `ApiResponse<PageResponse<TransactionResponse>>`

### 3.4. `POST /transactions/{ref}/refund`
- **Auth**: ADMIN
- **Điều kiện**: transaction gốc phải có `status = COMPLETED`.
- **Xử lý**: tạo transaction mới `type = REFUND` với `source/dest` đảo ngược so với giao dịch gốc, tạo 2 `LedgerEntry` đảo ngược, cập nhật lại số dư 2 account.
- **Response 201**: `TransactionResponse` của giao dịch refund.
- **Lỗi**: `409` (`InvalidTransactionStateException`) nếu giao dịch gốc chưa `COMPLETED` hoặc đã refund rồi.

---

## 4. Ledger (Admin)

### 4.1. `GET /admin/ledger/verify`
- **Auth**: ADMIN
- **Mô tả**: Xác minh tổng DEBIT = tổng CREDIT toàn hệ thống.
- **Response 200**:
```json
{
  "success": true,
  "data": {
    "totalDebit": 125450000.00,
    "totalCredit": 125450000.00,
    "balanced": true,
    "checkedAt": "2026-07-20T10:20:00"
  }
}
```

### 4.2. `GET /admin/ledger/account/{id}`
- **Auth**: ADMIN
- **Query params**: `page`, `size`
- **Response 200**: `ApiResponse<PageResponse<LedgerEntryResponse>>` — danh sách bút toán của 1 account, gồm `entryType`, `amount`, `balanceAfter`, `transactionId`, `createdAt`.

---

## 5. Webhook Logs (Admin) — tham chiếu nội bộ (không public REST nhưng phục vụ UI Week 3)
- Dữ liệu lấy qua endpoint tự bổ sung tương tự `GET /admin/webhooks` (phân trang, filter theo `status`, `merchantId`) — team có thể thêm vào `LedgerController` hoặc tạo `WebhookLogController` riêng theo cùng chuẩn REST ở trên.

---

## 6. Mã lỗi chuẩn hoá (Global Exception Handler)

| Exception | HTTP Status | Ví dụ message |
|---|---|---|
| `ResourceNotFoundException` | 404 | `Account not found with id: 99` |
| `DuplicateResourceException` | 409 | `Merchant already exists with code: SHOPABC` |
| `InsufficientBalanceException` | 422 | `Insufficient balance in account: AC00000012` |
| `InvalidTransactionStateException` | 409 | `Transaction TXN-... is not in COMPLETED state` |
| `MethodArgumentNotValidException` | 400 | Danh sách lỗi validate theo từng field |
| `AccessDeniedException` | 403 | `You do not have permission to access this resource` |

## 7. Swagger / OpenAPI
- Toàn bộ controller gắn `@Tag`, mọi method gắn `@Operation(summary = ...)`.
- Nhóm tag đề xuất: `Accounts`, `Merchants`, `Transactions`, `Ledger`.
- Truy cập tài liệu tại `/swagger-ui.html` (hoặc `/swagger-ui/index.html` tuỳ version springdoc).
