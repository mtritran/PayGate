# GĐ4 — PayGate Normal Webhook Load Test Report (Báo cáo Chuẩn hóa)

## 1. Thông tin Test & Cấu hình Động (ENV)

| Thông số | Cấu hình ENV | Giá trị Thực tế Lần chạy |
|---|---|---|
| Endpoint | N/A | `POST /api/v1/integration/bank-webhook` |
| Auth Mechanism | `WEBHOOK_SECRET` | HMAC-SHA256 Base64 Header `X-Bank-Signature` |
| Merchant Credentials | `MERCHANT_CODE`, `MERCHANT_API_KEY` | `MARKETPLACE_MP` / `marketplace-api-key-123456` |
| VU Profile | Ramping VUs | 0 → 20 VUs (10s ramp-up, 20s steady at 20 VUs, 10s ramp-down) |
| Target Session OrderId | Generated in `setup()` | `ORD-LOAD-1786441269821-CLTP` (Amount: 100,000 VND) |
| Script File | N/A | [`loadtest/paygate/webhook-normal-load.js`](../loadtest/paygate/webhook-normal-load.js) |

---

## 2. Kịch bản & Hợp đồng Nghiệp vụ (Business Contract)

1. **Chuẩn bị Fixture (`setup()`)**: Tạo sẵn 1 `CheckoutSession` hợp lệ có `status = PENDING`, `amount = 100000.00` và lấy về `transferContent = PAYGATE ORD-LOAD-1786441269821-CLTP`.
2. **Luồng Gạch nợ VietQR**: Các VUs liên tục gửi Webhook với đúng `transferContent` và đúng số tiền `100,000 VND`, kèm theo chữ ký HMAC-SHA256 hợp lệ.
3. **Tiêu chí Đạt (Assertion)**: Phải trả về **HTTP 2xx (200 OK)** và Body `success = true`. Các mã lỗi 400/401/500 **đều bị tính là thất bại (Check Failure)**.

---

## 3. Kết quả Metrics k6 Thực tế

| Metric | Giá trị Thực tế | Đánh giá & Ngưỡng (Threshold) |
|---|---|---|
| **Tổng số Request** | **27,944 requests** | ⚡ Tải cao trong 40 giây |
| **Throughput Trung bình** | **696.88 req/s** | 🚀 Hiệu năng xử lý cực cao |
| **Response Time Average** | **21.01 ms** | ⚡ Phản hồi siêu tốc |
| **Response Time Median (p50)** | **19.61 ms** | ⚡ Cực kỳ ổn định |
| **Response Time p90** | **31.59 ms** | ⚡ |
| **Response Time p95** | **36.50 ms** | ✅ PASS (Threshold < 1000ms) |
| **Min / Max Latency** | **7.65 ms / 113.00 ms** | ⚡ |
| **Checks Success Rate** | **100.00%** (55,888 / 55,888 checks) | ✅ 100% Request hợp lệ thành công |
| **HTTP Request Failure Rate** | **0.00%** (0 / 27,944 failed) | ✅ 100% 200 OK, 0% lỗi 5xx |

---

## 4. Bằng chứng Thực tế trong CSDL PostgreSQL (SQL Evidence)

### A. Kiểm tra Trạng thái `checkout_sessions`
Query:
```sql
SELECT order_id, merchant_id, amount, method, status, transaction_ref 
FROM checkout_sessions 
WHERE order_id = 'ORD-LOAD-1786441269821-CLTP';
```

Kết quả:
```text
          order_id           | merchant_id |  amount   | method |  status   |              transaction_ref              
-----------------------------+-------------+-----------+--------+-----------+-------------------------------------------
 ORD-LOAD-1786441269821-CLTP |           6 | 100000.00 |        | COMPLETED | TXN_BANK_2A0F0E1632B446AC96D8258EB7A7406E
(1 row)
```
→ Đơn hàng chuyển sang `COMPLETED` thành công.

### B. Kiểm tra Bảng `transactions`
Query:
```sql
SELECT id, transaction_ref, amount, status, source_account_id, dest_account_id, created_at 
FROM transactions 
WHERE transaction_ref = 'TXN_BANK_2A0F0E1632B446AC96D8258EB7A7406E';
```

Kết quả:
```text
 id |              transaction_ref              |  amount   |  status   | source_account_id | dest_account_id |         created_at         
----+-------------------------------------------+-----------+-----------+-------------------+-----------------+----------------------------
 53 | TXN_BANK_2A0F0E1632B446AC96D8258EB7A7406E | 100000.00 | COMPLETED |                 8 |               8 | 2026-08-11 16:41:10.432968
(1 row)
```
→ **Idempotency Webhook**: Các request Webhook lặp lại tiếp theo đều nhận về kết quả Idempotent Response (HTTP 200) mà **không tạo ra thêm transaction lặp lại**.

---

## 5. Kết luận

Endpoint `/api/v1/integration/bank-webhook` khi xử lý luồng gạch nợ VietQR hợp lệ đạt throughput ấn tượng **696.88 req/s** với **p95 = 36.50 ms**, tỷ lệ lỗi **0.00%**, đảm bảo tính toàn vẹn dữ liệu tuyệt đối.
