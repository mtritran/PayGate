---
tags:
  - training
  - project
  - paygate
  - srs
  - week2
created: 2026-07-27
---

# Software Requirements Specification (SRS) — PayGate Week 2

**Dự án**: Project 3 — PayGate (Payment Gateway Simulator — Phase 2)
**Team**: 3 (Trí - Vinh - Nhi)
**Prefix mã yêu cầu**: PAY-W2
**Repo**: https://github.com/mtritran/PayGate

---

## 1. Giới thiệu

### 1.1. Mục đích
Tài liệu này mô tả các yêu cầu chức năng và phi chức năng của **5 Features bổ sung trong Week 2** cho hệ thống PayGate. Các tính năng này mở rộng từ nền tảng Week 1 (Core Payment Engine, Double-entry Ledger, Merchant Management, JWT Authentication, RabbitMQ Event, Redis Cache).

### 1.2. Phạm vi mở rộng
Week 2 bổ sung 5 dịch vụ giá trị gia tăng & tiện ích tài chính, tất cả đều **tận dụng trực tiếp** hạ tầng Week 1:
1. **Feature 1: Reward Points & Voucher System** — Tích điểm thưởng tự động qua giao dịch, đổi điểm lấy Voucher, áp dụng giảm trừ tiền khi thanh toán.
2. **Feature 2: QR Code Payment** — Sinh mã QR Payload (tĩnh/động), quét Camera/Upload QR, parse thông tin & thanh toán qua `processPayment()`.
3. **Feature 3: Savings Vault Goal** — Hũ tiết kiệm ví phụ, nạp/rút tiền, theo dõi tiến độ mục tiêu tài chính.
4. **Feature 4: Loan System** — Đăng ký vay tiêu dùng, Admin duyệt & giải ngân vào ví, lịch trả nợ kỳ hạn.
5. **Feature 5: Bill Payment System** — Tra cứu & thanh toán hóa đơn Điện/Nước/Internet qua Mock Provider Engine.

### 1.3. Đối tượng sử dụng (kế thừa + mở rộng)
| Vai trò | Mô tả Week 1 | Mở rộng Week 2 |
|---|---|---|
| USER | Sở hữu tài khoản ví, thanh toán, top-up | Tích điểm, đổi voucher, tạo hũ tiết kiệm, đăng ký vay, tra cứu & thanh toán hóa đơn, quét QR |
| ADMIN | Quản lý merchant, xác minh ledger, refund | Quản lý kho voucher, duyệt/từ chối khoản vay, quản lý nhà cung cấp hóa đơn |
| MERCHANT | Nhận thanh toán qua cổng | Tạo QR động cho đơn hàng |

### 1.4. Định nghĩa & thuật ngữ bổ sung
| Thuật ngữ | Ý nghĩa |
|---|---|
| Loyalty Engine | Module tự động tính & cộng điểm thưởng khi giao dịch `COMPLETED` |
| Voucher | Mã giảm giá trực tiếp (số tiền cố định), đổi bằng điểm thưởng |
| QR Payload | Chuỗi JSON mã hóa Base64 chứa thông tin thanh toán (`accountNumber`, `amount`, `description`) |
| Vault Account | Tài khoản ví phụ (`owner_type = VAULT`) đại diện cho 1 Hũ tiết kiệm |
| Loan Disbursement | Giao dịch giải ngân khoản vay: SYSTEM → USER |
| Loan Repayment | Giao dịch trả nợ kỳ hạn: USER → SYSTEM |
| Bill Provider | Nhà cung cấp dịch vụ sinh hoạt (EVN, VNPT...) liên kết với Merchant Account |
| Mock Provider Engine | Mô phỏng API tra cứu hóa đơn của nhà cung cấp (không kết nối thật) |

### 1.5. Giả định & ràng buộc
- Kế thừa toàn bộ hạ tầng Week 1: `TransactionService.processPayment()`, `refund()`, Double-entry Ledger, Account Lock Pattern, Idempotency Cache, RabbitMQ Event.
- Mọi giao dịch mới (Vault Deposit/Withdraw, Loan Disbursement/Repayment, Bill Payment) đều **bắt buộc** tạo `Transaction` + 2 `LedgerEntry` (DEBIT + CREDIT) tuân thủ nguyên tắc sổ cái ghi kép.
- Đơn vị tiền: VND. Kiểu `DECIMAL(15,2)`.
- Không kết nối cổng thanh toán / nhà cung cấp dịch vụ thật (chỉ mô phỏng nội bộ).

