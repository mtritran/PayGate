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

> **Buổi họp chiều ngày 03/08/2026.**
> Chủ đề: bàn về các feature mới liên kết GatePay ↔ MarketPlace, phân công việc chi tiết + thời gian dự kiến.

---

## 🕐 1. Lịch trình buổi chiều (gợi ý ~1h30)

| Giờ | Nội dung | Người dẫn |
|---|---|---|
| 14:00 – 14:15 | Trình bày tổng quan 4 feature (mục tiêu, lợi ích) | Leader (Vinh) |
| 14:15 – 14:35 | Chốt **BNPL** (ưu tiên 1): spec + chia việc Nhi/Hoàng | Nhi |
| 14:35 – 14:50 | Chốt **Instant Settlement**: Vinh + Giảng/Trí v2 | Vinh |
| 14:50 – 15:05 | Chốt **Working Capital**: Trí + Khoa | Trí |
| 15:05 – 15:20 | Chốt **Credit Score**: Vinh + Giảng/Trí v2 | Vinh |
| 15:20 – 15:35 | Thời gian dự kiến, thứ tự, review chéo | Leader |
| 15:35 – 16:00 | Thống nhất milestone + ai làm gì trước | Cả team |

---

## 🧭 2. NGUYÊN TẮC CHUNG (thống nhất từ đầu)
- **GatePay = cấp API/nghiệp vụ** · **MarketPlace = tự code client/UI**.
- **Không merge code.** Nối qua API + Webhook.
- **1 người 1 mảng** → không đè file nhau → chống conflict.
- Dùng chuẩn `CODING_STANDARDS/AGENTS.md` (cả 2 team).
- CI tự chạy (`GatePay/.github/workflows/ci.yml`).

---

## ⭐ 3. FEATURE 1 — BNPL: Mua trước Trả sau (ƯU TIÊN CAO NHẤT)

### Ai làm & handle gì
| Người | Bên | Cần Handle chính | Thời gian dự kiến |
|---|---|---|---|
| **Nhi** | GatePay | API `/credit/checkout` + `CreditEngine` + entity `Installment`/`credit_lines` + OTP + webhook + ledger | **4 ngày** |
| **Hoàng** | MarketPlace | UI checkout chọn gói trả sau + call API + lưu `paygate_plan` + redirect | **3 ngày** |

### Cần handle cụ thể (Nhi)
- [ ] `POST /api/v1/credit/checkout` — nhận apiKey/orderId/amount/plan → trả approved/token/paymentUrl/fee
- [ ] `CreditEngine` chấm điểm (dùng `CreditScoreService` có sẵn)
- [ ] Entity `Installment` + migration `V28__create_installments`
- [ ] Bảng `credit_lines` (hạn mức)
- [ ] OTP khi xác nhận + Webhook về MarketPlace
- [ ] Ledger ghi phí + trả merchant % gốc
- [ ] Test

### Cần handle (Hoàng)
- [ ] Dropdown chọn plan (BNPL_30/45, GTHP_3M/6M) + hiện phí
- [ ] Call API + redirect paymentUrl
- [ ] Lưu `paygate_plan` vào bảng `orders`
- [ ] Xử lý webhook → order PAID

### Thời gian đề nghị: **Nhi 4 ngày · Hoàng 3 ngày (song song) → Total ~1 tuần**

---

## 🟢 4. FEATURE 2 — Instant Settlement (Rút doanh thu sớm)

### Ai làm: handle gì
| Người | Bên | Cần Handle chính | Thời gian |
|---|---|---|---|
| **Vinh** | Gate | `PayoutService` + entity `Payout` + ledger PAYOUT + API pending/payout | **3 ngày** |
| **Giảng** | MarketPlace | UI dashboard pending + nút "Tạm ứng" | **2 ngày** |
| **Trí v2** | MarketPlace | Call payout API + history | **2 ngày** |

### Cần handle (Vinh)
- [ ] `GET /merchant/me/pending-balance`, `POST /merchant/me/payout`
- [ ] Entity `Payout` + bảng `payouts`
- [ ] Ledger `EntryType.PAYOUT` (trừ phí ~2%)
- [ ] Giới hạn số lần rút/ngày (rate-limit)

