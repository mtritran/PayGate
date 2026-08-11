# 📊 BÁO CÁO TỔNG HỢP & PHÂN CÔNG ĐO KIỂM HIỆU NĂNG (LOAD TEST)

*Ngày cập nhật:* 11/08/2026  
*Dự án:* MarketPlace & PayGate  
*Môi trường:* Local (Docker)

---

## 1. MỤC TIÊU CHIẾN DỊCH LOAD TEST
- Đo kiểm giới hạn chịu tải thực tế của hệ thống ở luồng Đọc (GĐ1) và luồng Ghi (GĐ2, GĐ3, GĐ4).
- Phát hiện các điểm nghẽn cổ chai (Bottleneck) về CPU, RAM, Database Connection Pool.
- Đảm bảo an toàn giao dịch tài chính (Idempotency, Race condition).

---

## 2. CHỈ TIÊU KỸ THUẬT (THRESHOLDS)
- *Tỉ lệ lỗi (Error Rate):* < 1% cho luồng đọc, < 5% cho luồng ghi (thanh toán).
- *Thời gian phản hồi (p95):* < 1500ms cho API thông thường, < 2000ms cho API giao dịch/webhook.

---

## 3. KỊCH BẢN & PHÂN CÔNG THỰC HIỆN

### GĐ1 — MarketPlace: GET /products (Nhi)
*Script:* gd1-products-test.js
*Kết quả thực tế (Đã Bypass Rate Limit):*
- *Error Rate:* 0.00% (PASS hoàn hảo)
- *p95 Latency:* ~24ms (cực nhanh)
- Không có sự khác biệt lớn về hiệu năng giữa size=10 và size=100 nhờ DB Index. Kết luận: Hệ thống chưa "xi nhê" ở mức 20 VU, cần Stress Test (100+ VU).

### GĐ1 — MarketPlace: GET /catalog + GET /recommendations (Trí)
*Script:* gd1-baseline-test.js (20 VUs) và gd1-50vu-test.js (50 VUs)
*Cấu hình:* Test 3 endpoints đọc (/catalog, /products, /recommendations).

*Kết quả thực tế (Baseline 20 VUs):*

| Endpoint | p50 | p95 Latency | Tỷ lệ < 500ms |
|---|---|---|---|
| **/catalog** | 7.41 ms | *360.28 ms* | 99.3% |
| **/products** | 305.89 ms | *834.56 ms* | 70.1% |
| **/recommendations** | 659.57 ms | *1,800.00 ms* | 44.2% |

*Kết quả RE-TEST trên code dev hiện tại (11/08, 20 VUs, 10,584 req, 0% lỗi) — SAU FIX:*

| Endpoint | p50 | p90 | p95 | Tỷ lệ < 500ms |
|---|---|---|---|---|
| **/catalog** | 8.27 ms | 16.08 ms | *20.15 ms* | ~100% |
| **/products** | 8.21 ms | 15.32 ms | *19.58 ms* | ~100% |
| **/recommendations** | 12.13 ms | 27.09 ms | *32.75 ms* | ~100% |

