# 📊 BÁO CÁO LOAD TEST GĐ4 — BANK WEBHOOK

**Ngày:** 12/08/2026<br>
**Backend:** PayGate `develop/cab84ca`<br>
**Môi trường:** Local Windows, PostgreSQL 16 + Redis 7 + RabbitMQ 3 disposable<br>
**Công cụ:** k6 v2.1.0

## 1. Mục tiêu và kịch bản

Kiểm tra hiệu năng và khả năng chặn amount giả mạo của:

```http
POST /api/v1/integration/bank-webhook
```

Endpoint không dùng JWT nhưng mọi request phải có `X-Bank-Signature` HMAC-SHA256 hợp lệ qua `BankWebhookFilter`.

| Kịch bản | Input | Kết quả mong đợi |
|---|---|---|
| Validation | HMAC đúng, transfer content không tồn tại | HTTP 404, không mutation |
| Settlement | Checkout thật, HMAC và amount đúng | HTTP 200, session `COMPLETED` |
| Forged | Checkout thật, HMAC đúng, amount sai | Exact HTTP 400, không mutation |

## 2. Kết quả validation/load thường

| Tải | Requests | HTTP 404 | Lỗi kết nối | p95 | Throughput | Kết luận |
|---:|---:|---:|---:|---:|---:|---|
| 50 VUs / 30s | 26.129 | 26.129 | 0 | **101,74 ms** | 869,99 req/s | PASS |
| 100 VUs / 30s | 28.497 | 28.497 | 0 | **184,48 ms** | 946,45 req/s | PASS |
| 200 VUs / 30s | 29.194 | 28.954 | **240** | **374,56 ms** | 968,07 req/s | FAIL |

Từ 100 lên 200 VUs, throughput chỉ tăng 2,28% nhưng p95 tăng 103% và bắt đầu connection refused. Mốc ổn định quan sát được trên máy local là 100 VUs.

<details>
<summary><strong>Evidence text validation — 50, 100 và 200 VUs</strong></summary>

```text
50 VUs / 30s
checks_succeeded               78,387/78,387 (100%)
requests / HTTP 404            26,129 / 26,129
http_req_failed                0
p95 / throughput              101.74442 ms / 869.991786 req/s

100 VUs / 30s
checks_succeeded               85,491/85,491 (100%)
requests / HTTP 404            28,497 / 28,497
http_req_failed                0
p95 / throughput              184.4846 ms / 946.448033 req/s

200 VUs / 30s
checks_succeeded               87,102/87,582 (99.45%)
requests / HTTP 404            29,194 / 28,954
http_req_failed                240/29,194 (0.82%)
p95 / throughput              374.559015 ms / 968.074171 req/s
```

</details>

## 3. Kết quả amount giả mạo

| Tải | Requests | Exact HTTP 400 | Accepted | 401/5xx | p95 | Throughput |
|---:|---:|---:|---:|---:|---:|---:|
| 50 VUs / 15s | 14.338 | 14.338 | **0** | 0 / 0 | **75,90 ms** | 950,50 req/s |
| 100 VUs / 15s | 14.387 | 14.387 | **0** | 0 / 0 | **158,19 ms** | 951,29 req/s |

**Forged acceptance rate = 0%.** Hai checkout fixture vẫn `PENDING`, không tạo transaction hoặc ledger.

<details>
<summary><strong>Evidence text forged amount — 50 và 100 VUs</strong></summary>

```text
50 VUs / 15s
checks_succeeded               57,352/57,352 (100%)
exact HTTP 400 Amount mismatch 14,338/14,338 (100%)
accepted / 401 / 5xx           0 / 0 / 0
p95 / throughput              75.903075 ms / 950.502518 req/s

100 VUs / 15s
checks_succeeded               57,548/57,548 (100%)
exact HTTP 400 Amount mismatch 14,387/14,387 (100%)
accepted / 401 / 5xx           0 / 0 / 0
p95 / throughput              158.1886 ms / 951.288759 req/s
```