### Cần handle (Giảng + Trí v2)
- [ ] Card "Doanh thu đang giữ" + nút "Tạm ứng"
- [ ] Hiển thị lịch sử payout

### Thời gian đề xuất: **Vinh 3 ngày · Giảng+Trí v2 2 ngày** → ~3-4 ngày

---

## 🔵 5. FEATURE 3 — Working Capital (Vay vốn người bán)

### Ai làm: handle gì
| Người | Bên | Cần Handle chính | Thời gian |
|---|---|---|---|
| **Trí** | Gate | `MerchantLoanService` + entity + `RepaymentScheduler` + API | **4 ngày** |
| **Khoa** | MarketPlace | Dashboard "Hạn mức vay" + nút "Đi vay" | **2-3 ngày** |

### Cần xử lý (Trí)
- [ ] `MerchantLoan`, `MerchantLoanRepository`, bảng `merchant_loans` + `merchant_loan_repayments`
- [ ] `POST /merchant-loans/request`, `POST /{id}/accept`, `GET /{id}/repayment`
- [ ] `RepaymentScheduler` — auto-hold % trừ nợ mỗi khi doanh thu về
- [ ] Cap % giữ (≤50%) + credit/fraud check merchant

### Cần xử lý (Khoa)
- [ ] Card "Hạn mức vay" + nút "Đi vay"
- [ ] Call request/accept + hiện lịch trả nợ

### Thời gian đề xuất: **Trí 4 ngày · Khoa 2-3 ngày** (làm SAU BNPL)

---

## 🟡 6. FEATURE 4 — Credit Score chung

### Ai làm: handle gì
| Người | Bên | Cần Handle chính | Thời gian |
|---|---|---|---|
| **Vinh** | GatePay | Webhook `/credit/events` + gộp score | **2 ngày** |
| **Giảng + Trí v2** | MarketPlace | Gửi event mua/hoàn + hiển thị ưu đãi | **1-3 ngày** |

### Cần xử lý (Vinh)
- [ ] `POST /api/v1/credit/events` — nhận event
- [ ] Entity `CreditEvent` + bảng `credit_events`
- [ ] Mở rộng `CreditScoreService` (gộp dữ liệu 2 sàn)

### Cần xử lý (Giảng/Trí v2)
- [ ] Gửi event khi mua/hoàn
- [ ] Hiển thị ưu đãi theo score tại checkout

### Thời gian đề xuất: **2-3 ngày** (làm cuối, cần dữ liệu)

---

## 🧭 7. TỔNG THỜI GIAN & THỨ TỰ

Order LÀM (theo milestone):
1. **BNPL** (Nhi + Hoàng) — 1 tuần ← ⭐ BẮT ĐẦU ngay
2. **Instant Settlement** (Vinh + Giảng/Trí v2) — 3-4 ngày, song song
3. **Credit Score** (Vinh + Giảng/Trí v2) — 2-3 ngày sau Instant
4. **Working Capital** (Trí + Khoa) — sau BNPL (cần doanh thu thật)

Tổng milestone gợi ý:
- **Milestone 1 (Tuần 1-2):** BNPL + Instant Settlement
- **Milestone 2 (Tuần 3-4):** Credit Score + Working Capital

---

## 📸 8. VIỆC CẦN LÀM CHIỀU NAY (tóm tắt để bàn)
1. Chốt **4 feature** đúng hay thiếu/sửa.
2. Chốt **ai code phần nào** (bảng trên).
3. Chốt **thứ tự + thời gian dự kiến**.
4. Chốt **ai review chéo** (đảm bảo 2 bên khớp). *Gợi ý: Nhi ↔ Hoàng, Vinh ↔ Giảng/Trí v2, Trí ↔ Khoa.*
5. Chốt **branch + cách phối** (mỗi người 1 mảng, git flow).

---

> **Ghi chú:** Thời gian dự kiến là ước lượng sơ bộ — team có thể điều chỉnh sau khi thấy độ phức tạp thực tế từ spec.