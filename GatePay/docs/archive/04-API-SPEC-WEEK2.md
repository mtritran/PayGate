---
tags:
  - training
  - project
  - paygate
  - api-spec
  - week2
created: 2026-07-27
---

# API Specification — PayGate Week 2

Base URL: `/api/v1`
Auth: `Authorization: Bearer <JWT>` (kế thừa Week 1)
Định dạng response chuẩn: `ApiResponse<T>` / `ApiResponse<PageResponse<T>>` (theo `common/ApiResponse.java`)

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

## 1. Rewards (Tích điểm)

### 1.1. `GET /rewards/my-points`
- **Auth**: USER
- **Mô tả**: Lấy tổng điểm thưởng hiện tại, điểm tích trong tháng, và hạng hội viên.
- **Response 200**:
```json
{
  "success": true,
  "data": {
    "totalPoints": 450,
    "earnedThisMonth": 120,
    "tier": "GOLD"
  }
}
```
- **Ghi chú**: `totalPoints` = SUM(`points`) FROM `point_transactions` WHERE `user_id = currentUser.id`. `tier` tính theo ngưỡng (`< 100` = BRONZE, `< 500` = SILVER, `>= 500` = GOLD). Cache Redis `user:points:{userId}` TTL 5 phút.

### 1.2. `GET /rewards/history`
- **Auth**: USER
- **Query params**: `page` (default 0), `size` (default 20)
- **Mô tả**: Lịch sử biến động điểm thưởng (tích điểm, đổi voucher).
- **Response 200**: `ApiResponse<PageResponse<PointTransactionResponse>>`
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 1,
        "points": 50,
        "type": "EARN",
        "description": "Tích điểm từ thanh toán TXN-20260727-001",
        "transactionRef": "TXN-20260727-001",
        "createdAt": "2026-07-27T10:00:00"
      },
      {
        "id": 2,
        "points": -100,
        "type": "REDEEM",
        "description": "Đổi voucher BILL20K",
        "transactionRef": null,
        "createdAt": "2026-07-27T11:00:00"
      }
    ],
    "pageNo": 0,
    "pageSize": 20,
    "totalElements": 2,
    "totalPages": 1,
    "last": true
  }
}
```

---

## 2. Vouchers (Voucher ưu đãi)

### 2.1. `GET /vouchers/shop`
- **Auth**: USER
- **Mô tả**: Lấy danh sách voucher đang khả dụng (chưa hết hạn, còn số lượng).
- **Query params**: `page`, `size`, `applicableType` (optional filter)
- **Response 200**: `ApiResponse<PageResponse<VoucherResponse>>`
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 10,
        "code": "BILL20K",
        "title": "Giảm 20.000₫ cho hóa đơn Điện/Nước",
        "discountAmount": 20000.00,
        "pointsRequired": 100,
        "minOrderAmount": 100000.00,
        "applicableType": "BILL_PAYMENT",
        "remainingQty": 850,
        "expiresAt": "2026-12-31T23:59:59"
      }
    ],
    "pageNo": 0,
    "pageSize": 20,
    "totalElements": 1,
    "totalPages": 1,
    "last": true
  }
}
```

### 2.2. `POST /vouchers/redeem`
- **Auth**: USER
- **Mô tả**: Đổi điểm thưởng lấy voucher. Trừ điểm, giảm `remaining_qty`, tạo `user_vouchers` với status `AVAILABLE`.
- **Request Body**:
```json
{
  "voucherId": 10
}
```
- **Response 201**:
```json
{
  "success": true,
  "message": "Voucher redeemed successfully",
  "data": {
    "userVoucherId": 101,
    "voucherCode": "BILL20K",
    "discountAmount": 20000.00,
    "expiresAt": "2026-12-31T23:59:59",
    "status": "AVAILABLE"
  }
}
```
- **Lỗi**:
  - `422` — `InsufficientPointsException`: Không đủ điểm thưởng.
  - `409` — `VoucherOutOfStockException`: Voucher hết số lượng (`remaining_qty = 0`).
  - `400` — Voucher đã hết hạn.

