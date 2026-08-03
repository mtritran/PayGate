# 🎯 ENTERPRISE OUTPUT DELIVERABLES MATRIX (BẢNG QUY CHUẨN KẾT QUẢ ĐẦU RA CHO 4 FEATURE)

> **Mục đích:** Bảng quy định toàn diện **Kết quả sản phẩm mong muốn (Definition of Done - DoD)** cho 4 Feature liên kết giữa **GatePay** và **MarketPlace**, bao gồm đầy đủ các tầng: REST APIs, Security, Flyway Migrations, Database Schemas, Core Business Logic, Schedulers, Double-Entry Ledger, UI/UX Components, và Integration Tests.

---

## 💳 1. FEATURE 01: BNPL & Credit Score Engine (Mua Trước Trả Sau 0% & Máy Chấm Điểm Tín Dụng)

### 🟢 Phía GatePay (Nhi - 5 ngày):
- [ ] **4 REST APIs chuẩn Production:**
  - `POST /api/v1/credit/checkout`: Tiếp nhận phiên checkout BNPL ➔ Trả về Token, Payment URL, Phí & Lịch trả góp tính toán.
  - `POST /api/v1/credit/events`: Tiếp nhận Event lịch sử mua/trả hàng từ MarketPlace để cập nhật chỉ số tín dụng.
  - `GET /api/v1/credit/score/{customerId}`: Tra cứu điểm tín dụng (0-100) & Hạn mức duyệt.
  - `GET /api/v1/credit/lines/me`: Tra cứu chi tiết Hạn mức BNPL khả dụng của tài khoản đăng nhập.
- [ ] **Bảo mật & Rate-Limiting:**
  - Đeo `@RateLimit(limit = 10, windowSeconds = 60, key = "bnpl_checkout")`.
  - Xác thực chữ ký mã hóa HMAC-SHA256 từ MarketPlace gửi sang.
- [ ] **3 Bảng CSDL Flyway mới (`V28__create_installments.sql`):**
  - `credit_lines` (`id`, `user_id`, `credit_limit`, `available_credit`, `status`, `tier`, `updated_at`).
  - `installments` (`id`, `transaction_ref`, `user_id`, `installment_number`, `total_installments`, `amount_per_period`, `fee_per_period`, `due_date`, `status`, `paid_at`).
  - `credit_events` (`id`, `user_id`, `event_type`, `order_id`, `amount`, `score_impact`, `created_at`).
  - Đầy đủ Indexes trên `(user_id, status)` và `(due_date, status)`.
- [ ] **Core Business Engine:**
  - `CreditScoreService`: Động cơ tính điểm rủi ro/tín dụng (0-100) phân hạng tài khoản (BRONZE, SILVER, GOLD, PLATINUM).
  - `InstallmentScheduler`: Job chạy ngầm hàng ngày đánh dấu các kỳ quá hạn (`OVERDUE`) và gửi thông báo nhắc nợ.
- [ ] **Hạch toán Sổ cái kép (Ledger):** Bút toán ghi nợ `EntryType.BNPL_DISBURSED` và `EntryType.BNPL_REPAYMENT` đảm bảo `Debit == Credit`.

### 🔵 Phía MarketPlace (Hoàng - 4 ngày):
- [ ] **Migration CSDL:** Thêm cột `paygate_plan` và `credit_token` vào bảng `orders`.
- [ ] **Giao diện UI Checkout Component:**
  - Component chọn gói BNPL (`BNPL_30`, `BNPL_45`, `GTHP_3M`, `GTHP_6M`) tại bước thanh toán.
  - Hiển thị công khai lịch trả hàng tháng, phí dịch vụ & Badge điểm tín dụng người dùng.
- [ ] **Event Publisher & Webhook Consumer:**
  - Publisher bắn sự kiện hoàn tất đơn hàng về `POST /api/v1/credit/events`.
  - Webhook Consumer nhận callback `order.bnpl.confirmed` để đổi trạng thái Order sang `CONFIRMED` và gọi `InventoryFacade.fulfill()`.

---

## 💰 2. FEATURE 02: Instant Settlement For Merchants (Tạm Ứng Doanh Thu Sớm)

