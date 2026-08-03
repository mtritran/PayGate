# 🔗 SPEC 4 FEATURE LIÊN KẾT GatePay ↔ MarketPlace

> **Mục đích:** Tài liệu duy nhất để cả team (GatePay + MarketPlace) và **AI đọc & hiểu code** — ai đọc xong là biết làm gì, tạo file nào, handler nào, bảo mật ra sao.
> **Nguyên tắc:** GatePay = bên cấp API/nghiệp vụ. MarketPlace = bên tự code client. **Không merge code** — nối qua API + Webhook.

---

## 🧭 Mô hình chung (đọc trước)

```
MarketPlace (bán hàng)                    GatePay (tài chính)
  ┌───────────────┐   POST /api/v1/...      ┌───────────────────┐
  │ frontend      │ ───────────────────────►│ controller         │
  │ (UI gọi API)  │                         │ service (nghiệp vụ)│
  └───────────────┘   Webhook gọi lại       │ repository/entity  │
  │ backend client │ ◄──────────────────────│ (DB)              │
  └───────────────┘                         └───────────────────┘
```
- Xác thực 2 chiều: **API Key** (merchant) cho request từ MarketPlace; **JWT Bearer** cho user khách.
- Mọi API nên **idempotent** bằng `transactionRef`/`orderId` — tránh xử lý trùng khi retry.
- Webhook phải có **chữ ký/xác thực** (không để public trần).

---

## ✅ FEATURE 1 — BNPL: Mua trước Trả sau (Buy Now, Pay Later) ⭐ ƯU TIÊN 1

### Mô tả
Khách mua hàng trên MarketPlace **ngay lập tức**, trả tiền sau (đáo hạn 30/45 ngày) **hoặc trả góp 3–6 tháng**. Người bán được GatePay **thanh toán ngay** phần gốc (trừ phí), không chờ khách trả.

### Ai làm
| Bên | Người | Việc |
|---|---|---|
| GatePay | **Nhi** | spec + API + CreditEngine + installments |
| MarketPlace | **Hoàng** | UI chọn gói + gọi API + lưu plan vào order |

### Trang/Giao diện cần tạo
- **MarketPlace:** trang Checkout thêm bước chọn **"Trả sau" / "Trả góp"** (dropdown: BNPL_30, BNPL_45, GTHP_3M, GTHP_6M) + hiện phí.
- **GatePay:** (admin) trang quản trị duyệt/coi danh sách đơn trả góp (optional).

### API (GatePay cung cấp)
| Method | Endpoint | Body (gửi từ MarketPlace) | Response |
|---|---|---|---|
| POST | `/api/v1/credit/checkout` | `{apiKey, orderId, amount, plan}` | `{approved, token, paymentUrl, fee}` |
| POST | `/api/v1/credit/checkout/confirm` | `{token, otpCode}` | `{status, transactionRef}` |
| GET | `/api/v1/credit/checkout/{token}` | — | `{status, amount, plan}` |

### Handler / Class cần có (GatePay)
- `CreditEngine` — chấm điểm dùng `CreditScoreService` + lịch sử ví.
- `InstallmentService` — tạo kỳ hạn trả.
- `InstallmentRepository` + entity `Installment` (bảng `installments`).
- Controller `CreditCheckoutController` (thuộc package `credit`).

### Dữ liệu
- GatePay: bảng mới `credit_lines` (hạn mức) + `installments` (kỳ trả).
- MarketPlace: thêm cột `paygate_plan` vào bảng `orders`.

### Luồng xử lý (đầy đủ)
```
1. MarketPlace checkout → gọi POST /credit/checkout (apiKey, orderId, amount, plan)
2. GatePay: verify apiKey + merchant ACTIVE → CreditEngine chấm điểm
3. Nếu approved: tạo token + paymentUrl + fee → trả về
4. Khách redirect sang paymentUrl (trang GatePay) → đăng nhập ví → OTP
5. GatePay: trừ phí, trả merchant % gốc, tạo installments
6. GatePay gọi Webhook về MarketPlace: order → CONFIRMED/PAID
7. Khách trả dần từng kỳ vào ví GatePay
```

### Security
- **ApiKey** merchant bắt buộc ở bước 1 (verify `findByApiKey` + `active`).
- **OTP** bắt buộc khi khách xác nhận trả sau (dùng `OtpService`).
- **Rate limit** trên `/credit/checkout` (chống spam duyệt).
- **Fraud check** trước khi duyệt BNPL (gọi `FraudDetectionService`).