### 2.3. `GET /vouchers/my-vouchers`
- **Auth**: USER
- **Query params**: `status` (optional: `AVAILABLE`, `USED`, `EXPIRED`)
- **Mô tả**: Kho voucher cá nhân.
- **Response 200**: `ApiResponse<List<UserVoucherResponse>>`

### 2.4. `POST /vouchers/apply`
- **Auth**: USER
- **Mô tả**: Kiểm tra & tính toán giảm giá khi áp dụng mã voucher trước thanh toán. Endpoint này **không** trừ tiền, chỉ validate & trả `finalAmount`.
- **Request Body**:
```json
{
  "voucherCode": "BILL20K",
  "originalAmount": 520000.00,
  "transactionType": "BILL_PAYMENT"
}
```
- **Response 200**:
```json
{
  "success": true,
  "data": {
    "valid": true,
    "discountAmount": 20000.00,
    "finalAmount": 500000.00,
    "userVoucherId": 101
  }
}
```
- **Lỗi**:
  - `400` — Voucher không tồn tại, đã hết hạn, không đúng loại dịch vụ, hoặc đơn hàng < `minOrderAmount`.

### 2.5. `POST /admin/vouchers` (Admin)
- **Auth**: ADMIN
- **Mô tả**: Tạo voucher mới vào kho ưu đãi.
- **Request Body**:
```json
{
  "code": "BILL20K",
  "title": "Giảm 20.000₫ cho hóa đơn Điện/Nước",
  "discountAmount": 20000.00,
  "pointsRequired": 100,
  "minOrderAmount": 100000.00,
  "applicableType": "BILL_PAYMENT",
  "totalQuantity": 1000,
  "expiresAt": "2026-12-31T23:59:59"
}
```
- **Validation**: `code` `@NotBlank` & unique; `discountAmount`, `pointsRequired` `@Positive`; `totalQuantity` `@Positive`; `expiresAt` phải trong tương lai.
- **Response 201**: `VoucherResponse`.
- **Lỗi**: `409` nếu `code` đã tồn tại.

### 2.6. `GET /admin/vouchers` (Admin)
- **Auth**: ADMIN
- **Query params**: `page`, `size`, `sortBy`, `sortDir`
- **Response 200**: `ApiResponse<PageResponse<VoucherResponse>>`

### 2.7. `PUT /admin/vouchers/{id}` (Admin)
- **Auth**: ADMIN
- **Request Body**: `{ "title": "...", "totalQuantity": ..., "expiresAt": "..." }`
- **Response 200**: `VoucherResponse` cập nhật.
- **Lỗi**: `404` nếu không tồn tại.

---

## 3. QR Code Payment

### 3.1. `POST /qr/generate`
- **Auth**: USER / MERCHANT
- **Mô tả**: Sinh mã QR chứa thông tin thanh toán. Backend build JSON → Base64 encode → Sinh ảnh QR PNG (Base64).
- **Request Body**:
```json
{
  "accountNumber": "AC00000045",
  "amount": 100000.00,
  "description": "Thanh toán đơn hàng #1023",
  "merchantId": 3
}
```
- **Validation**: `accountNumber` `@NotBlank`, phải tồn tại & `ACTIVE`; `amount` nếu có phải `@Positive`; `merchantId` optional.
- **Response 200**:
```json
{
  "success": true,
  "data": {
    "qrPayload": "eyJ0eXBlIjoiUEFZR0FURV9RUiIsInZlcnNpb24iOiIxLjAiLC4uLn0=",
    "qrImageBase64": "data:image/png;base64,iVBORw0KGgo...",
    "expiresAt": "2026-07-27T12:00:00"
  }
}
```