### 🟢 Phía GatePay (Vinh - 3 ngày):
- [ ] **3 REST APIs chuẩn Production:**
  - `GET /api/v1/merchants/me/pending-balance`: Tra cứu số dư pending khả dụng & số tiền đang bị đóng băng.
  - `POST /api/v1/merchants/me/payout`: Thực hiện lệnh rút tạm ứng doanh thu sớm.
  - `GET /api/v1/merchants/me/payouts`: Lấy danh sách lịch sử các lần rút tạm ứng (có phân trang).
- [ ] **Bảo mật & Anti-Fraud:**
  - RBAC `@PreAuthorize("hasRole('MERCHANT')")` + Anti-Fraud Payout Velocity Check (giới hạn 3 lần rút/ngày).
- [ ] **1 Bảng CSDL Flyway mới (`V29__create_payouts_table.sql`):**
  - `payouts` (`id`, `merchant_id`, `requested_amount`, `fee_amount`, `net_disbursed`, `bank_account_id`, `status`, `transaction_ref`, `created_at`, `completed_at`).
  - Unique Index trên `transaction_ref`.
- [ ] **Core Settlement Engine:**
  - `SettlementEngine`: Trừ số dư pending nguyên tử với `@Version` Optimistic Locking, tính toán phí tạm ứng ~2%, và giải ngân số tiền ròng vào ví.
- [ ] **Hạch toán Sổ cái kép (Ledger):** Bút toán song song cho `EntryType.PAYOUT` và `EntryType.PAYOUT_FEE`.

### 🔵 Phía MarketPlace (Giảng & Trí v2 - 2 ngày):
- [ ] **Giao diện Merchant Dashboard Component:**
  - Card hiển thị 3 chỉ số: **Số dư đang giữ (Pending)**, **Số tiền tạm đóng băng (On-Hold)**, và **Tỷ lệ phí tạm ứng (2%)**.
  - Modal Form "Tạm Ứng Doanh Thu Sớm" tự động tính số tiền thực nhận (`Net = Requested - 2%`).
  - Bảng dữ liệu phân trang hiển thị Lịch sử rút tiền tạm ứng kèm Badge trạng thái (`COMPLETED`, `PENDING`, `FAILED`).

---

## 🏢 3. FEATURE 03: Merchant Working Capital Loan (Vay Vốn Lưu Động Nhập Hàng)

### 🟢 Phía GatePay (Trí - 4 ngày):
- [ ] **4 REST APIs chuẩn Production:**
  - `POST /api/v1/merchant-loans/request`: Đề xuất hạn mức vay dựa trên doanh thu 3 tháng gần nhất.
  - `POST /api/v1/merchant-loans/{id}/accept`: Xác nhận khoản vay & giải ngân tức thì vào Ví Merchant.
  - `GET /api/v1/merchant-loans/{id}/repayment`: Tra cứu chi tiết tiến trình cấn trừ nợ.
  - `GET /api/v1/merchant-loans/me`: Danh sách các khoản vay hiện có của Merchant.
- [ ] **2 Bảng CSDL Flyway mới (`V30__create_merchant_loans.sql`):**
  - `merchant_loans` (`id`, `merchant_id`, `approved_limit`, `disbursed_amount`, `remaining_principal`, `auto_hold_rate`, `status`, `created_at`).
  - `merchant_loan_repayments` (`id`, `loan_id`, `order_id`, `gross_revenue`, `hold_amount`, `remaining_after`, `created_at`).
- [ ] **Auto-Hold Repayment Engine:**
  - `AutoRepaymentAspect` / Interceptor: Tự động trích `%` doanh thu (vd 15%) từ các đơn hàng mới thu qua GatePay để trừ nợ gốc cho đến khi dư nợ = 0.

### 🔵 Phía MarketPlace (Khoa - 2-3 ngày):
- [ ] **Giao diện Merchant Loan Dashboard:**
  - Card hiển thị Hạn mức vay được duyệt & Tỷ lệ trích doanh thu tự động (`Auto-Hold Rate`).
  - Modal Xác nhận Khoản Vay & Điều khoản giải ngân.
  - Thanh Tiến Trình (Progress Bar) hiển thị tỷ lệ đã trả nợ & Lịch sử khấu trừ từng đơn hàng.
