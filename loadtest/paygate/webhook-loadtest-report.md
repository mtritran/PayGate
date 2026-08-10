# GĐ4 — PayGate Webhook Load Test Report (Kịch bản 1)

## Thông tin test

| Thông số | Giá trị |
|---|---|
| Endpoint | `POST /api/v1/integration/bank-webhook` |
| Đặc điểm | Public endpoint — **không cần auth** |
| Script | `loadtest/paygate/webhook-loadtest.js` |
| Cấu hình VU | Ramping up to 30 VUs (15s ramp-up, 30s steady at 30 VUs, 15s ramp-down) |
| Tổng thời gian | 60 giây |

---

## Kịch bản 1 — Load thường (30 VU, transferContent random)

**Mục tiêu:** Đo thuần throughput xử lý + validate, `transferContent` random (không khớp giao dịch nào).

### Kết quả Metrics

| Metric | Giá trị |
|---|---|
| **Tổng số Request** | 251 reqs |
| **Throughput trung bình** | **4.18 req/s** |
| **Response Time Average** | 5.69s |
| **Response Time Median (p50)** | 6.31s |
| **Response Time p90** | 7.50s |
| **Response Time p95** | **7.81s** ❌ *(Threshold: < 1.0s)* |
| **Min / Max Latency** | 352.44ms / 9.23s |
| **Phân loại Status** | 251/251 (100%) trả về 4xx (400 Bad Request — do không tìm thấy session) |
| **Error Rate (5xx)** | **0.00%** ✅ |

---

## Phân tích & Đánh giá

1. **Hiệu năng & Latency**:
   - Mặc dù đây là public endpoint không qua Filter Auth / JWT Validation, latency ở mức tải 30 VUs khá cao (**p95 = 7.81s**, median = 6.31s).
   - Nguyên nhân chính: Mọi request đều đi qua `@Transactional` trong `BankIntegrationService.processBankWebhook()`, thực hiện tới 4 câu query liên tiếp để tìm `CheckoutSession` và tự động `INSERT` tạo mới session on-the-fly khi không thấy. Việc này làm cạn kiệt connection pool (HikariCP) và gây tranh chấp lock trong DB khi có 30 request đồng thời.

2. **Tính ổn định**:
   - Hệ thống xử lý 100% request an toàn, 0% lỗi server (5xx). Cả 251 request đều được validate và trả về `400 Bad Request` hợp lệ.

---

## Câu Hỏi Phân Tích Bắt Buộc

> **Câu hỏi:** Endpoint không có auth (`/bank-webhook`) có nhanh hơn endpoint có JWT filter (`/transactions/pay`) không? Chênh lệch bao nhiêu ms — có đáng kể so với chi phí query DB không?

**Trả lời:**
- **Kết quả thực tế:** Endpoint không có auth (`/bank-webhook`, p95 = **7,810ms**) **chậm hơn 5,880ms** so với endpoint có auth (`/transactions/pay`, p95 = **1,930ms**).
- **Mức độ chênh lệch:** Chi phí xác thực JWT Token trong Spring Security Filter Chain chỉ tiêu tốn khoảng **1 – 5ms** trên CPU/RAM (giải mã HMAC/RSA signature).
- **So với chi phí Query DB:** Chi phí JWT Filter là **hoàn toàn không đáng kể** khi so với chi phí thao tác Database. Chi phí DB (4 câu SQL SELECT fallback, mở `@Transactional` context, tự động `INSERT` session ngầm) kéo dài thời gian phản hồi thêm hàng nghìn ms do cạn kiệt HikariCP connection pool và tranh chấp lock.
