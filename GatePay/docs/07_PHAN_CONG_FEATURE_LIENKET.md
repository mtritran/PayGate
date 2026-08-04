---
tags:
  - training
  - project
  - paygate
  - marketplace
  - phan-cong
  - lien-ket
created: 2026-08-03
updated: 2026-08-03
---

# 👥 Kế hoạch buổi chiều + Phân công chi tiết Feature Liên kết

> **Chủ đề:** Phân chia chi tiết các Feature liên kết giữa GatePay (Ví/Credit/Payment) ↔ MarketPlace (Đơn hàng/Kho/Doanh nghiệp).
> **Tài liệu chi tiết từng Feature đã được tách riêng thành 5 File độc lập:**

---

## 📂 DANH SÁCH 5 FILE TÀI LIỆU FEATURE RIÊNG BỆT

0. 🔌 **[FEATURE_00_PAYMENT_GATEWAY.md](file:///Users/thanvinh/Documents/antigravity/agitated-tesla/GatePay/docs/FEATURE_00_PAYMENT_GATEWAY.md)** — ⚠️ **NỀN TẢNG — LÀM TRƯỚC HẾT**
   - *Tên tính năng:* Gắn cổng thanh toán thật GatePay lên MarketPlace (thay `simulatePaymentGateway`)
   - *Phụ trách:* **Trí** (GatePay - 3 ngày) & **Hoàng** (MarketPlace - 2-3 ngày) · *Review: Vinh*

1. 💳 **[FEATURE_01_BNPL_CREDIT_SCORE.md](file:///Users/thanvinh/Documents/antigravity/agitated-tesla/GatePay/docs/FEATURE_01_BNPL_CREDIT_SCORE.md)**  
   - *Tên tính năng:* Mua trước Trả sau 0% & Động cơ Chấm điểm Tín dụng 0-100  
   - *Phụ trách:* **Nhi** (GatePay - 5 ngày) & **Hoàng** (MarketPlace - 4 ngày) · *Review: Vinh*

2. 🚚 **[FEATURE_02_DELIVERY_TRACKING.md](file:///Users/thanvinh/Documents/antigravity/agitated-tesla/GatePay/docs/FEATURE_02_DELIVERY_TRACKING.md)**  
   - *Tên tính năng:* Theo dõi Giao hàng (Delivery Tracking) cho khách & admin  
   - *Phụ trách:* **Giảng** (MarketPlace - Backend + UI - 3 ngày) · *Review: Vinh*

3. ⭐ **[FEATURE_03_PRODUCT_REVIEWS.md](file:///Users/thanvinh/Documents/antigravity/agitated-tesla/GatePay/docs/FEATURE_03_PRODUCT_REVIEWS.md)**  
   - *Tên tính năng:* Đánh giá Sản phẩm (Reviews & Ratings)  
   - *Phụ trách:* **Khoa** (MarketPlace - Backend + UI - 3 ngày) · *Review: Vinh*

4. 🔄 **[FEATURE_04_REFUND_MANAGEMENT.md](file:///Users/thanvinh/Documents/antigravity/agitated-tesla/GatePay/docs/FEATURE_04_REFUND_MANAGEMENT.md)**  
   - *Tên tính năng:* Xử Lý Hoàn Tiền Giao Dịch & Hủy Kỳ Trả Góp BNPL + **Rút tiền Merchant (2 hũ)**  
   - *Phụ trách:* **Trí** (GatePay - 3-5 ngày) & **Trí v2** (MarketPlace) · *Review: Vinh*

---

## 🧭 NGUYÊN TẮC THỰC THI (STRICT RULES)
- **GatePay = Cấp API/Nghiệp vụ** · **MarketPlace = Xây dựng UI/Client**.
- **Không merge code.** Nối bất đồng bộ qua **REST API + Webhook + SAGA**.
- **1 người 1 mảng** ➔ Không đè file nhau, chống Git Conflict.
- Tuân thủ coding standard `CODING_STANDARDS/AGENTS.md`.

### 🎯 VAI TRÒ VINH (theo bản kế hoạch PM)
- **Vinh = PM + review tất cả** các feature (F00..F04) — **không code**.
- **GatePay (GP):** Trí, Nhi code · **MarketPlace:** Hoàng, Giảng, Khoa, Trí v2 code.
- Phân công theo bảng:
  - F00 Payment Gateway: **Trí** (GP) + **Hoàng** (MP) · review Vinh
  - F01 BNPL + Credit Score: **Nhi** (GP) + **Hoàng** (MP) · review Vinh
  - F02 Delivery Tracking: **Giảng** (MP) · review Vinh
  - F03 Product Reviews: **Khoa** (MP) · review Vinh
  - F04 Refund + Rút tiền 2 hũ: **Trí** (GP) + **Trí v2** (MP) · review Vinh

---

## 📅 LỘ TRÌNH MILESTONE DỰ KIẾN

```
MILESTONE 0 (TRƯỚC — Tuần 1 ngày 1-3)
  └── Feature 0: Payment Gateway (Trí + Hoàng) ➔ ⚠️ NỀN TẢNG, LÀM TRƯỚC · Review: Vinh

MILESTONE 1 (Tuần 1 - Tuần 2)
  ├── Feature 0: Payment Gateway (tiếp) ➔ phải XONG mới làm các feature sau
  ├── 1. Feature 1: BNPL + Credit Score (Nhi + Hoàng) ➔ [⭐ ƯU TIÊN CAO NHẤT] · Review: Vinh
  ├── 2. Feature 4: Refund + Rút tiền 2 hũ (Trí + Trí v2) · Review: Vinh
  └── 3. Feature 2: Delivery Tracking (Giảng) · Review: Vinh

MILESTONE 2 (Tuần 3 - Tuần 4)
  └── 4. Feature 3: Product Reviews & Ratings (Khoa) · Review: Vinh
```