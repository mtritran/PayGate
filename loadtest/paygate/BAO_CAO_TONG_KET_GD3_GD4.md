# Báo cáo tổng kết Load Test GĐ3–GĐ4 — PayGate

**Người tổng hợp:** KhoaNXD
**Ngày tổng hợp:** 2026-08-11
**Source snapshot:** `feat/paygate-loadtest-gd3-gd4@9d090cd`
**Trạng thái:** `EVIDENCE-GATED` — tổng hợp phần GĐ3–GĐ4, không dùng baseline chạy riêng của Khoa.

## 1. Phạm vi và nguyên tắc đánh giá

| Giai đoạn | Mục tiêu | Artifact đã nhận |
|---|---|---|
| GĐ3 | Concurrency/idempotency của `POST /api/v1/transactions/pay` | `idempotency-poc.js`, `idempotency-poc-report.md` |
| GĐ4 | Hiệu năng và an toàn của `POST /api/v1/integration/bank-webhook` | `webhook-loadtest.js`, `webhook-loadtest-report.md`, `webhook-forged-scenario-report.md` |

- **Reported:** số liệu có trong Markdown của team nhưng chưa có raw k6 JSON/CSV hoặc output SQL được commit.
- **Provisional:** source hỗ trợ cơ chế được mô tả, nhưng run chưa đủ điều kiện chứng minh đúng kịch bản.
- **Invalid for comparison:** số liệu/diễn giải mâu thuẫn source hiện tại, không dùng để kết luận hiệu năng hay security.

## 2. Bảng tổng hợp p95 và throughput

| GĐ | Kịch bản | Cấu hình báo cáo | p95 latency | Throughput | Kết quả báo cáo | Độ tin cậy |
|---|---|---:|---:|---:|---|---|
| GĐ3 | Cùng `idempotencyKey` gọi `/transactions/pay` | 10 VU / 10 iterations | 158.38 ms* | Không xuất | 10 phản hồi 201 cùng `txRef`; 1 transaction | Provisional |
| GĐ4-1 | Random signed bank webhook | Ramp đến 30 VU | 354.59 ms | 104.64 req/s | 6,279 request, 100% HTTP 400 | **Invalid for comparison** |
| GĐ4-2 | Session thật, signed webhook, amount sai | 2 VU / 15s | 9.99 ms | Không xuất raw rate | 268 request; 0 accepted / 268 rejected | Provisional |

\* p95 GĐ3 là `http_req_duration` gộp login, đọc balance/list và payment; không phải p95 riêng của `/transactions/pay`.

## 3. GĐ3 — Idempotency POC

### Điều source hiện tại bảo vệ

- `TransactionServiceImpl.processPayment()` chạy với isolation `SERIALIZABLE`.
- Flow kiểm idempotency ở Redis, PostgreSQL, sau đó re-check DB trước khi tạo transaction.
- `transactions.idempotency_key` có `UNIQUE` constraint.

Đây là defense-in-depth phù hợp để ngăn double-charge khi nhiều request cùng một logical payment.

### Điểm chưa đủ để kết luận P-C4 không tái hiện

1. Script dùng idempotency key cố định. Lần chạy sau có thể chỉ hit Redis/DB record đã tồn tại, không tạo race mới.
2. `shared-iterations` không có timestamp/barrier evidence chứng minh 10 request thực sự tới service đồng thời.
3. Script chỉ gọi API list và lọc theo `description`; không query trực tiếp PostgreSQL `transactions` và `ledger_entries`.
4. Settlement chạy bất đồng bộ, nhưng script không poll trạng thái hoàn tất trước khi đo balance sau test.

### Kết luận GĐ3

Kết quả hiện tại chỉ cho phép ghi:

> Đã quan sát replay/cache-hit trả về cùng `txRef`; chưa đủ chứng minh chính thức rằng P-C4 không tái hiện trên một run mới, đồng thời và có DB/ledger evidence.

Để ký nhận GĐ3 cần một `RUN_ID`/key mới mỗi lần, raw k6 summary, timestamp 10 request và SQL hậu kiểm cho `transactions`, `ledger_entries`, số dư sau khi settlement hoàn tất.

## 4. GĐ4 — Webhook

### 4.1 Kịch bản forged amount

`/api/v1/integration/bank-webhook` được `permitAll` ở tầng JWT, nhưng vẫn bắt buộc HMAC qua `BankWebhookFilter` (`X-Bank-Signature`). Vì vậy endpoint **không phải không xác thực**.

