# 📊 BÁO CÁO LOAD TEST GĐ3 — CONCURRENCY & IDEMPOTENCY

**Ngày:** 12/08/2026<br>
**Backend:** PayGate `develop/cab84ca`<br>
**Môi trường:** Local Windows, PostgreSQL 16 + Redis 7 + RabbitMQ 3 disposable<br>
**Công cụ:** k6 v2.1.0

## 1. Mục tiêu và kịch bản

Kiểm tra `POST /api/v1/transactions/pay` có tạo nhiều giao dịch hoặc trừ tiền nhiều lần khi nhận các request đồng thời cho cùng một logical payment hay không.

```http
POST /api/v1/transactions/pay
{
  "idempotencyKey": "<CỐ ĐỊNH>",
  "destAccountId": 7,
  "amount": 10000,
  "description": "loadtest",
  "merchantId": null
}
```

Kịch bản chuẩn tuân thủ requirements: **1 user, 1 key, 10 VUs, mỗi VU một iteration, barrier 3 giây, không ramp-up**.

## 2. Kết quả kịch bản chuẩn — 10 requests

| Chỉ số | Kết quả |
|---|---:|
| Payment requests | 10 |
| Checks | **20/20 — 100%** |
| HTTP response | 1 × 201; 9 × 409; 0 × 429/5xx |
| Avg / p95 / max | 310,01 / **337,57** / 359,29 ms |
| Transaction theo exact key | **1** |
| Ledger | **1 DEBIT + 1 CREDIT** |
| Số dư payer | Giảm đúng **10.000 VND một lần** |
| Global ledger | `balanced=true` |

`20/20` là `10 requests × 2 assertions/request`, không phải 20 giao dịch.

**Kết luận:** PASS chống double-charge; nhưng 9 caller nhận 409 nên replay semantics chưa lý tưởng.

<details>
<summary><strong>Evidence text GĐ3 chuẩn — k6 10 VUs</strong></summary>

```text
THRESHOLDS
checks                         rate=100.00%                 PASS
gd3_pay_duration               p(95)=337.56637 ms           PASS

checks_succeeded               20/20 (100%)
checks_failed                  0/20
gd3_pay_requests               10
gd3_http_201_responses         1
gd3_duplicate_conflicts        9
payment 5xx                    0

payerBalanceBefore             10,000,000
payerBalanceAfter               9,990,000
payerDelta                         10,000
globalLedgerBalanced           true
ledger                         DEBIT 10,000 = CREDIT 10,000
```

</details>

## 3. Kết quả mở rộng

Để tăng tải mà không vượt rate-limit 10 payment/user/60 giây, mỗi nhóm dùng một user và key riêng; mỗi nhóm vẫn phát 10 duplicate requests.

| Tổng tải | Cấu hình | Checks | 201 | 409 | 5xx | p95 | DB hậu kiểm |
|---:|---|---:|---:|---:|---:|---:|---|
| 50 requests | 5 user × 10 | 138/150 | 37 | 7 | **6** | 1.049,996 ms | 5 key → 5 transaction |
| 100 requests | 10 user × 10 | 278/300 | 76 | 13 | **11** | 729,519 ms | 10 key → 10 transaction |

Toàn bộ 15 payer chỉ bị trừ một lần; tổng cộng đúng 15 DEBIT và 15 CREDIT. Tuy nhiên, tỷ lệ 5xx của payment request là **12% ở 50 requests** và **11% ở 100 requests**.

<details>
<summary><strong>Evidence text GĐ3 scale — k6 và SQL</strong></summary>

```text
K6 — 50 REQUESTS / 5 KEYS
checks_succeeded               138/150 (92.00%)
checks_failed                  12/150
gd3_scale_pay_duration p95     1,049.99582 ms
HTTP 201 / 409 / 5xx           37 / 7 / 6

K6 — 100 REQUESTS / 10 KEYS
checks_succeeded               278/300 (92.66%)
checks_failed                  22/300
gd3_scale_pay_duration p95     729.519195 ms
HTTP 201 / 409 / 5xx           76 / 13 / 11

SQL HẬU KIỂM CHUNG
transaction_count = 15; logical_keys = 15; total_amount = 150000
DEBIT  = 15 entries / 150000
CREDIT = 15 entries / 150000
correct_payer_balances = 15/15; total_debited = 150000
```

</details>

## 4. Kiểm tra DoD

- [x] Một user và một key cố định trong bài chuẩn.
- [x] 10 request gần như đồng thời, không dùng stages.
- [x] Query DB theo exact idempotency key.
- [x] Gọi ledger verify và so sánh balance trước/sau.
- [x] Có số liệu cụ thể: 1 key → 1 transaction → trừ tiền một lần.
- [ ] API chưa đạt 0 lỗi khi tăng concurrency: còn 409 và SQL serialization 5xx.

## 5. Phân tích và trả lời câu hỏi

### Idempotency key hoạt động đúng nghĩa là gì?

Idempotency key phải được **caller sinh một lần từ logical payment** — ví dụ payment intent/order ID hoặc UUID của lần bấm thanh toán đầu tiên — rồi tái sử dụng nguyên key đó cho mọi retry. Không được sinh key mới ở mỗi request.

PayGate cần lưu quan hệ `idempotencyKey → transaction` trong database bằng unique constraint; Redis chỉ là cache tăng tốc. Flow đúng là:

1. Sau khi xác thực caller, kiểm tra key trước mọi debit/ledger mutation.
2. Nếu key đã tồn tại, trả lại transaction cũ.
3. Nếu chưa tồn tại, insert key và thực hiện chuyển tiền trong cùng transaction nguyên tử.
4. Khi hai request race, chỉ một request commit; request còn lại đọc transaction vừa commit và trả cùng kết quả.

### Có tái hiện bug P-C4 không?

Không tái hiện double-charge: mọi key chỉ tạo một transaction. Tuy nhiên, scale test tái hiện một lỗi concurrency liên quan: PostgreSQL SQLSTATE `40001` bị trả thành 5xx.

Nguyên nhân là controller gọi trực tiếp overload `SERIALIZABLE`, trong khi retry loop nằm ở overload khác nên HTTP call path bỏ qua retry boundary. Unique constraint vẫn giữ dữ liệu đúng nhưng không đảm bảo response ổn định.

## 6. Kết luận

- **Data integrity:** PASS.
- **Không double-charge:** PASS.
- **Idempotent response/retry ở tải cao:** FAIL.
- Cần đưa retry vào transaction boundary được controller gọi và re-query transaction theo key sau serialization/unique conflict.

Các khối evidence phía trên đã chép trực tiếp output k6 và SQL cần thiết; file này có thể được gửi độc lập.
