# Báo cáo tổng kết Load Test GĐ1–GĐ4

**Người tổng hợp:** KhoaNXD
**Ngày tổng hợp:** 2026-08-11
**Trạng thái:** `EVIDENCE-GATED` — đã tổng hợp toàn bộ số liệu được bàn giao, nhưng **chưa ký nhận kết quả cuối** cho đến khi bổ sung raw evidence theo mục 6.

## 1. Phạm vi và nguồn đầu vào

| Giai đoạn | Hệ thống được test | Nguồn đã đối chiếu | Phiên bản dùng để đối chiếu |
|---|---|---|---|
| GĐ1 | MarketPlace — API đọc | `Marketplace/loadtest/gd1/report-gd1.md` | `origin/test/load-test-tri@70df425` |
| GĐ2 | MarketPlace — cart → order | `Marketplace/loadtest/gd2/report-gd2.md` | `origin/test/load-test-tri@70df425` |
| GĐ3 | PayGate — idempotency | `loadtest/paygate/idempotency-poc-report.md` | `feat/paygate-loadtest-gd3-gd4@9d090cd` |
| GĐ4 | PayGate — bank webhook | `loadtest/paygate/webhook-*.md` | `feat/paygate-loadtest-gd3-gd4@9d090cd` |

Baseline tự chạy riêng của Khoa được để ở nhánh `test/khoa-paygate-loadtest-gd3-gd4` và **không dùng** trong báo cáo này.

### Quy ước độ tin cậy

- **Reported:** có số trong báo cáo team nhưng chưa có `summary-export`/JSON k6 hoặc log SQL đi kèm.
- **Provisional:** source hiện tại hỗ trợ cơ chế được mô tả, nhưng run chưa đủ điều kiện chứng minh đúng kịch bản.
- **Invalid for comparison:** số liệu hoặc diễn giải mâu thuẫn source/thiết kế kịch bản; không dùng để suy ra hiệu năng hay overhead.

## 2. Bảng so sánh p95 latency và throughput

> Các con số dưới đây giữ nguyên giá trị team đã báo cáo. Không so sánh ngang tuyệt đối vì endpoint, số VU, payload, cache và môi trường không đồng nhất.

| GĐ | Endpoint/kịch bản | Tải báo cáo | p95 latency | Throughput | Kết quả chính | Độ tin cậy |
|---|---|---:|---:|---:|---|---|
| GĐ1 | MP `GET /products/catalog` | 20 VU/scenario, tổng 60 VU | 360.28 ms | 55.51 req/s cho cả 3 scenario | 0% lỗi báo cáo | Reported — benchmark dùng header bypass rate-limit tại thời điểm chạy |
| GĐ1 | MP `GET /products` | 20 VU/scenario | 834.56 ms | Nằm trong throughput chung GĐ1 | 0% lỗi báo cáo | Reported |
| GĐ1 | MP `GET /recommendations` | 20 VU/scenario | **1,800.00 ms** | Nằm trong throughput chung GĐ1 | Chậm nhất trong 3 API đọc | Reported |
| GĐ1 stress | 3 API đọc | 50 VU/scenario, tổng 150 VU | 8,570 ms (aggregate) | Không xuất raw rate | 0% lỗi báo cáo | Reported; cần raw k6 để tách theo endpoint |
| GĐ2 normal | MP `POST /orders` | 10 VU, 1 VU = 1 user | 374.09 ms | ~3.81 orders/s; ~11.64 HTTP req/s* | 381 orders, 0% lỗi báo cáo | Reported |
| GĐ2 stress | MP `POST /orders` | 30 VU, pool max 20 | **8,940.00 ms** | Không xuất raw rate | 9.46% request lỗi báo cáo | Reported; cần raw k6 + Hikari snapshot |
| GĐ3 | PG `POST /transactions/pay`, cùng idempotency key | 10 VU / 10 iterations | 158.38 ms (metric gộp) | Không xuất | 10 phản hồi 201 cùng `txRef` báo cáo | Provisional — key cố định và chưa có SQL/ledger evidence |
| GĐ4 normal | PG `POST /integration/bank-webhook`, random content | ramp đến 30 VU | 354.59 ms | 104.64 req/s | Báo cáo nói 100% HTTP 400 | **Invalid for comparison** |
| GĐ4 forged | PG webhook, session thật + amount sai | 2 VU / 15s | 9.99 ms | Không xuất raw rate | 0/268 accepted, 100% rejected báo cáo | Provisional — cần chứng minh đây là 400 amount mismatch, không phải 401 HMAC |