Với checkout session tồn tại ở trạng thái `PENDING`, `BankIntegrationService` so sánh `request.amount` với `session.amount` và ném `AmountMismatchException` khi hai số khác nhau. Cơ chế chặn forged amount vì vậy được source hỗ trợ.

Tuy nhiên số liệu `0/268 accepted` vẫn chỉ là `Provisional` vì script coi mọi non-2xx là “rejected”. Nếu `WEBHOOK_SECRET` sai thì HTTP 401 cũng bị đếm là amount mismatch bị chặn. Run hợp lệ phải assert đồng thời:

- HMAC hợp lệ;
- HTTP 400 với lỗi amount mismatch;
- session vẫn `PENDING`;
- không có transaction hoặc ledger entry mới.

### 4.2 Kịch bản normal random webhook

Không dùng p95 354.59 ms và 104.64 req/s làm benchmark cho HEAD hiện tại.

- Report cũ nói random `transferContent` bị regex chặn HTTP 400 trước khi vào DB.
- Nhưng `extractOrderId()` fallback sang `content.trim()`. Khi không tìm được session, code có nhánh tạo checkout session on-the-fly với amount từ request.
- Script hiện ký HMAC cho payload random. Nếu secret đúng, request có thể đi sâu vào flow ghi; nếu fallback không thỏa DB constraint, response cũng không phải format-rejection 400 như report.
- Script HEAD mặc định chạy cả normal và forged, trong khi report normal mô tả một run 60 giây riêng.

Kịch bản random signed webhook không an toàn trên shared DB: có thể tạo dữ liệu rác hoặc settlement ngoài ý muốn. Cần thay nó bằng payload có session/merchant stub được kiểm soát hoặc một đường validation thuần không ghi dữ liệu.

### 4.3 Rủi ro còn lại cần xử lý trước khi benchmark lại

1. `BankWebhookFilter` có fallback secret `vietqr-secret-default`; phải bắt buộc inject secret từ ENV và fail-fast nếu thiếu.
2. Unknown `transferContent` không nên tự tạo checkout session/settlement; phải reject nếu không có session hợp lệ do merchant tạo.
3. `bankTransactionNo` chưa được dùng làm idempotency key bền vững. Cần unique/dedup để chống callback bank lặp.
4. Cần lock/version trên checkout session để tránh hai webhook hợp lệ cùng thấy `PENDING` rồi cùng settle.

## 5. Câu hỏi kiến trúc — Auth Filter so với DB query

**Không có số ms hợp lệ để kết luận overhead của Auth Filter từ artifact hiện tại.** Không được lấy `1,930 ms - 354.59 ms` để gán cho JWT hoặc DB vì:

1. `/transactions/pay` và `/bank-webhook` là hai business flow khác nhau, có payload và state DB khác nhau.
2. Webhook có HMAC filter, không phải baseline “không auth”.
3. GĐ4-1 hiện không chạy theo đường xử lý mà report mô tả.
4. Con số 1,930 ms không có raw artifact và mâu thuẫn với p95 158.38 ms ghi ở GĐ3 cho cùng endpoint.

Vòng đo tiếp theo phải chạy tuần tự, cùng máy/DB/Redis/VU/warm-up, tách metric theo scenario và xuất `k6 --summary-export`. Nếu muốn tách filter/DB, cần thêm Micrometer timer hoặc trace cho filter, service và SQL; k6 chỉ đo end-to-end.

## 6. Kết luận và bàn giao

- **GĐ3:** source có defense-in-depth idempotency, nhưng kết quả hiện tại chưa đủ chứng minh concurrency run mới không double-charge.
- **GĐ4 forged:** source có amount-match trên session tồn tại; tỷ lệ 0% accepted được giữ là số liệu team báo cáo, chờ xác minh HMAC/DB post-condition.
- **GĐ4 normal:** p95/throughput hiện tại không hợp lệ để dùng trong báo cáo hiệu năng; không chạy lại trên shared DB trước khi sửa kịch bản/flow unknown-content.
- Ưu tiên an toàn trước khi tối ưu latency: bắt buộc secret từ ENV, reject unknown transfer content, dedup `bankTransactionNo` và chống race checkout session.

Phần tổng hợp GĐ3–GĐ4 của Khoa đã hoàn tất. Trạng thái DoD chung: **chưa Certified**, chờ raw k6 + SQL evidence theo các điều kiện trên.