### DoD (Definition of Done)
- [ ] Khách chọn gói trả sau → paymentUrl chạy được end-to-end
- [ ] Merchant nhận % gốc ngay (ledger ghi đúng)
- [ ] Installments tạo + khách trả được từng kỳ
- [ ] Webhook cập nhật order MarketPlace thành PAID

---

## ✅ FEATURE 2 — Instant Settlement / Tạm ứng doanh thu

### Mô tả
Doanh thu bán hàng của merchant được giữ ở ví GatePay (pending). Merchant **rút/tạm ứng** phần tiền sớm (trừ phí ~2%), không phải chờ đáo hạn.

### Ai làm
| Bên | Người | Việc |
|---|---|---|
| GatePay | **Vinh** | PayoutService + pending balance + phí + ledger |
| MarketPlace | **Giảng** + **Trí v2** | dashboard pending + nút rút + history |

### Trang/Giao diện
- **MarketPlace:** dashboard merchant thêm card **"Doanh thu đang giữ"** + nút **"Tạm ứng ngay"** + lịch sử payout.
- **GatePay:** (admin) bảng coi payout đã thực hiện.

### API (GatePay)
| Method | Endpoint | Body | Response |
|---|---|---|---|
| GET | `/api/v1/merchants/me/pending-balance` | — | `{available, onHold, feePct}` |
| POST | `/api/v1/merchants/me/payout` | `{amount}` | `{payoutId, amount, fee}` |
| GET | `/api/v1/merchants/me/payouts` | — | `[{payoutId, amount, fee, status}]` |

### Handler / Class (GatePay)
- `PayoutService` + `PayoutRepository` + entity `Payout` (bảng `payouts`).
- Reuse `LedgerEntry` với `EntryType.PAYOUT` khi ghi.

### Luồng
```
1. Merchant mở dashboard → GET pending-balance (available = doanh thu chưa rút)
2. Merchant bấm "Tạm ứng" → POST payout {amount}
3. GatePay: kiểm tra amount <= available → trừ pending, ghi ledger PAYOUT, trừ phí
4. Trả về payoutId; history hiển thị
```

### Security
- **Chỉ merchant sở hữu** tài khoản mới rút được (xác thực bằng token user của merchant đó).
- **Giới hạn số lần/ngày** rút (rate-limit) để chống rút khống.
- Validate `amount > 0` và `<= available`.

### DoD
- [ ] Dashboard hiện pending chính xác
- [ ] Rút thành công → tiền về ví merchant, phí đúng, ledger đúng
- [ ] History payout hiển thị

---

## ✅ FEATURE 3 — Merchant Working-Capital Loan (vay vốn lưu động)

### Mô tả
Người bán vay tiền nhập hàng; **trả dần bằng % doanh thu** thu qua GatePay (kiểu Shopee/Stripe Capital). Hạn mức dựa doanh thu qua gateway.

### Ai làm
| Bên | Người | Việc |
|---|---|---|
| GatePay | **Trí** | MerchantLoanService + auto-hold % + rate |
| MarketPlace | **Khoa** | dashboard vay + gọi `/merchant-loans/request` |

### Trang/Giao diện
- **MarketPlace:** dashboard merchant thêm **"Hạn mức vay"** + nút **"Đi vay"** + lịch trả nợ còn lại.
- **GatePay:** (admin) trang duyệt/coi khoản vay merchant.

### API (GatePay)
| Method | Endpoint | Body | Response |
|---|---|---|---|
| POST | `/api/v1/merchant-loans/request` | `{merchantCode, amount, term}` | `{loanId, limit, rate}` |
| POST | `/api/v1/merchant-loans/{id}/accept` | — | `{disbursed}` |
| GET | `/api/v1/merchant-loans/{id}/repayment` | — | `{paid, remaining}` |

### Handler / Class (GatePay)
- `MerchantLoanService` + `MerchantLoanRepository` + entity `MerchantLoan` (bảng `merchant_loans`).
- `RepaymentScheduler` — mỗi lần merchant nhận tiền → auto-hold % trừ nợ.
- `MerchantLoanRepaymentRepository` (bảng `merchant_loan_repayments`).

### Luồng
```
1. Merchant bấm "Đi vay" → POST /merchant-loans/request
2. GatePay: tính hạn mức từ doanh thu qua gateway (revenue-based)
3. Trả offer {loanId, limit, rate}
4. Merchant accept → disbursed vào ví merchant
5. Mỗi đơn bán thu qua GatePay → auto-hold % doanh thu trừ dần nợ
6. Xem repayment còn lại
```

### Security
- Chỉ merchant có doanh thu qua gateway mới được vay (chống vay rồi bỏ trốn).
- **Cap** % giữ doanh thu (không giữ quá 50%).
- **Fraud/credit check** merchant trước khi duyệt.
- Rate-limit request vay.