\* Throughput GĐ2 là phép tính dẫn xuất từ `381 orders` và `1,164 HTTP requests` trên profile danh nghĩa 100 giây; đây không phải `http_reqs` rate được k6 xuất trực tiếp.

## 3. Đánh giá theo giai đoạn

### GĐ1 — API đọc MarketPlace

- `GET /recommendations` là điểm chậm nhất trong dữ liệu bàn giao: p95 1.8 giây ở 20 VU/scenario.
- Source phù hợp với hướng giải thích: service chọn strategy rồi hydrate thêm sản phẩm và biến thể. Đây là đường đọc có nhiều bước truy vấn/hydrate hơn catalog.
- Các script tại commit test dùng `X-Bypass-Rate-Limit`; header này đã bị comment-out ở `RateLimitingFilter` của commit `70df425`. Vì vậy đây là benchmark business-path có kiểm soát, **không** phải đo hành vi public production có rate-limit.
- Không có raw k6 export được version-control, nên p95/throughput vẫn là `Reported`, chưa đủ để ký nhận độc lập.

### GĐ2 — Cart → Order MarketPlace

- Ở mức chuẩn 10 VU, `POST /orders` p95 374.09 ms và không lỗi theo report.
- Ở 30 VU vượt pool 20, p95 vọt lên 8.94 giây và lỗi 9.46%. Đây là degradation phi tuyến, phù hợp với một flow ghi có transaction, reservation kho, nhiều bảng ghi và cạnh tranh lock.
- Không nên kết luận chỉ cần tăng `maximum-pool-size`: cần đo đồng thời SQL wait/lock, Hikari active/pending và DB CPU trước; tăng pool khi DB đã bão hòa có thể làm tình hình tệ hơn.
- Raw k6, ảnh/JSON Actuator và log `SQLTransientConnectionException` chưa được đính kèm; số liệu được giữ ở mức `Reported`.

### GĐ3 — Idempotency PayGate

Source PayGate có nhiều lớp bảo vệ: transaction `SERIALIZABLE`, Redis/DB pre-check, DB re-check và `transactions.idempotency_key` là `UNIQUE`. Đây là cơ sở tốt để ngăn double-charge.

Tuy nhiên report hiện tại chưa phải bằng chứng concurrency cuối cùng:

- `idempotency-poc.js` dùng key cố định; lần chạy sau có thể chỉ trả cache/record cũ.
- p95 158.38 ms đang gộp login, balance/list và payment; không phải p95 riêng `/transactions/pay`.
- Script chỉ gọi API list rồi lọc theo `description`, không query `transactions` và `ledger_entries` trong PostgreSQL.
- Chưa chờ settlement async đến trạng thái hoàn tất trước khi kiểm tra balance.

Do đó kết luận đúng hiện tại là: **đã quan sát replay/cache-hit cùng `txRef`; chưa đủ chứng minh P-C4 không tái hiện trên một run mới, đồng thời và có DB evidence.**

### GĐ4 — Webhook PayGate

#### Kịch bản forged amount

Source hiện tại bắt buộc `X-Bank-Signature` qua `BankWebhookFilter`; endpoint `permitAll` chỉ có nghĩa là không dùng JWT, không phải “không xác thực”. Với checkout session tồn tại ở trạng thái `PENDING`, service so sánh amount webhook với amount session và ném `AmountMismatchException` khi khác nhau.

Vì vậy, cơ chế amount-match **được source hỗ trợ**. Nhưng tỷ lệ `0/268` chỉ được ghi là `Provisional` vì script đếm mọi non-2xx là “rejected”; nếu HMAC sai, 401 cũng bị tính là amount mismatch bị chặn. Cần assert HTTP 400/message phù hợp và kiểm tra sau run rằng session vẫn `PENDING`, không có transaction/ledger mới.

#### Kịch bản normal random webhook

Không dùng p95 354.59 ms và 104.64 req/s làm benchmark HEAD:

- Report nói random `transferContent` bị regex chặn 400 trước DB.
- Source `extractOrderId()` lại fallback sang `content.trim()`; sau đó code cố tìm session và có nhánh tạo checkout session on-the-fly.
- Script hiện ký HMAC cho payload random. Nếu secret hợp lệ, request có thể đi sâu vào flow ghi; nếu fallback không thỏa constraint DB thì lại có thể lỗi khác. Cả hai trường hợp đều không phải “400 format rejection” như report.
- Script HEAD mặc định chạy cả normal và forged, còn report normal mô tả một run 60 giây riêng.