- [ ] **Tích hợp Cảnh Báo Nhập Hàng StockPulse:** Nút **"Vay Nhập Hàng Nhanh"** xuất hiện ngay khi kho hàng phát sinh cảnh báo `StockLowEvent`.

---

## 🔄 4. FEATURE 04: Refund & Installment Cancellation (Hoàn Tiền & Hủy Trả Góp)

### 🟢🔵 Phụ trách chính (Trí v2 - 3 đến 5 ngày):
- [ ] **2 REST APIs chuẩn Production (GatePay):**
  - `POST /api/v1/refunds`: Tạo yêu cầu hoàn tiền toàn phần / một phần.
  - `GET /api/v1/refunds/{ref}`: Tra cứu chi tiết tiến trình hoàn tiền.
- [ ] **Bảo mật & Chống hoàn tiền trùng:**
  - Idempotency Key check, kiểm tra số tiền hoàn không vượt quá số tiền đơn gốc (`sum(refunds) <= transaction.amount`).
- [ ] **1 Bảng CSDL Flyway mới (`V31__create_refunds_table.sql`):**
  - `refunds` (`id`, `transaction_ref`, `order_id`, `user_id`, `merchant_id`, `amount_refunded`, `source_type`, `status`, `reason`, `created_at`).
- [ ] **Core Refund & BNPL Cancellation Engine:**
  - Đơn mua thường: Hoàn tiền về ví khách, thu hồi tiền từ ví Merchant.
  - Đơn mua BNPL: Tự động chuyển các kỳ `installments` chưa đến hạn sang `CANCELLED`, hoàn lại số tiền các kỳ đã đóng về ví khách.
- [ ] **Hạch toán Sổ cái kép (Ledger):** Bút toán `EntryType.REFUND` và `EntryType.MERCHANT_DEBIT`.
- [ ] **Giao diện UI & SAGA Compensation (MarketPlace):**
  - Nút **"Hoàn tiền / Trả hàng"** trên màn hình Chi tiết đơn hàng (điều kiện: Order `DELIVERED` hoặc `PAID`).
  - Modal xác nhận hoàn tiền kèm lý do & lựa chọn hoàn toàn phần / một phần.
  - Đổi trạng thái đơn sang `REFUNDED` & kích hoạt `InventoryFacade.release()` để hoàn trả tồn kho.

---

## 📊 BẢNG TỔNG HỢP DELIVERABLES CHUẨN ENTERPRISE

| Feature | Backend APIs (GatePay) | Database & Schemas (Flyway) | Core Business Engine | Frontend UI Components (MarketPlace) | Check |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **01. BNPL & Score** | 4 APIs (`/checkout`, `/events`, `/score`, `/lines`) | `V28`: 3 Tables (`credit_lines`, `installments`, `credit_events`) | `CreditScoreService` (0-100), `InstallmentScheduler`, Ledger BNPL | Component chọn gói BNPL, cột `orders.paygate_plan`, Webhook Listener | [ ] |
| **02. Instant Settlement** | 3 APIs (`/pending-balance`, `/payout`, `/payouts`) | `V29`: Bảng `payouts` | `SettlementEngine` (Optimistic Lock `@Version`), Ledger PAYOUT | Card Pending Balance, Modal Tạm ứng 2%, Bảng Lịch sử Payout | [ ] |
| **03. Working Capital** | 4 APIs (`/request`, `/accept`, `/repayment`, `/me`) | `V30`: 2 Tables (`merchant_loans`, `merchant_loan_repayments`) | `AutoRepaymentAspect` (Auto-hold % đơn mới), Limit Calculator | Card Hạn mức vay, Modal Giải ngân, Progress Bar trả nợ, Nút Auto-Restock | [ ] |
| **04. Refund Management** | 2 APIs (`POST /refunds`, `GET /{ref}`) | `V31`: Bảng `refunds` | Refund Engine (Normal vs. BNPL Installment Cancellation), Ledger REFUND | Nút Hoàn tiền trên Order Detail, Modal Lý do hoàn, SAGA `InventoryFacade.release()` | [ ] |