---

## 2. Yêu cầu chức năng (Functional Requirements)

Định dạng mã: `REQ-PAY-W2-{B|F}-{feature}{số thứ tự}` (B=Backend, F=Frontend).

### 2.1. Feature 1: Reward Points & Voucher System

| Mã | Mô tả | Actor |
|---|---|---|
| REQ-PAY-W2-B-101 | Entity `Voucher` (code, title, discountAmount, pointsRequired, minOrderAmount, applicableType, totalQuantity, remainingQty, expiresAt) + Flyway migration | Dev |
| REQ-PAY-W2-B-102 | Entity `UserVoucher` (userId, voucherId, status: AVAILABLE/USED/EXPIRED, redeemedAt, usedAt) + Flyway migration | Dev |
| REQ-PAY-W2-B-103 | Entity `PointTransaction` (userId, points, type: EARN/REDEEM, description, transactionRef) + Flyway migration | Dev |
| REQ-PAY-W2-B-104 | `LoyaltyService`: lắng nghe `PaymentCompletedEvent`, tính điểm theo `TransactionType` & `amount`, ghi `point_transactions` | Dev |
| REQ-PAY-W2-B-105 | `VoucherService`: CRUD voucher (Admin), `redeem()` đổi điểm lấy voucher, `applyVoucher()` validate & tính giảm giá | Dev |
| REQ-PAY-W2-B-106 | REST User: `GET /rewards/my-points`, `GET /rewards/history`, `GET /vouchers/shop`, `POST /vouchers/redeem`, `GET /vouchers/my-vouchers`, `POST /vouchers/apply` | USER |
| REQ-PAY-W2-B-107 | REST Admin: `POST/GET/PUT /admin/vouchers` — quản lý kho voucher | ADMIN |
| REQ-PAY-W2-F-101 | UI Kho Voucher: danh sách voucher khả dụng, nút Đổi điểm, Kho voucher của tôi | USER |
| REQ-PAY-W2-F-102 | UI Chọn voucher khi thanh toán: dropdown/input mã voucher trong form Payment | USER |

**Quy tắc nghiệp vụ**:
- Chỉ giao dịch `COMPLETED` mới được tích điểm; giao dịch `PENDING`/`FAILED` không tích.
- Tỷ lệ tích điểm: `PAYMENT`/`BILL_PAYMENT` = 10.000₫/1 điểm; `LOAN_REPAYMENT` = 10.000₫/2 điểm; `VAULT_DEPOSIT` = 20.000₫/1 điểm.
- Điểm thưởng **không** quy đổi trực tiếp thành tiền mặt — bắt buộc đổi sang Voucher.
- Mỗi đơn hàng chỉ áp dụng tối đa **1** mã Voucher.
- Voucher có `expiresAt`, `minOrderAmount`, `applicableType` (ALL / BILL_PAYMENT / PAYMENT / LOAN_REPAYMENT).
- Đổi voucher: validate `user.totalPoints >= voucher.pointsRequired` && `voucher.remainingQty > 0`.

---

### 2.2. Feature 2: QR Code Payment

| Mã | Mô tả | Actor |
|---|---|---|
| REQ-PAY-W2-B-201 | `QrService.generate()`: nhận `accountNumber`, `amount` (optional), `description`, `merchantId` → Sinh QR Payload JSON Base64 + QR Image PNG Base64 | Dev |
| REQ-PAY-W2-B-202 | `QrService.parse()`: nhận `qrPayload` Base64 → Decode JSON → Validate `accountNumber` tồn tại & `ACTIVE`, kiểm tra `expiresAt` → Trả thông tin người nhận | Dev |
| REQ-PAY-W2-B-203 | REST: `POST /qr/generate`, `POST /qr/parse` | USER/MERCHANT |
| REQ-PAY-W2-F-201 | UI Tạo QR: form nhập thông tin → Hiển thị ảnh QR, nút Tải về / Chia sẻ | USER/MERCHANT |
| REQ-PAY-W2-F-202 | UI Quét QR: mở Camera (`html5-qrcode` / `jsQR`) hoặc Upload ảnh → Gọi parse → Hiển thị xác nhận thanh toán | USER |