### 3.2. `POST /qr/parse`
- **Auth**: USER
- **Mô tả**: Giải mã QR Payload → Validate → Trả thông tin người nhận.
- **Request Body**:
```json
{
  "qrPayload": "eyJ0eXBlIjoiUEFZR0FURV9RUiIs..."
}
```
- **Response 200**:
```json
{
  "success": true,
  "data": {
    "accountNumber": "AC00000045",
    "receiverName": "Cửa hàng Trà Sữa ABC",
    "receiverType": "MERCHANT",
    "destAccountId": 45,
    "amount": 100000.00,
    "description": "Thanh toán đơn hàng #1023"
  }
}
```
- **Lỗi**:
  - `400` — QR Payload không hợp lệ (sai format, thiếu `type: "PAYGATE_QR"`).
  - `404` — `accountNumber` không tồn tại.
  - `410` — QR đã hết hạn (`expiresAt` < now).

### 3.3. Thanh toán QR
Sử dụng trực tiếp API Week 1: `POST /transactions/pay` với thông tin parse được từ QR (`destAccountId`, `amount`, `description`, `idempotencyKey`).

---

## 4. Savings Vault (Hũ tiết kiệm)

### 4.1. `POST /vaults`
- **Auth**: USER
- **Mô tả**: Tạo Hũ tiết kiệm mới + tự động tạo Account (`owner_type = VAULT`).
- **Request Body**:
```json
{
  "name": "Du lịch Đà Lạt",
  "targetAmount": 5000000.00,
  "deadline": "2026-12-31",
  "description": "Tiết kiệm cho chuyến đi cuối năm"
}
```
- **Validation**: `name` `@NotBlank`, max 100 ký tự; `targetAmount` `@Positive`; `deadline` optional nhưng phải trong tương lai.
- **Response 201**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Du lịch Đà Lạt",
    "targetAmount": 5000000.00,
    "currentBalance": 0.00,
    "progress": 0.0,
    "deadline": "2026-12-31",
    "status": "ACTIVE",
    "createdAt": "2026-07-27T10:00:00"
  }
}
```

### 4.2. `GET /vaults`
- **Auth**: USER
- **Mô tả**: Danh sách Hũ tiết kiệm (chỉ hũ của user hiện tại).
- **Response 200**: `ApiResponse<List<VaultResponse>>`

### 4.3. `GET /vaults/{id}`
- **Auth**: USER (chủ sở hữu)
- **Mô tả**: Chi tiết Hũ tiết kiệm + giao dịch gần đây.
- **Response 200**: `VaultResponse` kèm `recentTransactions`.
- **Lỗi**: `404` không tồn tại; `403` không phải chủ sở hữu.

### 4.4. `POST /vaults/{id}/deposit`
- **Auth**: USER (chủ sở hữu)
- **Mô tả**: Nạp tiền từ ví chính vào Hũ. Gọi `processPayment()` nội bộ (`USER_ACCOUNT → VAULT_ACCOUNT`, type=`VAULT_DEPOSIT`).
- **Request Body**:
```json
{
  "amount": 500000.00,
  "description": "Trích lương tháng 7"
}
```
- **Validation**: `amount` `@Positive`; Vault phải `ACTIVE` hoặc `COMPLETED`; ví chính đủ tiền.
- **Response 200**:
```json
{
  "success": true,
  "data": {
    "vaultId": 1,
    "vaultBalance": 500000.00,
    "progress": 10.0,
    "transactionRef": "TXN-VDEP-A1B2C3D4",
    "status": "COMPLETED"
  }
}
```
- **Lỗi**: `422` — Insufficient balance (ví chính); `409` — Vault đã `CLOSED`.

### 4.5. `POST /vaults/{id}/withdraw`
- **Auth**: USER (chủ sở hữu)
- **Mô tả**: Rút tiền từ Hũ về ví chính. Gọi `processPayment()` nội bộ (`VAULT_ACCOUNT → USER_ACCOUNT`, type=`VAULT_WITHDRAW`).
- **Request Body**:
```json
{
  "amount": 200000.00,
  "description": "Rút mua sắm"
}
```
- **Validation**: `amount` `@Positive`; `amount <= vault_account.balance`; Vault phải không `CLOSED`.
- **Response 200**:
```json
{
  "success": true,
  "data": {
    "vaultId": 1,
    "vaultBalance": 300000.00,
    "progress": 6.0,
    "transactionRef": "TXN-VWITH-E5F6G7H8",
    "status": "COMPLETED"
  }
}
```
- **Lỗi**: `422` — Insufficient vault balance; `409` — Vault đã `CLOSED`.

### 4.6. `PATCH /vaults/{id}/close`
- **Auth**: USER (chủ sở hữu)
- **Mô tả**: Đóng Hũ tiết kiệm. Nếu còn số dư → tự động rút hết về ví chính trước khi đóng.
- **Response 200**: `VaultResponse` với `status = CLOSED`.
- **Lỗi**: `409` nếu đã `CLOSED`.

---

## 5. Loans (Vay tiêu dùng)

### 5.1. `POST /loans/apply`
- **Auth**: USER
- **Mô tả**: Tạo yêu cầu vay mới. Hệ thống tự tính `monthlyAmount`, `totalRepayable`.
- **Request Body**:
```json
{
  "amount": 5000000.00,
  "termMonths": 3,
  "reason": "Mua sắm thiết bị học tập"
}
```
- **Validation**: `amount` trong khoảng 500.000₫ — 20.000.000₫; `termMonths` ∈ {1, 3, 6, 12}; User chưa có khoản vay `ACTIVE` hoặc `PENDING_APPROVAL`.
- **Response 201**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "loanRef": "LOAN-20260727-001",
    "amount": 5000000.00,
    "interestRate": 1.50,
    "termMonths": 3,
    "monthlyAmount": 1741666.67,
    "totalRepayable": 5225000.00,
    "remainingAmount": 5225000.00,
    "status": "PENDING_APPROVAL",
    "createdAt": "2026-07-27T10:00:00"
  }
}
```
- **Lỗi**: `409` — User đã có khoản vay đang hoạt động; `400` — Hạn mức/kỳ hạn không hợp lệ.