</details>

## 4. Kết quả settlement hợp lệ

| Burst | Thành công | p95 | SQL hậu kiểm |
|---:|---:|---:|---|
| 30 VUs | 30/30 | **706,15 ms** | 30 session + 30 transaction + 30 CREDIT |
| 50 VUs | 50/50 | **941,35 ms** | 50 session + 50 transaction + 50 CREDIT |

Settlement chậm hơn vì mỗi request phải lock SYSTEM account dùng chung, cộng balance, insert transaction/ledger và update checkout session.

<details>
<summary><strong>Evidence text settlement và SQL hậu kiểm</strong></summary>

```text
K6 — SETTLEMENT 30 VUs
checks_succeeded               90/90 (100%)
settlement_successes           30/30
p95                            706.15401 ms

K6 — SETTLEMENT 50 VUs
checks_succeeded               150/150 (100%)
settlement_successes           50/50
p95                            941.35254 ms

SQL HẬU KIỂM — 50 VUs VÀ FORGED FIXTURES
sessions = 50; completed = 50; distinct refs = 50; total = 5000000
transactions = 50; total = 5000000
CREDIT ledger entries = 50; total = 5000000
forged sessions = 2; pending = 2; with_transaction = 0
```

</details>

## 5. Kiểm tra DoD

- [x] Kịch bản load thường nằm trong dải yêu cầu 20-50 VUs.
- [x] Có throughput và p95 riêng: 869,99 req/s và 101,74 ms tại 50 VUs.
- [x] Kịch bản forged dùng checkout thật, HMAC đúng và amount sai.
- [x] 28.725/28.725 forged requests bị chặn; accepted 0%.
- [x] SQL xác nhận không có mutation ở validation/forged path.
- [x] Settlement thật giữ đúng session/transaction/ledger count.

## 6. Phân tích và trả lời câu hỏi

### Endpoint không dùng JWT có nhanh hơn endpoint có JWT không?

Số liệu end-to-end quan sát được:

- GĐ3 `/transactions/pay` có JWT, 10 VUs: p95 **337,57 ms**.
- GĐ4 validation có HMAC, 50 VUs: p95 **101,74 ms**.
- Chênh lệch quan sát: GĐ4 thấp hơn **235,83 ms**, khoảng 70%.

Tuy nhiên, **không được kết luận 235,83 ms là chi phí JWT**, vì hai endpoint có traffic profile và business logic khác nhau. `/transactions/pay` chạy fraud check, transaction `SERIALIZABLE`, idempotency và financial mutation; validation webhook chỉ lookup order rồi trả 404.

So sánh trong cùng HMAC endpoint cho thấy chi phí business/DB đáng kể hơn auth:

- Validation 50 VUs: p95 101,74 ms.
- Settlement 50 VUs: p95 941,35 ms.
- Chênh lệch full write path: khoảng **839,61 ms**.

Vì vậy HMAC/JWT filter không phải bottleneck chính trong số liệu hiện tại; database write, shared SYSTEM-account lock và transaction scope ảnh hưởng lớn hơn.

### Vì sao 200 VUs bắt đầu lỗi?

Throughput đã plateau trong khi số request đồng thời tăng gấp đôi. Server và k6 chạy cùng máy, đồng thời backend ghi INFO/ERROR cho từng webhook, nên CPU, Tomcat queue, DB pool và logging đều có thể góp phần gây connection refused. Chưa có Hikari/CPU time-series để quy lỗi cho một nguyên nhân duy nhất.

## 7. Kết luận

- Validation: PASS đến 100 VUs; FAIL ở 200 VUs.
- Forged amount: PASS 100%, accepted 0%.
- Settlement: PASS đến burst 50, nhưng p95 941,35 ms đã gần threshold 1 giây.
- Ưu tiên theo dõi shared SYSTEM lock và giảm per-request log storm.

Các khối evidence phía trên đã chép trực tiếp output k6 và SQL cần thiết; file này có thể được gửi độc lập.