**Quy tắc nghiệp vụ**:
- QR Payload bắt buộc chứa `type: "PAYGATE_QR"`, `version: "1.0"`, `accountNumber` hợp lệ.
- QR Tĩnh: không chứa `amount` → Người quét phải nhập số tiền. QR Động: chứa `amount > 0` & `expiresAt` (15-30 phút).
- **Không** cho phép tự quét QR thanh toán cho chính mình (`sourceAccount ≠ destAccount`).
- Quét QR chỉ **điền thông tin** — người dùng bắt buộc bấm **Xác nhận** trước khi trừ tiền.
- Thanh toán cuối cùng gọi `POST /transactions/pay` (API Week 1) — đảm bảo Idempotency & Ledger.

---

### 2.3. Feature 3: Savings Vault Goal

| Mã | Mô tả | Actor |
|---|---|---|
| REQ-PAY-W2-B-301 | Entity `Vault` (userId, accountId, name, targetAmount, deadline, status: ACTIVE/COMPLETED/CLOSED) + Flyway migration. Cập nhật `OwnerType` thêm `VAULT` | Dev |
| REQ-PAY-W2-B-302 | `VaultService.createVault()`: tạo Vault + tự động `AccountService.createAccount(ownerType=VAULT)` | Dev |
| REQ-PAY-W2-B-303 | `VaultService.deposit()` / `withdraw()`: chuyển khoản nội bộ `USER_ACCOUNT ↔ VAULT_ACCOUNT`, sinh `Transaction` (`VAULT_DEPOSIT`/`VAULT_WITHDRAW`) + 2 `LedgerEntry`. Cập nhật `TransactionType` thêm `VAULT_DEPOSIT`, `VAULT_WITHDRAW` | Dev |
| REQ-PAY-W2-B-304 | REST: `POST /vaults`, `GET /vaults`, `GET /vaults/{id}`, `POST /vaults/{id}/deposit`, `POST /vaults/{id}/withdraw`, `PATCH /vaults/{id}/close` | USER |
| REQ-PAY-W2-F-301 | UI Vault: danh sách hũ + Progress Bar (%), form tạo hũ, form nạp/rút, nút đóng hũ | USER |

**Quy tắc nghiệp vụ**:
- Mỗi Vault liên kết 1 `Account` riêng (`owner_type = VAULT`).
- Nạp tiền: DEBIT `USER_ACCOUNT`, CREDIT `VAULT_ACCOUNT`. Rút tiền: ngược lại.
- Nạp không được làm âm ví chính; Rút không vượt quá số dư hũ.
- Hũ `CLOSED` không cho phép nạp/rút. Hũ `COMPLETED` vẫn cho phép nạp thêm/rút.
- Auto-transition: khi `vaultAccount.balance >= vault.targetAmount` → status chuyển `COMPLETED`.
- `AccountServiceImpl.lookupAccount()` phải ẩn tài khoản `VAULT` khỏi kết quả tra cứu công khai.

---

### 2.4. Feature 4: Loan System

| Mã | Mô tả | Actor |
|---|---|---|
| REQ-PAY-W2-B-401 | Entity `Loan` (userId, accountId, loanRef, amount, interestRate, termMonths, monthlyAmount, totalRepayable, remainingAmount, status, adminNote, disbursedAt) + Flyway migration. Cập nhật `TransactionType` thêm `LOAN_DISBURSEMENT`, `LOAN_REPAYMENT` | Dev |
| REQ-PAY-W2-B-402 | Entity `LoanSchedule` (loanId, periodNumber, amountDue, dueDate, status: PENDING/PAID/OVERDUE, paidAt, transactionRef) + Flyway migration | Dev |
| REQ-PAY-W2-B-403 | `LoanService.apply()`: validate hạn mức (500K-20M), validate user chưa có khoản vay ACTIVE/PENDING, tính toán lãi suất/lịch trả nợ | Dev |
| REQ-PAY-W2-B-404 | `LoanService.approve()`: gọi `processPayment()` giải ngân `SYSTEM → USER` (`LOAN_DISBURSEMENT`), sinh `loan_schedules` | Dev |
| REQ-PAY-W2-B-405 | `LoanService.repay()`: gọi `processPayment()` trả nợ `USER → SYSTEM` (`LOAN_REPAYMENT`), cập nhật schedule → `PAID`, cập nhật `remainingAmount` | Dev |
| REQ-PAY-W2-B-406 | REST User: `POST /loans/apply`, `GET /loans/my-loans`, `GET /loans/{id}`, `POST /loans/{id}/repay` | USER |
| REQ-PAY-W2-B-407 | REST Admin: `GET /admin/loans`, `POST /admin/loans/{id}/approve`, `POST /admin/loans/{id}/reject` | ADMIN |
| REQ-PAY-W2-F-401 | UI Vay: form đăng ký vay, danh sách khoản vay, chi tiết + lịch trả nợ, nút trả nợ | USER |
| REQ-PAY-W2-F-402 | UI Admin Vay: danh sách đơn vay chờ duyệt, nút Approve/Reject | ADMIN |