### 5.2. `GET /loans/my-loans`
- **Auth**: USER
- **Query params**: `page`, `size`, `status` (optional filter)
- **Response 200**: `ApiResponse<PageResponse<LoanResponse>>`

### 5.3. `GET /loans/{id}`
- **Auth**: USER (chủ sở hữu) / ADMIN
- **Mô tả**: Chi tiết khoản vay + Lịch trả nợ (`loan_schedules`).
- **Response 200**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "loanRef": "LOAN-20260727-001",
    "amount": 5000000.00,
    "interestRate": 1.50,
    "termMonths": 3,
    "monthlyAmount": 1741666.67,
    "totalRepayable": 5225000.00,
    "remainingAmount": 3483333.33,
    "status": "ACTIVE",
    "disbursedAt": "2026-07-27T14:00:00",
    "schedules": [
      {
        "periodNumber": 1,
        "amountDue": 1741666.67,
        "dueDate": "2026-08-27",
        "status": "PAID",
        "paidAt": "2026-08-25T09:30:00",
        "transactionRef": "TXN-LREP-X1Y2Z3"
      },
      {
        "periodNumber": 2,
        "amountDue": 1741666.67,
        "dueDate": "2026-09-27",
        "status": "PENDING",
        "paidAt": null,
        "transactionRef": null
      },
      {
        "periodNumber": 3,
        "amountDue": 1741666.67,
        "dueDate": "2026-10-27",
        "status": "PENDING",
        "paidAt": null,
        "transactionRef": null
      }
    ]
  }
}
```

### 5.4. `POST /loans/{id}/repay`
- **Auth**: USER
- **Mô tả**: Thanh toán kỳ nợ tiếp theo hoặc tất toán toàn bộ. Gọi `processPayment(USER → SYSTEM, amountDue, type=LOAN_REPAYMENT)`.
- **Request Body**:
```json
{
  "repayType": "NEXT_PERIOD"
}
```
- **`repayType`**: `NEXT_PERIOD` (trả kỳ tiếp theo) hoặc `FULL_SETTLEMENT` (tất toán toàn bộ dư nợ).
- **Response 200**:
```json
{
  "success": true,
  "message": "Loan repayment successful",
  "data": {
    "loanId": 1,
    "periodNumber": 2,
    "amountPaid": 1741666.67,
    "remainingAmount": 1741666.67,
    "transactionRef": "TXN-LREP-A4B5C6",
    "loanStatus": "ACTIVE"
  }
}
```
- **Lỗi**: `422` — Ví USER không đủ tiền; `409` — Khoản vay đã `PAID_OFF` hoặc `REJECTED`.

### 5.5. `GET /admin/loans` (Admin)
- **Auth**: ADMIN
- **Query params**: `page`, `size`, `status` (filter: `PENDING_APPROVAL`, `ACTIVE`, `OVERDUE`...)
- **Response 200**: `ApiResponse<PageResponse<LoanResponse>>`

### 5.6. `POST /admin/loans/{id}/approve` (Admin)
- **Auth**: ADMIN
- **Mô tả**: Phê duyệt khoản vay. Hệ thống tự giải ngân `processPayment(SYSTEM → USER, amount, type=LOAN_DISBURSEMENT)`, sinh `loan_schedules`.
- **Request Body**:
```json
{
  "adminNote": "Đủ điều kiện cấp tín dụng"
}
```
- **Response 200**:
```json
{
  "success": true,
  "message": "Loan approved and disbursed",
  "data": {
    "id": 1,
    "loanRef": "LOAN-20260727-001",
    "status": "ACTIVE",
    "disbursedAt": "2026-07-27T14:00:00",
    "disbursementTransactionRef": "TXN-LDIS-M7N8O9"
  }
}
```
- **Lỗi**: `409` — Khoản vay không ở trạng thái `PENDING_APPROVAL`; `422` — Ví SYSTEM không đủ tiền giải ngân.

### 5.7. `POST /admin/loans/{id}/reject` (Admin)
- **Auth**: ADMIN
- **Request Body**: `{ "adminNote": "Lịch sử giao dịch chưa đủ điều kiện" }`
- **Response 200**: `LoanResponse` với `status = REJECTED`.
- **Lỗi**: `409` — Khoản vay không ở trạng thái `PENDING_APPROVAL`.

---

## 6. Bills (Thanh toán hóa đơn)

### 6.1. `GET /bills/providers`
- **Auth**: USER
- **Query params**: `type` (optional: `ELECTRICITY`, `WATER`, `INTERNET`)
- **Mô tả**: Lấy danh sách Nhà cung cấp dịch vụ theo loại hóa đơn.
- **Response 200**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "code": "EVN_HANOI",
      "name": "EVN Hà Nội",
      "type": "ELECTRICITY"
    },
    {
      "id": 2,
      "code": "EVN_HCM",
      "name": "EVN TP.HCM",
      "type": "ELECTRICITY"
    }
  ]
}
```

