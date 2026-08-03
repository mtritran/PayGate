# 🎯 OUTPUT DELIVERABLES MATRIX (BẢNG YÊU CẦU KẾT QUẢ ĐẦU RA CHO 4 FEATURE)

> **Mục đích:** Quy định rõ ràng **Kết quả sản phẩm mong muốn (Definition of Done - DoD)** cho từng Feature và từng Lập trình viên để khi nghiệm thu công việc có thước đo chính xác 100%.

---

## 💳 1. FEATURE 01: BNPL & Credit Score Engine (Mua Trước Trả Sau & Điểm Tín Dụng)

### 🟢 Đầu ra Mong muốn phía GatePay (Nhi):
- [ ] **2 REST APIs chuẩn:**
  - `POST /api/v1/credit/checkout`: Nhận đơn mua BNPL ➔ Trả link thanh toán + bảng phí.
  - `POST /api/v1/credit/events`: Nhận sự kiện mua/hoàn tiền từ MarketPlace để cập nhật điểm tín dụng.
- [ ] **3 Bảng CSDL Flyway mới:** `credit_lines` (hạn mức), `installments` (các kỳ trả góp), `credit_events` (lịch sử tín dụng).
- [ ] **1 Engine Nghiệp vụ:** `CreditScoreService` chấm điểm từ 0-100 dựa trên giao dịch ví & lịch sử mua hàng.
- [ ] **1 Hạch toán Sổ cái kép:** Bút toán Ledger ghi nhận khoản vay trả góp `EntryType.BNPL`.
- [ ] **Postman Collection & Test Pass:** Bộ API test mẫu thử nghiệm thành công toàn bộ luồng duyệt BNPL.

### 🔵 Đầu ra Mong muốn phía MarketPlace (Hoàng):
- [ ] **1 Giao diện UI Checkout:** Dropdown / Component chọn gói trả góp (`BNPL_30/45`, `GTHP_3M/6M`) kèm hiển thị phí & điểm tín dụng.
- [ ] **1 Cột CSDL mới:** Thêm cột `paygate_plan` vào bảng `orders`.
- [ ] **1 Webhook Listener:** Đổi trạng thái đơn hàng sang `PAID` khi nhận thông báo thanh toán BNPL thành công từ GatePay.

---

## 💰 2. FEATURE 02: Instant Settlement For Merchants (Tạm Ứng Doanh Thu Sớm)

### 🟢 Đầu ra Mong muốn phía GatePay (Vinh):
- [ ] **2 REST APIs chuẩn:**
  - `GET /api/v1/merchants/me/pending-balance`: Kiểm tra số dư pending khả dụng.
  - `POST /api/v1/merchants/me/payout`: Thực hiện lệnh rút tạm ứng sớm.
- [ ] **1 Bảng CSDL Flyway mới:** Bảng `payouts` lưu vết các giao dịch rút tiền.
- [ ] **1 Hạch toán Sổ cái kép:** Bút toán Ledger `EntryType.PAYOUT` trừ tiền `pending`, thu phí ~2%, và nạp tiền ròng vào ví.

### 🔵 Đầu ra Mong muốn phía MarketPlace (Giảng & Trí v2):
- [ ] **1 Giao diện Dashboard Merchant:** Card hiển thị **"Doanh thu đang giữ"** + Nút bấm **"Tạm ứng ngay"**.
- [ ] **1 Bảng Lịch sử Giao dịch:** Hiển thị danh sách các lần rút tạm ứng và trạng thái giải ngân.

---

## 🏢 3. FEATURE 03: Merchant Working Capital Loan (Vay Vốn Lưu Động Nhập Hàng)

### 🟢 Đầu ra Mong muốn phía GatePay (Trí):
- [ ] **3 REST APIs chuẩn:**
  - `POST /api/v1/merchant-loans/request`: Đề nghị hạn mức vay nhập hàng.
  - `POST /api/v1/merchant-loans/{id}/accept`: Xác nhận khoản vay & giải ngân.
  - `GET /api/v1/merchant-loans/{id}/repayment`: Tra cứu dư nợ & lịch sử trả nợ.
- [ ] **2 Bảng CSDL Flyway mới:** `merchant_loans` và `merchant_loan_repayments`.
- [ ] **1 Scheduler Tự động:** `RepaymentScheduler` tự động trích `%` doanh thu (Auto-Hold <= 50%) từ các đơn hàng mới để trừ nợ dần.

### 🔵 Đầu ra Mong muốn phía MarketPlace (Khoa):
- [ ] **1 Giao diện Dashboard Merchant:** Card **"Hạn mức vay nhập hàng"** + Nút **"Đi vay"**.
- [ ] **1 Màn hình Tra cứu Khoản Vay:** Hiển thị tiến trình cấn trừ nợ tự động theo từng đơn hàng.

---

## 🔄 4. FEATURE 04: Refund & Installment Cancellation (Hoàn Tiền & Hủy Trả Góp)

### 🟢🔵 Đầu ra Mong muốn phía GatePay & MarketPlace (Trí v2):
- [ ] **1 REST API chuẩn (GatePay):** `POST /api/v1/refunds` xử lý hoàn tiền toàn phần/một phần.
- [ ] **1 Bảng CSDL Flyway mới (GatePay):** Bảng `refunds`.
- [ ] **1 Logic Hủy Trả Góp BNPL (GatePay):** Tự động chuyển trạng thái các kỳ `installments` chưa đến hạn sang `CANCELLED` và hoàn tiền các kỳ đã đóng.
- [ ] **1 Hạch toán Sổ cái kép (GatePay):** Bút toán Ledger `EntryType.REFUND` thu hồi tiền từ Ví Merchant.
- [ ] **1 Nút Thao Tác UI (MarketPlace):** Nút **"Hoàn tiền"** trên chi tiết đơn hàng + Tự động cập nhật trạng thái đơn sang `REFUNDED`.

---

## 📊 BẢNG TỔNG HỢP OUTPUT CHÍNH (QUY CHUẨN NGHIỆM THU)

| Feature | GatePay Output (Backend/APIs) | MarketPlace Output (UI/Client) | Mức độ Hoàn thành |
| :--- | :--- | :--- | :--- |
| **01. BNPL & Score** | 2 APIs, 3 Tables, `CreditScoreService`, Ledger BNPL | UI chọn gói BNPL, cột `orders.paygate_plan`, Webhook Listener | [ ] 0% |
| **02. Instant Settlement** | 2 APIs, Bảng `payouts`, Ledger `PAYOUT` | Card "Doanh thu đang giữ" + Nút Tạm ứng, Bảng Lịch sử | [ ] 0% |
| **03. Working Capital** | 3 APIs, 2 Tables, `RepaymentScheduler` (Auto-hold) | Card "Hạn mức vay" + Nút Đi vay, Tra cứu nợ | [ ] 0% |
| **04. Refund Management** | 1 API, Bảng `refunds`, Hủy kỳ `installments`, Ledger `REFUND` | Nút "Hoàn tiền" trên Chi tiết đơn hàng | [ ] 0% |