**Quy tắc nghiệp vụ**:
- Mỗi User tối đa **1** khoản vay đang `ACTIVE` hoặc `PENDING_APPROVAL`.
- Hạn mức vay: 500.000₫ — 20.000.000₫. Kỳ hạn: 1, 3, 6, 12 tháng.
- Lãi suất cố định: 1.5%/tháng (ví dụ). `totalRepayable = amount × (1 + interestRate × termMonths)`.
- Giải ngân: `SYSTEM_ACCOUNT` → `USER_ACCOUNT`. Trả nợ: `USER_ACCOUNT` → `SYSTEM_ACCOUNT`.
- Phải kiểm tra ví SYSTEM đủ tiền trước giải ngân; ví USER đủ tiền trước trả nợ.
- Không cho phép trả nợ khoản vay đã `PAID_OFF` hoặc `REJECTED`.

---

### 2.5. Feature 5: Bill Payment System

| Mã | Mô tả | Actor |
|---|---|---|
| REQ-PAY-W2-B-501 | Entity `BillProvider` (code, name, type: ELECTRICITY/WATER/INTERNET, merchantId, active) + Flyway migration + Seed data demo | Dev |
| REQ-PAY-W2-B-502 | Entity `Bill` (providerId, customerCode, customerName, address, amount, period, status: UNPAID/PAID, transactionRef, paidAt) + Flyway migration + Seed data demo | Dev |
| REQ-PAY-W2-B-503 | Entity `SavedBill` (userId, providerId, customerCode, nickname) + Flyway migration | Dev |
| REQ-PAY-W2-B-504 | `BillService.lookup()`: tra cứu hóa đơn `UNPAID` theo `providerCode` + `customerCode`. Cập nhật `TransactionType` thêm `BILL_PAYMENT` | Dev |
| REQ-PAY-W2-B-505 | `BillService.pay()`: gọi `processPayment()` (`USER → MERCHANT_PROVIDER`), cập nhật bill → `PAID` | Dev |
| REQ-PAY-W2-B-506 | REST User: `GET /bills/providers`, `POST /bills/lookup`, `POST /bills/pay`, `GET /bills/saved`, `POST /bills/saved` | USER |
| REQ-PAY-W2-F-501 | UI Bill: chọn loại dịch vụ → chọn provider → nhập mã KH → tra cứu → xác nhận thanh toán | USER |
| REQ-PAY-W2-F-502 | UI Saved Bills: danh sách hóa đơn đã lưu, tra cứu nhanh | USER |

**Quy tắc nghiệp vụ**:
- Mã khách hàng không tồn tại → trả `404 Bill Code Not Found`.
- Hóa đơn `PAID` không được thanh toán lại.
- Thanh toán tạo Transaction `BILL_PAYMENT` + 2 LedgerEntry (DEBIT User, CREDIT Provider Merchant).
- Mỗi Nhà cung cấp (EVN, VNPT...) liên kết 1 `Merchant Account` trong hệ thống.
- User được lưu tối đa **10** hóa đơn thường dùng.

---

## 3. Yêu cầu phi chức năng (Non-Functional Requirements)