### 6.2. `POST /bills/lookup`
- **Auth**: USER
- **Mô tả**: Tra cứu hóa đơn `UNPAID` theo mã nhà cung cấp + mã khách hàng.
- **Request Body**:
```json
{
  "providerCode": "EVN_HANOI",
  "customerCode": "PE0100112233"
}
```
- **Validation**: `providerCode`, `customerCode` `@NotBlank`.
- **Response 200**:
```json
{
  "success": true,
  "data": {
    "billId": 101,
    "providerName": "EVN Hà Nội",
    "customerCode": "PE0100112233",
    "customerName": "Nguyễn Văn A",
    "address": "Số 123 Đường Giảng Võ, Hà Nội",
    "period": "07/2026",
    "amount": 520000.00,
    "status": "UNPAID"
  }
}
```
- **Lỗi**: `404` — `Bill code not found` (mã khách hàng không tồn tại hoặc không có hóa đơn `UNPAID`).

### 6.3. `POST /bills/pay`
- **Auth**: USER
- **Mô tả**: Thanh toán hóa đơn. Gọi `processPayment(USER → MERCHANT_PROVIDER, amount, type=BILL_PAYMENT)`.
- **Request Body**:
```json
{
  "billId": 101,
  "voucherCode": "BILL20K"
}
```
- **`voucherCode`**: Optional. Nếu có → validate & apply giảm giá trước khi thanh toán.
- **Response 200**:
```json
{
  "success": true,
  "message": "Bill payment successful",
  "data": {
    "billId": 101,
    "status": "PAID",
    "originalAmount": 520000.00,
    "discountAmount": 20000.00,
    "paidAmount": 500000.00,
    "transactionRef": "TXN-BILL-E1F2G3H4",
    "paidAt": "2026-07-27T10:15:00"
  }
}
```
- **Lỗi**: `404` — Hóa đơn không tồn tại; `409` — Hóa đơn đã `PAID`; `422` — Insufficient balance.