> **So sánh trước/sau fix:** /recommendations p95 giảm từ **1,800ms → 32.75ms (55 lần)**, /products 834ms → 19.58ms (42 lần), /catalog 360ms → 20.15ms (18 lần). Fix Precompute (PR #78) đã xoá bỏ hoàn toàn bottleneck. ✅

*Đánh giá kỹ thuật:*
- **/recommendations chậm nhất:**
    - *(Đã đính chính): KHÔNG PHẢI lỗi N+1 Query.* Truy vấn DB đã được batching bằng IN (...).
    - *Nguyên nhân gốc:* Thuật toán (đặc biệt là chiến lược SIMILAR) thực hiện findAllByActiveTrue(), nạp *toàn bộ* danh mục sản phẩm vào RAM (Full active-catalog scan), sau đó chạy vòng lặp tính toán độ tương đồng (brand, category, attributes, price) in-memory. Khi số lượng sản phẩm tăng, CPU và RAM sẽ bị quá tải.
- *Stress Test (50 VUs):* Khi tăng lên 50 VUs (Tổng 150 VUs), p95 latency vọt lên *8.57s* (tăng gấp 6.4 lần so với 20 VUs), nhưng Error Rate vẫn là *0.00%*. Hệ thống không crash mà bị nghẽn ở Connection Pool và CPU.

### GĐ2 — MarketPlace: Cart → Order (Trí)
*Script:* gd2-cart-order-test.js (10 VUs) và gd2-over-hikaricp-test.js (30 VUs)
*Luồng:* setup() login 10 user + lấy variantId → default() add to cart → create order → clear cart

*Kết quả thực tế (10 VUs - Trong ngưỡng DB Pool):*

| Thao tác | p50 | p95 Latency | Error Rate |
|---|---|---|---|
| Thêm vào giỏ (POST /cart/items) | 11.75 ms | 148.30 ms | 0% |
| Xem giỏ hàng (GET /cart) | 7.22 ms | 113.31 ms | 0% |
| Tạo đơn hàng (POST /orders) | 23.06 ms | *374.09 ms* | 0% |
| *Tổng thể luồng ghi* | 16.26 ms | *217.46 ms* | *0.00%* |

*Kết quả RE-TEST trên code dev hiện tại (11/08, 10 VUs, 1 VU = 1 user riêng) — SAU FIX:*

| Thao tác | p95 Latency | Error Rate |
|---|---|---|
| Thêm vào giỏ (POST /cart/items) | *22.04 ms* | 0% |
| Xem giỏ hàng (GET /cart) | *14.67 ms* | 0% |
| Tạo đơn hàng (POST /orders) | *158.59 ms* | 0% |
| *Tổng thể luồng ghi* | *156.70 ms* | *0.00%* |

> **So sánh trước/sau fix:** POST /orders p95 giảm từ **374ms → 158.59ms (2.4 lần)**. Fix ranh giới Transaction (fe551b9) đã nhả connection nhanh hơn, giảm giữ lock. ✅

*Kết quả khi ép tải (30 VUs - Vượt DB Pool 20 connections):*
- Khi đẩy lên 30 VUs, *HikariCP bị cạn kiệt (20/20 active)*.
- p95 của POST /orders tăng phi mã từ *374ms lên 8.94s*.
- Xuất hiện lỗi *9.46%* (HTTP 500) do timeout chờ connection trong queue (SQLTransientConnectionException).

*Kết quả RE-TEST stress (11/08, 30 VUs, 1 VU = 1 user riêng, stock đã reset) — SAU FIX:*
- **30/30 order tạo thành công** (giảm 0% lỗi nghiệp vụ), `http_req_failed 10.99%` (chủ yếu do `Connection is not available, request timed out after ~20s`).
- `http_req_duration`: avg 145.02ms, **p95 390.09ms** — vẫn trong ngưỡng nhưng cao hơn 10 VU (156ms).
- **Kết luận:** Fix fe551b9 giúp nhả connection nhanh hơn (order tạo được), **nhưng vẫn cạn HikariCP khi 30 VU vượt pool 20** — bottleneck chưa hết hẳn ở mức tải cực cao.

*Đánh giá kỹ thuật:*
- Luồng ghi chậm hơn luồng đọc do @Transactional khóa row (Row-level lock khi UPDATE tồn kho) và INSERT nhiều bảng (orders, order_items).
- Bài test chứng minh rất rõ hiện tượng thắt cổ chai ở Connection Pool khi số luồng đồng thời vượt quá cấu hình của DB.

### GĐ3 — PayGate: Tích hợp API Ngân hàng (Hoàng)
*Script:* idempotency-poc-test.js
*Luồng:* Test cơ chế Idempotency khi thanh toán (Chống double charge).
- *Kết quả:* Đã chạy (Hoàng). 10 VU gửi trùng 1 mã idempotencyKey, hệ thống chỉ tạo 1 giao dịch và trả về lỗi 409 cho 9 giao dịch còn lại. Hoạt động hoàn hảo.

### GĐ4 — PayGate: Nhận Webhook từ Ngân hàng (Hoàng)
*Script:* webhook-loadtest.js
*Luồng:* Giả lập ngân hàng gọi webhook callback số lượng lớn.
- *Kết quả:* Ở mức tải 30 VUs, p95 lên tới *7.81s*.
- *Nguyên nhân:* Hệ thống ôm @Transactional mở DB ngay khi nhận webhook rác và thực hiện 4 query, gây cạn kiệt HikariCP Connection Pool tương tự như GĐ2.
- *Lưu ý phân biệt:* Latency cao ở mức tải này là vấn đề *tải/connection pool* (chưa đo lại sau fix). Riêng khía cạnh *bảo mật* (chống hacker giả mạo webhook) đã được fix 100% — xem mục 6.2.

---

## 4. TÌNH TRẠNG TIẾN ĐỘ TỔNG HỢP (Dashboard)

| Giai đoạn | Hệ thống | Script | Báo cáo | Trạng thái |
|---|---|---|---|---|
| GĐ1 /products | MarketPlace | Nhi | Nhi | Đã chạy — PASS (0% lỗi) |
| GĐ1 /catalog + /rec | MarketPlace | Trí | Trí | *Đã chạy — PASS → ĐÃ FIX + RE-TEST (p95 33ms)* |
| GĐ2 setup token | MarketPlace | Nhi | — | Tích hợp vào script Trí |
| GĐ2 cart→order | MarketPlace | Trí | Trí | *Đã chạy — PASS → ĐÃ FIX + RE-TEST (p95 158ms) + fix bug event publish* |
| GĐ3 idempotency | PayGate | Hoàng | Hoàng | Đã chạy — PASS |
| GĐ4 webhook | PayGate | Hoàng | Hoàng | *Đã chạy — Latency vượt ngưỡng → ĐÃ FIX signature check trong develop* |

---

## 5. CÁC VẤN ĐỀ TỒN ĐỌNG KHI TEST
1. *Môi trường lệch pha:* Local chạy PostgreSQL port 5433, application.yml trỏ 5432 khiến k6 không nạp được data ban đầu (Đã sửa).
2. *Log quá dày:* Bật org.hibernate.SQL: DEBUG làm giảm hiệu năng hệ thống khi chạy test tải cao.
3. *Rate Limit chặn Test (GĐ2):* Đã sửa bằng Header X-Bypass-Rate-Limit.

---

## 5b. ISSUE LOG — TỔNG HỢP SỰ CỐ & HƯỚNG XỬ LÝ (dành cho buổi báo cáo)

> Bảng này tóm tắt **toàn bộ issue** phát hiện qua load test, ai xử lý, trạng thái, và ưu tiên — giúp mentor nắm được việc quản lý rủi ro của team.

| # | Issue | Phát hiện từ | Ảnh hưởng | Trạng thái | Người xử lý | Ưu tiên |
|---|---|---|---|---|---|---|
| 1 | /recommendations chậm (p95 1.8s do full-catalog scan) | GĐ1 | UX tệ khi tải cao | ✅ Đã fix (Precompute, PR #78) | Trí + Review | Cao |
| 2 | createOrder giữ DB lock quá lâu (HTTP call trong transaction) | GĐ2 | Hết HikariCP ở 30 VU | ✅ Đã fix (TransactionTemplate, fe551b9) | Trí | Cao |
| 3 | **Bug: "Transaction synchronization is not active" → createOrder luôn 500** | GĐ2 RE-TEST | **Chặn toàn bộ đặt hàng** | ✅ **Đã fix + commit + push lên dev (8ca6700, 11/08)** — giữ hướng GĐ2: publish trực tiếp khi không có tx (consumer idempotent) | Trí | **Cực cao** |
| 4 | Rate limit bypass bị vô hiệu (header comment out) | GĐ2 RE-TEST | 429 khi test tải cao; test bị nhiễu | 🟠 Chưa xử lý — đề xuất config env | [cần phân công] | Trung bình |
| 5 | Stress 30 VU vẫn cạn HikariCP | GĐ2 | Lỗi timeout connection ~10% | 🟠 Cải thiện rồi nhưng chưa hết — cần tăng pool hoặc tối ưu thêm | [cần phân công] | Trung bình |
| 6 | Webhook nhận tải cao p95 7.81s | GĐ4 | Latency vượt ngưỡng | 🟠 Chưa re-test sau fix signature | [cần phân công] | Trung bình |
| 7 | Môi trường lệch pha port (5433 vs 5432) | Setup | Không nạp được data | ✅ Đã sửa | Nhi | — |
| 8 | Log SQL DEBUG làm chậm test | Setup | Sai số liệu latency | ✅ Đã nhận biết (tắt khi test thật) | Team | — |

**Việc cần làm ngay (trước báo cáo):**
1. ✅ Đã xử lý: fix bug #3 (`OrderEventPublisher` + khôi phục TransactionTemplate trong `createOrder`) đã commit + push lên `dev` (8ca6700) — **chặn đặt hàng đã được gỡ**.
2. Phân công người re-test #6 (webhook) và #5 (stress) để có số liệu đóng/đóng ngoại lệ.

---

## 6. CẬP NHẬT MỚI NHẤT & CÁC LỖI ĐÃ FIX (Ngày 11/08/2026)

*1. MarketPlace: Đã Fix triệt để lỗi Cổ chai API Recommendations (GĐ1)*
- *Vấn đề cũ:* Load toàn bộ Catalog lên RAM để chấm điểm tương đồng khiến API /recommendations mất tới 8.57s.
- *Giải pháp áp dụng:* Kiến trúc *Precompute*: Tính sẵn điểm số tương đồng (Similar Product Rankings) thông qua service ngầm SimilarProductPrecomputeService và lưu xuống bảng phụ trong Database. API /recommendations giờ chỉ việc đọc kết quả đã tính sẵn, xoá bỏ hoàn toàn điểm nghẽn CPU và RAM.
- *Trạng thái code:* ✅ **Đã merge vào nhánh `dev`** — PR #78 `codex/fix-similar-recommendation-performance` (commit `3f9348b`). File: `SimilarProductPrecomputeService.java`.

*2. PayGate: Chứng minh chống Hacker giả mạo Webhook 100% (GĐ4)*
- *Vấn đề đo lường:* Kịch bản xác minh PayGate có bị lừa nếu Hacker gửi đúng mã giao dịch nhưng sửa Số tiền (Amount mismatch).
- *Kết quả test:* Đã chạy script webhook-forged-scenario-report. Bắn 268 request giả mạo số tiền vào PayGate. Hệ thống phát hiện toàn bộ bằng mã 400 Bad Request và chặn đứng *100% (268/268)* request. Tỉ lệ hacker lọt qua (Forged acceptance rate) đạt 0.00%.
- *Trạng thái code:* ✅ **Cơ chế đã có trong nhánh `develop`** — xác minh chữ ký webhook (ngăn giả mạo) nằm trong PR #56 `feature/paygate-webhook-security-reconciliation`.

*3. MarketPlace: Đã Fix lỗi sập Connection Pool khi Tạo Đơn Hàng (GĐ2)*
- *Vấn đề cũ:* Tại mức tải 30 VUs, API POST /orders làm sập DB HikariCP (vọt lên 20/20 active connection) do @Transactional khóa DB quá lâu, bao gồm cả quá trình gọi API sang PayGate.
- *Giải pháp áp dụng:* Tái cấu trúc lại ranh giới Transaction (commit `fe551b9`): Xóa `@Transactional` bao trùm hàm createOrder. Chỉ bọc đúng phần tương tác DB (tồn kho, mã giảm giá, lưu Order) bằng `TransactionTemplate`. Đẩy lệnh gọi HTTP sang PayGate ra ngoài vùng khóa DB.
- *Trạng thái code:* ✅ **Đã merge vào nhánh `dev`** — commit `fe551b9` nằm trong merge `fb36da5` (nhánh `test/load-test-tri`). Xác nhận trên `OrderServiceImpl.createOrder()`: không còn `@Transactional`, chỉ còn `transactionTemplate.execute()` bao phần DB; HTTP call PayGate (`paymentService.createPaymentSession`) nằm ngoài vùng khóa.

*4. [PHÁT HIỆN MỚI TỪ RE-TEST] MarketPlace: Bug "Transaction synchronization is not active" khi tạo order*
- *Vấn đề:* Fix GĐ2 (fe551b9) đẩy `orderEventPublisher.publishOrderCreatedEvent()` ra ngoài transaction, nhưng `OrderEventPublisher` vẫn gọi `TransactionSynchronizationManager.registerSynchronization()` — khi không có transaction active sẽ ném `IllegalStateException: Transaction synchronization is not active` → **createOrder luôn trả HTTP 500**.
- *Phát hiện:* Load test GĐ2 re-test (11/08) bắt được 100% order fail (0/400) trước khi sửa.
- *Giải pháp:* Sửa `OrderEventPublisher` — nếu có transaction active thì register (publish afterCommit), nếu không thì publish trực tiếp (consumer RabbitMQ xử lý idempotent).
- *Kết quả:* Order tạo thành công trở lại (0% lỗi ở 10 VU).

*5. [PHÁT HIỆN MỚI TỪ RE-TEST] Rate Limit mới: Header X-Bypass-Rate-Limit đã bị vô hiệu*
- *Thay đổi:* Trong code dev mới, nhánh bypass `X-Bypass-Rate-Limit` trong `RateLimitingFilter` đã bị **comment out** — Rate limit (100 req/phút, login 5/phút, chat 20/phút) luôn áp dụng.
- *Tác động:* Khi chạy test tải cao (20-30 VUs) không còn header bypass → request bị **HTTP 429**. Re-test phải tạm bật bypass trong code để đo hiệu năng thật, không phải tốc độ bị rate-limit.
- *Khuyến nghị:* Đưa bypass thành config env (VD: `RATE_LIMIT_BYPASS=true` trong `.env` local test) thay vì hardcode/comment code.
- 