# BÁO CÁO TỔNG KẾT LOAD TEST GĐ1–GĐ4

**Ngày:** 12/08/2026

**Môi trường:** Local Windows, k6 v2.1.0; PostgreSQL 16, Redis 7, RabbitMQ 3

**PayGate:** `develop` — `cab84ca`

## 1. So sánh bốn endpoint đại diện

| Giai đoạn | Endpoint | Kiểu tải | p95 | Lỗi | Kết luận |
|---|---|---:|---:|---:|---|
| GĐ1 | `GET /products` | 20 VUs | **19,58 ms** | 0% | Đọc đơn giản — PASS |
| GĐ2 | `POST /orders` | 10 VUs | **158,59 ms** | 0% | Ghi có transaction — PASS |
| GĐ3 | `POST /transactions/pay` | 10 request đồng thời, cùng key | **337,57 ms** | 0% 5xx | Chỉ tạo 1 transaction — PASS dữ liệu |
| GĐ4 | `POST /bank-webhook` | 50 VUs, validation | **101,74 ms** | 0% | 26.129/26.129 phản hồi đúng — PASS |

> Các profile tải khác nhau nên bảng dùng để so sánh định hướng, không dùng để quy toàn bộ chênh lệch cho JWT hay database.

## 2. Kết luận GĐ3

- 10 request cùng user và cùng `idempotencyKey` chỉ tạo **1 transaction**, số dư chỉ trừ **1 lần**, ledger cân bằng.
- Khi scale 50/100 request, dữ liệu vẫn đúng nhưng có **6/11 HTTP 5xx** do xung đột `SQLSTATE 40001` chưa đi qua retry phù hợp.
- Kết luận: **idempotency PASS về dữ liệu; API reliability chưa đạt ở concurrency cao**.

**Idempotency key đúng nghĩa là gì?** Client sinh key một lần cho một ý định thanh toán và tái sử dụng khi retry. Server lưu key bằng unique constraint, kiểm tra trước mutation, rồi tạo transaction và ghi sổ trong cùng transaction DB. Request thua race phải đọc lại kết quả đã commit, không được charge lần nữa.

## 3. Kết luận GĐ4

- Endpoint không dùng JWT nhưng có **HMAC `BankWebhookFilter`**, vì vậy không phải public hoàn toàn.
- Validation ổn định đến 100 VUs; tại 200 VUs có **240 connection errors**.
- Webhook amount giả bị từ chối **100%**: 0 request được chấp nhận, không có mutation.
- Settlement thật đạt 30/30 và 50/50; tại 50 VUs p95 là **941,35 ms**, gần ngưỡng 1 giây.

**Không có JWT có nhanh hơn không?** Trong phép đo, GĐ4 validation p95 **101,74 ms**, thấp hơn GĐ3 có JWT **235,83 ms**. Tuy nhiên không thể kết luận 235,83 ms là chi phí JWT vì endpoint và profile tải khác nhau. Ngay trong GĐ4, validation 50 VUs là 101,74 ms còn settlement 50 VUs là 941,35 ms; chênh **839,61 ms** cho thấy DB, lock và business writes ảnh hưởng lớn hơn auth filter.

## 4. Nếu chỉ tối ưu một chỗ

Tôi chọn `POST /transactions/pay` của GĐ3: đây là đường tiền quan trọng nhưng scale test còn trả 5xx dù dữ liệu không double-charge. Cần đưa overload mà controller gọi qua cùng retry boundary, để request xung đột trả lại transaction đã commit thay vì lỗi server. Ưu tiên này cải thiện độ tin cậy tài chính, quan trọng hơn chỉ giảm latency của endpoint đã đúng.

## 5. Bằng chứng

- [Báo cáo GĐ3](./gd3/report-gd3.md)
- [Báo cáo GĐ4](./gd4/report-gd4.md)

Hai báo cáo GĐ3/GĐ4 đã nhúng trực tiếp evidence text từ k6 và SQL, không phụ thuộc raw artifact bên ngoài.

**Giới hạn:** k6 và server chạy cùng máy; kết quả dùng tìm bottleneck, không phải production SLA.
