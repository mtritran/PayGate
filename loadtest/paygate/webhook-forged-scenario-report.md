# GĐ4 — PayGate Forged Webhook Security Test Report (Báo cáo Chuẩn hóa)

## 1. Mục tiêu & Kịch bản Tấn công Giả mạo (Forged Amount Attack Scenario)

Kịch bản tấn công: Kẻ gian có được thông tin đơn hàng hợp lệ `PAYGATE ORD-FORGED-1786441323007-7aKL` có giá trị **100,000 VND** và chữ ký HMAC `X-Bank-Signature` hợp lệ. Kẻ gian cố tình điều chỉnh `amount` xuống **99,999 VND** trong body Webhook gửi tới endpoint `/api/v1/integration/bank-webhook`.

Báo cáo này đo lường khả năng của hệ thống trong việc **chặn đứng 100% giao dịch giả mạo số tiền** và bảo vệ CSDL không bị cập nhật sai trạng thái.

---

## 2. Tiêu chí Đánh giá Bảo mật (Security Audit Criteria)

| Tiêu chí | Điều kiện Đạt | Ý nghĩa Bảo mật |
|---|---|---|
| **HTTP Status Code** | **HTTP 400 Bad Request** | Bị từ chối tại tầng xử lý nghiệp vụ Amount Validation. |
| **Response Body Message** | Chứa `"Amount mismatch"` | Chứng minh exception `AmountMismatchException` thực sự được kích hoạt. |
| **Loại trừ Lỗi không hợp lệ** | Không chấp nhận HTTP 401 hay 500 | Đảm bảo không bị lẫn lộn giữa lỗi Auth/Server Error và lỗi Amount Check. |
| **Tỷ lệ Chặn (Reject Rate)** | **100.00%** (`forged_reject_rate == 1.0`) | Không một request giả mạo nào lọt qua bảo mật. |

---

## 3. Kết quả Metrics k6 Thực tế

| Metric | Giá trị Thực tế | Trạng thái & Ngưỡng |
|---|---|---|
| **Tổng số Forged Requests** | **8,377 requests** | ⚡ Tải tấn công dồn dập trong 15 giây |
| **Forged Reject Rate** | **100.00%** (8,377 / 8,377) | ✅ PASS (Threshold: 100.00%) |
| **Forged Acceptance Rate** | **0.00%** (0 / 8,377) | ✅ PASS (0% lọt lưới) |
| **Checks Success Rate** | **100.00%** (25,133 / 25,133 checks) | ✅ PASS |
| **Response Time p95** | **27.00 ms** | ⚡ Xử lý và từ chối cực nhanh |
| **Response Time Average** | **17.69 ms** | ⚡ |

---

## 4. Bằng chứng Thực tế trong CSDL PostgreSQL (SQL Evidence)

### A. Kiểm tra Bảng `checkout_sessions`
Query:
```sql
SELECT order_id, merchant_id, amount, method, status, transaction_ref 
FROM checkout_sessions 
WHERE order_id = 'ORD-FORGED-1786441323007-7aKL';
```

Kết quả:
```text
           order_id            | merchant_id |  amount   | method | status  | transaction_ref 
-------------------------------+-------------+-----------+--------+---------+-----------------
 ORD-FORGED-1786441323007-7aKL |           6 | 100000.00 |        | PENDING | 
(1 row)
```
→ **TRẠNG THÁI GIỮ NGUYÊN PENDING**: 8,377 request giả mạo **không làm thay đổi trạng thái đơn hàng**, `transaction_ref` vẫn là `NULL`.

### B. Kiểm tra Bảng `transactions`
Query:
```sql
SELECT * FROM transactions 
WHERE description LIKE '%ORD-FORGED-1786441323007-7aKL%';
```

Kết quả:
```text
(0 rows)
```
→ **0 TRANSACTION ĐƯỢC TẠO**: Không có bất kỳ giao dịch rác hay biến động số dư nào xảy ra trong hệ thống.

---

## 5. Kết luận Bảo mật

PayGate bảo vệ toàn diện trước nguy cơ Giả mạo Số tiền (Amount Mismatch). Ngay cả khi đối tượng có chữ ký HMAC hợp lệ và `transferContent` hợp lệ, việc thay đổi số tiền dù chỉ 1 VND đều bị hệ thống phát hiện, phát sinh `AmountMismatchException`, trả về HTTP 400 và từ chối 100% giao dịch.
