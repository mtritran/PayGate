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

# 👥 Kế hoạch buổi chiều + Phân công chi tiết 4 Feature Liên kết

> **Chủ đề:** Phân chia chi tiết 4 Feature liên kết giữa GatePay (Ví/Credit/Payment) ↔ MarketPlace (Đơn hàng/Kho/Doanh nghiệp).
> **Tài liệu chi tiết từng Feature đã được tách riêng thành 4 File độc lập:**

---

## 📂 DANH SÁCH 4 FILE TÀI LIỆU FEATURE RIÊNG BỆT

1. 💳 **[FEATURE_01_BNPL_CREDIT_SCORE.md](file:///Users/thanvinh/Documents/antigravity/agitated-tesla/GatePay/docs/FEATURE_01_BNPL_CREDIT_SCORE.md)**  
   - *Tên tính năng:* Mua trước Trả sau 0% & Động cơ Chấm điểm Tín dụng 0-100  
   - *Phụ trách:* **Nhi** (GatePay - 5 ngày) & **Hoàng** (MarketPlace - 4 ngày)

2. 💰 **[FEATURE_02_INSTANT_SETTLEMENT.md](file:///Users/thanvinh/Documents/antigravity/agitated-tesla/GatePay/docs/FEATURE_02_INSTANT_SETTLEMENT.md)**  
   - *Tên tính năng:* Quyết toán Tạm ứng Doanh thu Sớm cho Nhà bán  
   - *Phụ trách:* **Vinh** (GatePay - 3 ngày) & **Giảng + Trí v2** (MarketPlace - 2 ngày)

3. 🏢 **[FEATURE_03_WORKING_CAPITAL.md](file:///Users/thanvinh/Documents/antigravity/agitated-tesla/GatePay/docs/FEATURE_03_WORKING_CAPITAL.md)**  
   - *Tên tính năng:* Vay Vốn Lưu Động Nhập Hàng Cho Người Bán  
   - *Phụ trách:* **Trí** (GatePay - 4 ngày) & **Khoa** (MarketPlace - 2-3 ngày)

4. 🔄 **[FEATURE_04_REFUND_MANAGEMENT.md](file:///Users/thanvinh/Documents/antigravity/agitated-tesla/GatePay/docs/FEATURE_04_REFUND_MANAGEMENT.md)**  
   - *Tên tính năng:* Xử Lý Hoàn Tiền Giao Dịch & Hủy Kỳ Trả Góp BNPL  
   - *Phụ trách:* **Trí v2** (GatePay & MarketPlace - 3-5 ngày)

---

## 🧭 NGUYÊN TẮC THỰC THI (STRICT RULES)
- **GatePay = Cấp API/Nghiệp vụ** · **MarketPlace = Xây dựng UI/Client**.
- **Không merge code.** Nối bất đồng bộ qua **REST API + Webhook + SAGA**.
- **1 người 1 mảng** ➔ Không đè file nhau, chống Git Conflict.
- Tuân thủ coding standard `CODING_STANDARDS/AGENTS.md`.

---

## 📅 LỘ TRÌNH MILESTONE DỰ KIẾN

```
MILESTONE 1 (Tuần 1 - Tuần 2)
  ├── 1. Feature 1: BNPL + Credit Score (Nhi + Hoàng) ➔ [⭐ ƯU TIÊN CAO NHẤT]
  ├── 2. Feature 2: Instant Settlement (Vinh + Giảng/Trí v2)
  └── 3. Feature 4: Refund / Hoàn Tiền (Trí v2)

MILESTONE 2 (Tuần 3 - Tuần 4)
  └── 4. Feature 3: Working Capital (Trí + Khoa)
```