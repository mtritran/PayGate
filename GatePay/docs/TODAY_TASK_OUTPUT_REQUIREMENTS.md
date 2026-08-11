# 🎯 YÊU CẦU OUTPUT CHI TIẾT CHO CÁC TASK TRONG NGÀY

> **Dự án:** Liên kết GatePay & MarketPlace
> **Phạm vi:** Yêu cầu Output rõ ràng bắt buộc phải có trong hôm nay cho toàn bộ 5 Feature (F00 - F04).

Dưới đây là danh sách **các kết quả phải được giao nộp (Output)** trong ngày hôm nay của từng thành viên theo từng Feature tương ứng.

---

## 🔌 FEATURE 00: NỀN TẢNG PAYMENT GATEWAY (Ưu tiên Cao nhất)
*Người phụ trách: Trí (GatePay) + Hoàng (MarketPlace)*

**1. Phía MarketPlace (Hoàng):**
*   **Output 1 (DB):** 1 file Migration thêm 2 cột `gatepay_token` và `gatepay_status` vào bảng `orders`.
*   **Output 2 (Code):** Class `GatePayPaymentProvider` gọi thành công sang API `POST /api/v1/checkout/create` của GatePay (truyền đủ payload, nhận token).
*   **Output 3 (UI):** Màn hình hiển thị QR Code và thông tin chuyển khoản (Bank Transfer) cho khách.
*   **Output 4 (Webhook):** Mở API Endpoint `POST /api/v1/webhooks/gatepay` sẵn sàng nhận dữ liệu.

**2. Phía GatePay (Trí):**
*   **Output 1 (Code):** Bổ sung thành công method `BANK_TRANSFER` vào API Checkout, trả về block dữ liệu ngân hàng + `qrPayload`.
*   **Output 2 (Mock API):** API `POST /api/v1/bank-transfers/receive` nhận callback chuyển khoản, parse được `merchantCode` và `orderId` từ nội dung chuyển khoản.

**3. Phần chung (Trí & Hoàng chốt ngay):**
*   **Output:** Chốt xong mã **API Key** và thuật toán mã hóa **HMAC Signature** cho Webhook.

---

## 💳 FEATURE 01: BNPL & CREDIT SCORE ENGINE
*Người phụ trách: Nhi (GatePay API) + Trí (GatePay DB) + Hoàng (MarketPlace UI)*

**1. Phía GatePay (Trí & Nhi):**
*   **Output 1 (DB - Trí):** File Flyway Migration `V28__create_installments.sql` và `V28__create_credit_lines.sql` đã chạy thành công trên máy local. Khởi tạo các Entity tương ứng (`Installment`, `CreditLine`).
*   **Output 2 (Code - Nhi):** Lên khung API Endpoint `POST /api/v1/credit/checkout`. Xây dựng khung class `CreditScoreService`.
*   **Output 3 (Mock Service):** Tạo base structure cho `cic-service` và `tp-bank-service`.

**2. Phía MarketPlace (Hoàng):**
*   **Output (UI):** Thêm phương thức thanh toán **"Mua trước Trả sau / Trả góp"** vào trang Checkout. Cho phép lưu gói BNPL (`paygate_plan`) vào DB khi user đặt hàng.

---

## 🚚 FEATURE 02: DELIVERY TRACKING
*Người phụ trách: Giảng (MarketPlace Backend + UI)*

**1. Phía MarketPlace (Giảng):**
*   **Output 1 (DB & Entity):** Tạo xong Flyway Migration `V9__create_deliveries_table.sql` và `V10__create_delivery_events_table.sql`. Define các Entity `Delivery` và `DeliveryEvent`.
*   **Output 2 (API):** Lên khung (skeleton) 3 API: tạo delivery, cập nhật trạng thái delivery và xem danh sách delivery theo `orderId`.
*   **Output 3 (UI):** Thiết kế nháp màn hình/Component timeline hiển thị mốc giao hàng trên trang Chi tiết đơn.

---

## ⭐ FEATURE 03: PRODUCT REVIEWS & RATINGS
*Người phụ trách: Khoa (MarketPlace Backend + UI)*

**1. Phía MarketPlace (Khoa):**
*   **Output 1 (DB & Entity):** Tạo Migration `V11__create_reviews_table.sql` và Entity `Review` (chứa `product_id`, `user_id`, `rating`, `comment`).
*   **Output 2 (API):** Lên khung API `GET` và `POST` cho reviews. Cần có đoạn code nháp check điều kiện "Đơn hàng phải DELIVERED mới được review".
*   **Output 3 (UI):** Giao diện khung (Skeleton UI) để hiển thị điểm Rating trung bình và danh sách Comment trên trang chi tiết sản phẩm.

---

## 🔄 FEATURE 04: REFUND & MERCHANT PAYOUT (2 HŨ)
*Người phụ trách: Trí (GatePay) + Trí v2 (MarketPlace)*

**1. Phía GatePay (Trí):**
*   **Output 1 (DB & Entity):** Tạo bộ Migration `V31`: `refunds`, `settlement_buckets`, `payouts` và các Entity tương ứng.
*   **Output 2 (API):** Lên khung API `POST /api/v1/refunds` (nhận trigger hoàn tiền từ MP) và API rút tiền `POST /merchants/me/payout`.
*   **Output 3 (Logic):** Phác thảo Service/Scheduler chạy định kỳ quét Hũ A (`pending_settlement`) chuyển sang Hũ B (`available_settlement`).

**2. Phía MarketPlace (Trí v2):**
*   **Output (UI & API):** Thêm nút **"Hoàn tiền/Trả hàng"** vào giao diện quản lý đơn, và viết đoạn code gọi sang GatePay `POST /refunds`. Khung xử lý trạng thái đơn hàng thành `REFUNDED` nếu GatePay trả về OK.
