# Báo cáo tổng kết Load Test GĐ3-GĐ4 - PayGate

**Người tổng hợp:** KhoaNXD  
**Ngày tổng hợp:** 2026-08-12  
**Load-test snapshot:** `d6fe8efa8b24f8f3ba223ac2e2b1bd56aa5a2398`  
**Trạng thái:** Hoàn tất chạy test và thu thập evidence. GĐ3 chỉ được release sau khi hai backend fix tương ứng được merge.

## 1. Phạm vi

| Giai đoạn | Nội dung |
|---|---|
| GĐ3 | Idempotency/concurrency của `POST /api/v1/transactions/pay` |
| GĐ4-A | Webhook có HMAC với `transferContent` ngẫu nhiên, không khớp checkout |
| GĐ4-B | Burst 30 bank settlement hợp lệ và độc lập |
| GĐ4-C | Spam webhook có HMAC hợp lệ nhưng amount sai |

GĐ1-GĐ2 thuộc phạm vi load test Marketplace của team khác, không sao chép số liệu vào báo cáo này.

## 2. Bảng tổng hợp p95 và throughput

| GĐ | Endpoint/luồng | Cấu hình | p95 | Throughput | Kết quả chức năng |
|---|---|---|---:|---:|---|
| GĐ3 | `POST /api/v1/transactions/pay` | 10 VU x 1 request đồng bộ, chung key | **346,35 ms** | **28,22 req/s** theo burst | 10 response cùng transaction; 1 debit + 1 credit; tiền chỉ chuyển một lần |
| GĐ4-A | Bank webhook, order không tồn tại | 30 VU trong 60 giây | **20,79 ms** | **1.941,27 req/s** | 116.499/116.499 HTTP 404; DB không phát sinh dữ liệu |
| GĐ4-B | Bank webhook settlement hợp lệ | 30 VU x 1 fixture riêng | **440,58 ms** | **63,66 settlement/s** theo burst | 30/30 HTTP 200; đúng 30 session, transaction và CREDIT ledger |
| GĐ4-C | Bank webhook có chữ ký nhưng amount sai | 10 VU trong 15 giây | **6,26 ms** | **1.617,66 req/s** | 24.317/24.317 exact HTTP 400; accepted 0%; DB không bị thay đổi |

Throughput lấy từ metric riêng của scenario hoặc completion window của burst. Không dùng `http_reqs.rate` tổng nếu số request còn bao gồm login, setup, tạo fixture hoặc teardown.

## 3. Kết luận GĐ3 - Idempotency

GĐ3 PASS trên backend SHA `9703482`, kết hợp hai fix:

- `96d4ecd`: retry PostgreSQL serialization conflict bằng transaction mới.
- `9703482`: trả idempotent replay trước khi đánh giá fraud velocity.

Evidence của run `gd3-final-20260811-224105`:

- 10/10 HTTP 201, cùng `TXN-PAY-EAC5CB9E`.
- PostgreSQL có đúng 1 transaction theo idempotency key.
- Ledger của transaction có 1 DEBIT và 1 CREDIT, mỗi entry VND 10.000.
- Payer giảm VND 10.000; destination tăng VND 10.000.
- Global ledger endpoint trả HTTP 200, `balanced=true`.

Kết luận: không double-charge trên build đã vá.

Hai fix trên chưa nằm trong official feature/develop baseline dùng cho GĐ4. Điều kiện release GĐ3 là merge hai fix hoặc thay đổi tương đương, sau đó chạy lại trên integration branch.

## 4. Kết luận GĐ4 - Webhook

### GĐ4-A - Random/non-matching content

- 30 VU, 60 giây, 116.499 request.
- 100% trả HTTP 404 đúng contract hiện tại.
- p95 20,79 ms; throughput 1.941,27 req/s.
- Không có 2xx, 401 hoặc 5xx.
- SQL trước/sau: 0 checkout session, 0 transaction, 0 ledger entry.

### GĐ4-B - 30 settlement hợp lệ

- 30 fixture `PENDING` riêng biệt; 30 request được phát trong 15 ms.
- 30/30 HTTP 200, checks 90/90.
- p95 440,58 ms; completion window 471,27 ms; throughput burst 63,66 settlement/s.
- DB: 30 session `COMPLETED`, 30 transaction ref riêng, 30 CREDIT ledger.
- Tổng amount VND 3.000.000; SYSTEM balance tăng đúng VND 3.000.000.