### 6.4. `GET /bills/saved`
- **Auth**: USER
- **Mô tả**: Danh sách hóa đơn đã lưu (tra cứu nhanh).
- **Response 200**: `ApiResponse<List<SavedBillResponse>>`

### 6.5. `POST /bills/saved`
- **Auth**: USER
- **Mô tả**: Lưu mã hóa đơn thường dùng. Giới hạn 10 hóa đơn/user.
- **Request Body**:
```json
{
  "providerCode": "EVN_HANOI",
  "customerCode": "PE0100112233",
  "nickname": "Điện nhà riêng"
}
```
- **Response 201**: `SavedBillResponse`.
- **Lỗi**: `409` — Đã lưu hóa đơn này; `422` — Đã đạt giới hạn 10 hóa đơn.

---

## 7. Mã lỗi bổ sung (Week 2 Exceptions)

| Exception | HTTP Status | Feature | Ví dụ message |
|---|---|---|---|
| `InsufficientPointsException` | 422 | Reward | `Insufficient points: required 100, current 50` |
| `VoucherOutOfStockException` | 409 | Voucher | `Voucher BILL20K is out of stock` |
| `VoucherExpiredException` | 400 | Voucher | `Voucher BILL20K has expired` |
| `VoucherNotApplicableException` | 400 | Voucher | `Voucher BILL20K is not applicable for PAYMENT` |
| `InvalidQrPayloadException` | 400 | QR | `Invalid QR payload format` |
| `QrExpiredException` | 410 | QR | `QR code has expired` |
| `VaultClosedException` | 409 | Vault | `Vault is closed, no operations allowed` |
| `ActiveLoanExistsException` | 409 | Loan | `User already has an active loan` |
| `LoanAmountOutOfRangeException` | 400 | Loan | `Loan amount must be between 500,000 and 20,000,000` |
| `InvalidLoanStateException` | 409 | Loan | `Loan is not in PENDING_APPROVAL state` |
| `BillNotFoundException` | 404 | Bill | `Bill not found with customer code: PE0100112233` |
| `BillAlreadyPaidException` | 409 | Bill | `Bill #101 has already been paid` |
| `SavedBillLimitException` | 422 | Bill | `Maximum saved bills limit (10) reached` |

---

## 8. Swagger / OpenAPI

- Toàn bộ controller mới gắn `@Tag`, mọi method gắn `@Operation(summary = ...)`.
- Nhóm tag bổ sung Week 2: `Rewards`, `Vouchers`, `QR Payments`, `Vaults`, `Loans`, `Bills`.
- Truy cập tài liệu tại `/swagger-ui/index.html`.