Kịch bản random signed webhook không an toàn để benchmark trên shared DB vì có thể tạo dữ liệu rác hoặc settlement ngoài ý muốn.

## 4. Câu hỏi kiến trúc — Auth Filter so với DB query

**Chưa có số liệu hợp lệ để quy đổi overhead Auth Filter thành số ms.** Không được lấy `1,930 ms - 354.59 ms` để kết luận đó là chi phí JWT/DB vì:

1. `/transactions/pay` và `/bank-webhook` là hai business flow khác nhau, payload/state DB khác nhau.
2. Webhook có HMAC filter; nó không phải baseline “không auth”.
3. Kịch bản webhook normal hiện không đi theo đường xử lý mà report mô tả.
4. `1,930 ms` không có raw artifact và mâu thuẫn với p95 158.38 ms được ghi ở GĐ3 cho cùng endpoint.

Thiết kế đo đúng cho vòng tiếp theo:

1. Giữ cùng máy, DB/Redis, warm-up, VU và thời lượng; chạy tuần tự từng scenario.
2. Tách metric theo `name`/scenario: HMAC/JWT reject, request qua filter nhưng dừng trước DB, và request hợp lệ đi qua service/DB.
3. Dùng `k6 --summary-export` và timer Micrometer/trace cho filter, service và SQL; k6 chỉ cho end-to-end latency, không tự tách được filter/DB.
4. Với webhook, dùng session `PENDING`, webhook HMAC hợp lệ, merchant callback stub 200 hoặc webhook URL rỗng để không đưa network downstream vào p95.

## 5. Kết luận chiến lược tối ưu

> **Nếu phải tối ưu một chỗ duy nhất dựa trên số liệu đang được bàn giao, tôi sẽ chọn luồng `POST /api/v1/orders` của MarketPlace — đặc biệt transaction/stock reservation và áp lực connection pool — vì ở 30 VU p95 đã lên 8.94 giây kèm 9.46% lỗi. Đây vừa là latency cao nhất có tác động trực tiếp đến checkout, vừa là lỗi làm mất khả năng đặt hàng; chi phí Auth Filter không phải ứng viên chính theo dữ liệu hiện có.**

Thứ tự thực hiện đề xuất:

1. Profile SQL/lock và Hikari pending trên `createOrder`; thu raw evidence trước khi đổi cấu hình pool.
2. Rút ngắn transaction scope, kiểm tra index/lock trên tồn kho, giảm round-trip ghi không cần thiết.
3. Sau khi flow ghi ổn định, tối ưu `/recommendations` bằng query plan/cache/hydrate batching vì đây là read endpoint chậm nhất ở GĐ1.
4. Sửa riêng flow webhook unknown-content trước khi chạy benchmark lại; không dùng normal random signed request trên shared DB.

## 6. Điều kiện để chuyển trạng thái sang “Certified final”

| Owner | Bổ sung bắt buộc |
|---|---|
| GĐ1/GĐ2 team | `summary-export`/JSON k6, commit chứa report + script cùng revision, cấu hình môi trường và Hikari snapshot tại 10/30 VU |
| Hoàng/Giảng/Trí v2 — GĐ3 | run ID/key mới mỗi lần, timestamp/concurrency evidence, SQL `transactions` + `ledger_entries`, balance trước/sau sau khi settlement hoàn tất |
| Trí v2/Giảng — GĐ4 | pre/post SQL session/transaction/ledger, assert status 400 amount mismatch cho forged case, secret chỉ qua ENV, kịch bản normal không phát sinh settlement ngoài ý muốn |
| Khoa | Cập nhật bảng này từ raw evidence và ký nhận report `Certified final` |

## 7. Bàn giao

- File này là báo cáo tổng hợp chính thức của Khoa cho nhánh `feat/paygate-loadtest-gd3-gd4`.
- Báo cáo **không bịa số liệu thiếu** và không dùng baseline riêng của Khoa để thay thế phần việc đã bàn giao.
- Trạng thái hiện tại: **đã hoàn tất phần tổng hợp/phân tích; chưa đủ evidence để tuyên bố toàn bộ dự án load test đã đạt DoD.**