Merchant callback được đặt `NULL` trong DB disposable để p95 chỉ đo xử lý nội bộ PayGate, không bao gồm retry/timeout sang hệ thống merchant.

### GĐ4-C - Amount giả mạo

- Checkout thật: VND 100.000; request gửi VND 50.000.
- 24.317/24.317 request trả exact HTTP 400 `Amount mismatch`.
- Reject 100%; accepted 0%; không có 401 hoặc 5xx.
- p95 6,26 ms; throughput 1.617,66 request/s.
- Checkout vẫn `PENDING`, `transaction_ref` null.
- 0 transaction, 0 ledger; SYSTEM balance không đổi.

Kết luận: amount guard chặn toàn bộ payload sai sau khi HMAC đã hợp lệ, trước mọi settlement mutation.

Webhook không dùng JWT nhưng có xác thực HMAC qua `BankWebhookFilter`; không gọi endpoint này là `no-auth`.

## 5. Phân tích Auth Filter so với DB query

Số liệu hiện tại không cô lập được chi phí Auth Filter:

- GĐ3 dùng JWT và luồng direct payment.
- Ba kịch bản GĐ4 cùng dùng HMAC nhưng thực hiện business/DB work khác nhau.
- Traffic profile giữa burst và constant-VU cũng khác nhau.

Không lấy phép trừ p95 giữa hai endpoint để kết luận số ms của JWT hoặc HMAC.

Kết luận có thể bảo vệ bằng evidence:

| Luồng GĐ4 có chung HMAC | p95 |
|---|---:|
| Lookup order không tồn tại rồi trả 404 | 20,79 ms |
| Lookup session thật, so amount rồi trả 400 | 6,26 ms |
| Lookup + lock SYSTEM account + ghi transaction/ledger/session | 440,58 ms |

Settlement chậm hơn validation khoảng 419,79 ms ở p95. Phần chênh lệch thuộc full business/write path dưới burst, không phải riêng DB query hay Auth Filter.

Muốn có con số auth overhead chính xác cần matched route hoặc timer/trace đặt ngay trước và sau JWT/HMAC filter.

## 6. Nếu chỉ tối ưu một chỗ

Trong phạm vi PayGate GĐ3-GĐ4 đã đo, ưu tiên tối ưu luồng bank settlement hợp lệ:

- p95 440,58 ms, cao nhất trong các endpoint đã đo.
- Cao khoảng 21,2 lần validation 404 ở cùng mức 30 VU.
- Mỗi request cùng lock và cập nhật SYSTEM account, sau đó ghi transaction, ledger và checkout session.

Điểm điều tra đầu tiên: contention tại shared SYSTEM-account lock và thời gian nằm trong critical section. Không bỏ lock chỉ để giảm latency vì lock đang bảo vệ tính đúng của số dư.

Chưa thể đưa kết luận tối ưu cho cả Marketplace và PayGate cho tới khi team GĐ1-GĐ2 bàn giao evidence hợp lệ.

## 7. Evidence

- [Báo cáo chi tiết GĐ3](./gd3/report-gd3.md)
- [Evidence GĐ3](./gd3/evidence/gd3-final-20260811-224105/)
- [Báo cáo chi tiết GĐ4](./gd4/report-gd4.md)
- [Evidence GĐ4-A](./gd4/evidence/gd4-validation-20260811-235710/)
- [Evidence GĐ4-B](./gd4/evidence/gd4-settlement-20260812-000715/)
- [Báo cáo bảo mật GĐ4-C](./gd4/report-gd4-forged.md)
- [Evidence GĐ4-C](./gd4/evidence/gd4-forged-20260812-001305/)

## 8. Giới hạn

- Chạy trên một máy Windows và DB disposable, không phải benchmark capacity production.
- GĐ4-A là lookup-and-reject, không phải settlement thành công.
- GĐ4-B là burst 30 request, không phải sustained stream của settlement mới.
- GĐ4-C mô phỏng payload đã ký nhưng amount bị sửa; không mô phỏng attacker bên ngoài không có bank HMAC secret.
- So sánh p95 giữa traffic profile khác nhau chỉ dùng để định hướng, không coi là thí nghiệm hoàn toàn tương đương.