| Nhóm | Yêu cầu |
|---|---|
| Toàn vẹn dữ liệu | Mọi giao dịch Vault/Loan/Bill đều tạo `Transaction` + 2 `LedgerEntry` cân bằng; `GET /admin/ledger/verify` vẫn phải trả `balanced = true` |
| Hiệu năng | Tính điểm Loyalty bất đồng bộ qua `@EventListener`/RabbitMQ không gây chậm `processPayment()`; Parse QR < 300ms |
| Bảo mật | Validate `userId` sở hữu trên mọi thao tác Vault/Loan/Bill; Chống Race Condition bằng `@Version` + `SELECT ... FOR UPDATE` |
| Đồng thời | Khóa tài khoản theo thứ tự `id` tăng dần khi Vault Deposit/Withdraw, Loan Disburse/Repay (kế thừa Account Lock Pattern Week 1) |
| Khả năng kiểm thử | ≥ 3 integration test mới (Vault deposit/withdraw Ledger balance, Loan disburse/repay, Bill pay + check PAID) |
| Swagger | Tất cả controller mới gắn `@Tag`, `@Operation`. Nhóm tag: `Rewards`, `QR`, `Vaults`, `Loans`, `Bills` |

---

## 4. Tận dụng hạ tầng Week 1 (System Reuse Matrix)

| Hạ tầng Week 1 | Tận dụng trong Week 2 |
|---|---|
| `TransactionService.processPayment()` | Vault Deposit/Withdraw, Loan Disburse/Repay, Bill Pay, QR Payment |
| `TransactionService.refund()` | Không sử dụng trực tiếp trong Week 2 |
| Double-entry Ledger Engine | Ghi sổ cái cho mọi giao dịch mới (VAULT_DEPOSIT/WITHDRAW, LOAN_DISBURSEMENT/REPAYMENT, BILL_PAYMENT) |
| Account Lock Pattern (id ascending) | Chống deadlock khi 2 account giao dịch đồng thời (Vault ↔ User, System ↔ User) |
| `@Version` Optimistic Locking | Bảo vệ cập nhật đồng thời số dư tài khoản |
| Idempotency Cache Redis | Chống trùng khi thanh toán QR, Bill Payment |
| `PaymentCompletedEvent` + RabbitMQ | Loyalty Engine lắng nghe event để tính điểm thưởng |
| `AccountService.createAccount()` | Tạo tài khoản VAULT cho mỗi Hũ tiết kiệm |
| JWT Auth (USER / ADMIN) | Phân quyền toàn bộ API mới |
| `ApiResponse<T>` wrapper | Response chuẩn cho tất cả endpoint Week 2 |
| `GlobalExceptionHandler` | Xử lý lỗi validate, 404, 409 cho các entity mới |

---

## 5. Cập nhật & Thêm mới Enums

### 5.1. Enums hiện có được mở rộng
- **`OwnerType`** (file: `enums/OwnerType.java`): Thêm `VAULT`
- **`TransactionType`** (file: `enums/TransactionType.java`): Thêm `VAULT_DEPOSIT`, `VAULT_WITHDRAW`, `LOAN_DISBURSEMENT`, `LOAN_REPAYMENT`, `BILL_PAYMENT`

### 5.2. Enums mới tạo mới cho Week 2
- **`VoucherApplicableType`** (`enums/VoucherApplicableType.java`): `ALL`, `BILL_PAYMENT`, `PAYMENT`, `LOAN_REPAYMENT`
- **`UserVoucherStatus`** (`enums/UserVoucherStatus.java`): `AVAILABLE`, `USED`, `EXPIRED`
- **`PointTransactionType`** (`enums/PointTransactionType.java`): `EARN`, `REDEEM`
- **`VaultStatus`** (`enums/VaultStatus.java`): `ACTIVE`, `COMPLETED`, `CLOSED`
- **`LoanStatus`** (`enums/LoanStatus.java`): `PENDING_APPROVAL`, `ACTIVE`, `PAID_OFF`, `REJECTED`, `OVERDUE`
- **`LoanScheduleStatus`** (`enums/LoanScheduleStatus.java`): `PENDING`, `PAID`, `OVERDUE`
- **`RepayType`** (`enums/RepayType.java`): `NEXT_PERIOD`, `FULL_SETTLEMENT`
- **`BillType`** (`enums/BillType.java`): `ELECTRICITY`, `WATER`, `INTERNET`
- **`BillStatus`** (`enums/BillStatus.java`): `UNPAID`, `PAID`