### DoD
- [ ] Merchant request → nhận offer
- [ ] Accept → tiền vào ví
- [ ] Auto-hold % khi doanh thu về
- [ ] Lịch trả nợ còn lại hiển thị

---

## ✅ FEATURE 4 — Cross-platform Credit Score & Loyalty

### Mô tả
Kết hợp dữ liệu **mua hàng (MarketPlace)** + **tài chính ví/trả nợ (GatePay)** → **1 điểm tín dụng chung** cho khách. Dùng để ưu đãi, tăng hạn mức BNPL/vay.

### Ai làm
| Bên | Người | Việc |
|---|---|---|
| GatePay | **Vinh** | webhook `/credit/events` + gộp score |
| MarketPlace | **Giảng** + **Trí v2** | gửi event mua/hoàn + hiển thị ưu đãi |

### Trang/Giao diện
- **MarketPlace:** tại checkout hiển thị **"Ưu đãi theo điểm"** (nếu score cao → giảm phí, hạn mức cao).
- **GatePay:** (admin) bảng xem score/event của từng khách.

### API (GatePay)
| Method | Endpoint | Body | Response |
|---|---|---|---|
| POST | `/api/v1/credit/events` | `{customerId, eventType, amount, orderId}` | `{received}` |
| GET | `/api/v1/credit/score/{customerId}` | — | `{score, tier, summary}` |

### Handler / Class (GatePay)
- `CreditScoreService` (đã có, reuse) — nguồn dữ liệu mở rộng.
- `CreditEventRepository` + entity `CreditEvent` (bảng `credit_events`) — lưu sự kiện từ MarketPlace.
- `CreditScoreController` (đã có) — thêm logic gộp.

### Luồng
```
1. MarketPlace: khi mua/hoàn → gửi POST /credit/events {customerId, amount, orderId}
2. GatePay: lưu event; khi cần score → CreditScoreService gộp (ví + trả nợ + mua) → score 0-100
3. MarketPlace hỏi GET /credit/score/{customerId} → hiển thị ưu đãi
4. GatePay dùng score để duyệt BNPL/vay tốt hơn
```

### Security
- **Chỉ MarketPlace hợp lệ** được gửi event (API key).
- Score là **dữ liệu nhạy cảm** — chỉ ADMIN xem được, không public.
- **Idempotent** event (dùng `orderId` tránh gửi trùng).

### DoD
- [ ] MarketPlace gửi event → GatePay nhận + lưu
- [ ] Score gộp đúng (có dữ liệu 2 sàn)
- [ ] Hiển thị ưu đãi theo score tại checkout
- [ ] Score dùng để duyệt BNPL/vay

---

## 🗂️ TỔNG KẾT BẢNG 4 FEATURE

| # | Feature | Mô tả ngắn | PayGate (API) | MarketPlace (client) | Ưu tiên |
|---|---|---|---|---|---|
| 1 | BNPL | Mua trước trả sau/góp | Nhi | Hoàng | ⭐ 1 |
| 2 | Instant Settlement | Rút doanh thu sớm | Vinh | Giảng + Trí v2 | 2 |
| 3 | Working Capital | Vay vốn nhập hàng | Trí | Khoa | 3 |
| 4 | Credit Score | Điểm tín dụng chung | Vinh | Giảng + Trí v2 | 4 |

---

## 🔒 SECURITY CHUNG (áp mọi feature)
- **API Key** merchant cho request MarketPlace → GatePay (xác thực đối tác).
- **JWT Bearer** cho khách (đăng nhập ví).
- **OTP** khi hành động nhạy cảm (xác nhận trả sau, rút tiền, chấp nhận vay).
- **Rate limit** trên endpoint nhạy cảm.
- **Idempotent** bằng `orderId`/`transactionRef` (tránh trùng).
- **Webhook có chữ ký/xác thực**, không public trần.
- **Data sensitive** (credit score) → chỉ ADMIN.

## ⚙️ NOTES CHO AI / NGƯỜI MỚI ĐỌC CODE
- Mọi class nằm ở package `com.training.paygate.credit.*` (mới) hoặc `service/*`, `controller/*`.
- Dùng `ApiResponse.success(...)` cho response (đã có sẵn).
- Migration Flyway: bảng mới dùng **V27 trở lên** (V27 đã tạo `credit_scores`).
- Khi thêm bảng: tạo `V2X__create_*.sql` + entity + repository + service.
- Test: viết giống `CreditScoreServiceTest` (Mockito + AssertJ).
