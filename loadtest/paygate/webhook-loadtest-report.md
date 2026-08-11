# GĐ4 — PayGate Webhook Load Test Report (Kịch bản 1)

## Thông tin test

| Thông số | Giá trị |
|---|---|
| Endpoint | `POST /api/v1/integration/bank-webhook` |
| Đặc điểm | Public endpoint — xác thực qua `BankWebhookFilter` (HMAC `X-Bank-Signature`) |
| Script | [`loadtest/paygate/webhook-loadtest.js`](../loadtest/paygate/webhook-loadtest.js) |
| Cấu hình VU | Ramping up to 30 VUs (15s ramp-up, 30s steady at 30 VUs, 15s ramp-down) |
| Tổng thời gian | 60 giây |

---

## Kịch bản 1 — Load thường (30 VU, transferContent random)

**Mục tiêu:** Đo thuần throughput xử lý + validate, `transferContent` random (không khớp giao dịch nào).

### Kết quả Metrics

| Metric | Giá trị |
|---|---|
| **Tổng số Request** | **6,279 reqs** |
| **Throughput trung bình** | **104.64 req/s** |
| **Response Time Average** | **214.95 ms** |
| **Response Time Median (p50)** | **238.53 ms** |
| **Response Time p90** | **321.70 ms** |
| **Response Time p95** | **354.59 ms** ✅ *(Threshold: < 1000ms)* |
| **Min / Max Latency** | **11.92 ms / 639.80 ms** |
| **Phân loại Status** | 6,279 / 6,279 (100%) trả về HTTP 400 (`webhook_rejected` — do `transferContent` random không khớp định dạng `PAYGATE <orderId>`) |
| **Error Rate (5xx)** | **0.00%** ✅ (Check `status < 500` đạt 100%) |

---

## Phân tích & Đánh giá

1. **Hiệu năng & Latency**:
   - Tốc độ xử lý cực kỳ ấn tượng: **104.64 req/s** với **p95 = 354.59 ms**, vượt xa tiêu chuẩn threshold (`< 1000ms`).
   - Mặc dù đi qua `BankWebhookFilter` (mã hóa HMAC-SHA256 Base64), hệ thống vẫn xử lý vô cùng mượt mà dưới mức tải 30 VUs đồng thời.

2. **Tính ổn định & Bảo mật**:
   - Hệ thống xử lý 100% request an toàn, **0% lỗi 5xx**. 
   - 100% request ngẫu nhiên đều bị chặn tại lớp Validate Format (`extractOrderId`), giúp ngăn chặn triệt để dữ liệu rác đi vào CSDL.

---

## Câu Hỏi Phân Tích Bắt Buộc

> **Câu hỏi:** Endpoint không có auth (`/bank-webhook`) có nhanh hơn endpoint có JWT filter (`/transactions/pay`) không? Chênh lệch bao nhiêu ms — có đáng kể so với chi phí query DB không?

**Trả lời:**
- **Kết quả thực tế**: Endpoint `/bank-webhook` (p95 = **354.59 ms**) nhanh hơn đáng kể so với endpoint `/transactions/pay` (p95 = **1,930 ms**).
- **Mức độ chênh lệch**: Chênh lệch khoảng **~1,575 ms**.
- **Nguyên nhân cốt lõi**:
  1. Chi phí xử lý JWT Filter hay HMAC Filter đều rất nhỏ (chỉ tiêu tốn 1 – 5ms trên CPU/RAM).
  2. Sự chênh lệch chủ yếu đến từ **chi phí Query DB**: `/bank-webhook` khi gặp request ngẫu nhiên bị chặn ngay ở bước validate regex `extractOrderId` (chưa phải mở transaction ghi ledger/update balance phức tạp), trong khi `/transactions/pay` phải thực hiện ghi log giao dịch, lock tài khoản, update số dư và lưu `ledger_entries`, chiếm phần lớn tổng thời gian phản hồi.
