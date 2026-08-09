# 🔒 Security Model — Mô Hình Bảo Mật

> **Nguồn:** `docs/archive/01-SRS.md`, `FEATURE_00-04`, `03-ARCHITECTURE.md`
> **Cập nhật lần cuối:** 2026-08-09

## 1. Xác Thực Người Dùng (Authentication)

- **JWT Bearer Token** — toàn bộ API (trừ `/auth/**`)
- **Refresh Token Rotation + Blacklist** — AuthServiceImpl
- **OTP** — Bắt buộc khi xác nhận thanh toán BNPL

## 2. Phân Quyền (Authorization)

| Role | Quyền |
|---|---|
| `USER` | `/accounts/**`, `/transactions/**` (trừ refund) |
| `ADMIN` | `/admin/**`, refund, ledger verify, merchant management |
| `MERCHANT` | Nhận webhook, xem tài khoản merchant của mình |

## 3. Bảo Mật API Merchant (S2S Security)

### Tiêu Chuẩn Hiện Tại (API Key)
- `apiKey` gửi trong Body của request khi MarketPlace gọi GatePay
- GatePay verify `findByApiKey` + `ACTIVE` status
- API Key **không bao giờ expose** trong response log thông thường

### Tiêu Chuẩn Đề Xuất (HMAC Signature)
```
Merchant gửi:
  Header: x-client-id: MERCHANT_123
  Header: x-timestamp: 1691555555
  Header: x-signature: HMAC_SHA256(JSON_BODY + timestamp, SECRET_KEY)
  Body: { JSON dữ liệu rõ ràng }

GatePay nhận:
  1. Lấy Secret Key theo client-id từ DB
  2. Tự tính lại HMAC với Body + Timestamp
  3. So sánh Signature → Khớp = Hợp lệ
  4. Kiểm tra Timestamp < 5 phút → Chống Replay Attack
```

## 4. Idempotency (Chống Thanh Toán Trùng)

| Key Pattern | Mục đích |
|---|---|
| `idempotencyKey` (UUID từ client) | Giao dịch thông thường |
| `DISBURSE-{loanRef}` | Giải ngân BNPL |
| `REPAY-{loanRef}-{period}` | Trả nợ kỳ BNPL |
| `PAYGATE_REFUND:ORDER:{id}:FULL` | Hoàn tiền đơn hàng |

## 5. Fraud Detection (Real-time)

`FraudDetectionService` đánh giá mỗi giao dịch theo điểm 0-100:
- Tần suất giao dịch cao bất thường (Burst)
- Giao dịch số tiền lớn
- Giao dịch lúc đêm khuya
- Chuyển tiền lặp lại cùng đích
- Vượt hạn mức giao dịch ngày

**Hành động:**
- `ALLOW` → Tiếp tục bình thường
- `FLAG` → Ghi log cảnh báo, vẫn cho qua
- `BLOCK_TEMPORARY` → Từ chối giao dịch, trả lỗi

## 6. Webhook Security

- Webhook endpoint tại MarketPlace **không public trần** (không có xác thực = rủi ro cao)
- Mỗi webhook delivery có `transactionRef` → Idempotent xử lý
- Retry 5 lần với exponential backoff: `1p → 5p → 30p → 2h`

## 7. Database Security

- Số dư tài khoản **không bao giờ âm** — kiểm tra trước khi debit
- Isolation `SERIALIZABLE` + Pessimistic Lock theo thứ tự id → không deadlock
- Bất biến sổ cái: `SUM(DEBIT) = SUM(CREDIT)` mọi lúc

## Liên kết

- [[System Overview]] — Kiến trúc tổng thể
- [[Feature 00 - Payment Gateway]] — Merchant API Key
- [[Services Overview]] — FraudDetectionService
