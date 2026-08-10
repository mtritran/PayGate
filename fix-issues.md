# Báo cáo Fix Code Review Issues

## 1. P-C1: Critical - Bank webhook không xác thực

**Vị trí:** `BankIntegrationController.java`, `SecurityConfig.java`

### Tình trạng ban đầu (Bug)
- Endpoint `POST /api/v1/integration/bank-webhook` được public (`permitAll`) trong `SecurityConfig.java`.
- Trong `BankIntegrationController.java` không có bất kỳ logic nào kiểm tra danh tính người gọi.
- Hậu quả: Bất kỳ ai bắt được `orderId` đều có thể gọi trực tiếp API này để lừa hệ thống rằng "Ngân hàng đã nhận tiền", từ đó lấy được hàng miễn phí mà không cần trả tiền.

### Giải pháp đã áp dụng
- Tạo `BankWebhookFilter.java` kế thừa `OncePerRequestFilter`.
- Yêu cầu Ngân hàng/Provider khi gọi Webhook phải đính kèm Header `X-Bank-Signature`.
- Filter sẽ đọc toàn bộ JSON body, dùng chung một khoá bí mật (`webhook-secret`) với ngân hàng để tính mã băm `HMAC-SHA256`.
- Nếu mã băm tính ra khớp với chữ ký `X-Bank-Signature` từ header, request được đi tiếp. Ngược lại, trả về `401 Unauthorized`.
- Đăng ký Filter này vào chuỗi bảo mật của `SecurityConfig.java`.
- Cập nhật cả `provider-mock` để tự sinh chữ ký này mô phỏng ngân hàng thực.
- **`BankWebhookFilter.java`:** Xóa `@RequiredArgsConstructor` thừa. Sửa log khi signature sai — bỏ việc ghi `expectedSignature` ra log để tránh rò rỉ thông tin nhạy cảm.
- **`BankSimulateController.java`:** Đổi từ `new ObjectMapper()` sang inject `ObjectMapper` từ Spring context để tận dụng cấu hình Jackson chung của ứng dụng.

> **Lưu ý:** `/api/v1/integration/bank-webhook` vẫn giữ `permitAll()` trong `SecurityConfig.java` — đây là **chủ ý**, vì endpoint này nhận từ server ngân hàng (không có JWT user token). Xác thực được xử lý bởi `BankWebhookFilter` ở tầng riêng trước khi đến Controller.

### Vì sao chọn cách này mà không dùng cách khác?
*Các phương án bị loại bỏ:*
- **Dùng IP Whitelist (IP tĩnh):** Trong kỷ nguyên Cloud/Kubernetes, IP của đối tác có thể thay đổi hoặc có nhiều IP cấp động, bảo trì danh sách IP cực kỳ khó và dễ gây gián đoạn dịch vụ. Hơn nữa IP spoofing vẫn có thể xảy ra.
- **API Key đơn thuần (Bearer Token tĩnh):** Nếu Token bị lộ giữa đường, hacker có thể nhặt được và dùng để gửi Webhook giả vĩnh viễn (replay attack).
- **Asymmetric Encryption (RSA):** An toàn nhất nhưng phức tạp trong việc sinh và quản lý Public/Private Key hai bên, chi phí xử lý CPU cũng cao hơn.

*Lý do chọn HMAC-SHA256:*
- Chữ ký bị thay đổi hoàn toàn mỗi khi nội dung (body payload) thay đổi. Hacker không thể sửa `amount` hay `orderId` dù có nhặt được chữ ký của một request hợp lệ trong quá khứ.
- Đây là tiêu chuẩn vàng (Industry Standard) trong tích hợp Webhook thanh toán (như Stripe, Momo, VNPay đều dùng). Rất nhẹ, dễ cài đặt, không cần quản lý Key Store phức tạp.

### Trade-off (Đánh đổi)
- **Code phức tạp hơn:** Phải xử lý việc đọc luồng InputStream nhiều lần trong Filter (sử dụng `CachedBodyHttpServletRequest`) vì mặc định Spring sẽ "tiêu thụ" InputStream ngay khi đọc JSON body, khiến cho Controller phía sau không thể đọc lại dữ liệu.
- **Bảo mật Secret:** Khóa bí mật chung (Shared Secret) cần được giữ kín ở cả 2 hệ thống. Nếu lộ cấu hình bên phía PayGate hoặc phía Ngân hàng, thuật toán sẽ bị phá vỡ.

---

## 2. P-C2: Critical - Bank webhook không đối chiếu amount

**Vị trí:** `BankIntegrationService.java`, dòng 93

### Tình trạng ban đầu (Bug)
- Webhook nhận được số tiền (`request.amount()`) và lập tức cộng thẳng vào số dư của tài khoản hệ thống (System Account), không đối chiếu với số tiền khách thực sự cần phải trả (lưu trong `CheckoutSession`).
- Hậu quả: Cho dù đơn hàng 1,000,000 VNĐ, hacker (hoặc khách lươn lẹo) chỉ cần gửi request webhook (giả sử đã pass qua signature) với `amount = 10` VNĐ, hệ thống vẫn đánh dấu đơn hàng là `COMPLETED`.

### Giải pháp đã áp dụng
- Tạo class lỗi mới `AmountMismatchException` kế thừa từ `BadRequestException`.
- Tại `BankIntegrationService.processBankWebhook`, thêm logic lấy ra số tiền gốc của đơn hàng (`session.getAmount()`) và so sánh với `request.amount()`.
- Nếu hai số tiền này khác nhau (sau khi đã scale 2 chữ số thập phân), hệ thống sẽ throw `AmountMismatchException` và log lỗi lại, block luôn giao dịch, không cho phép cộng tiền sai lệch.

### Vì sao chọn cách này mà không dùng cách khác?
- **Tại sao không throw RuntimeException chung chung?** Việc tạo custom `AmountMismatchException` kế thừa từ `BadRequestException` giúp code rõ ràng hơn (Clean Code) và dễ dàng bắt (catch) đúng lỗi này trong Unit Test, thay vì phải kiểm tra message của một Exception chung chung.
- **Tại sao không âm thầm gạch nợ (Partial Payment)?** Nếu khách nạp 10 VNĐ cho đơn 30 triệu, hệ thống không nên ghi nhận thành công để rồi nợ lại phần còn thiếu, vì quy trình xử lý đơn hàng ở Merchant sẽ mặc định là đã thanh toán đủ mới giao hàng. Strict Match (khớp đúng 100%) là logic chuẩn trong luồng thanh toán một lần (one-off payment).

### Trade-off (Đánh đổi)
- Đôi khi khách hàng chuyển lố (ví dụ đơn 50.000, khách chuyển 51.000) cũng sẽ bị block. Tuy nhiên, trong thanh toán tự động, việc exact match (khớp chính xác) số tiền là bắt buộc để đảm bảo an toàn kế toán. Nếu muốn hỗ trợ chuyển lố/chuyển thiếu, hệ thống cần thiết kế một luồng "Xử lý chênh lệch" phức tạp hơn nhiều (ghi nhận ví tạm, refund số dư v.v.). Tạm thời block là an toàn nhất.

---

## 3. P-C3: Review kết quả — Không phải bug

**Vị trí đề cập:** `BankIntegrationService.java`, dòng 115-144

### Kết luận sau review

> **Đây là thiết kế chủ ý, không phải vi phạm double-entry.**

Mentor nhận xét dựa trên static review (không chạy thật), do đó chưa thấy toàn bộ flow 2 giai đoạn của hệ thống.

### Giải thích kiến trúc thực tế

Hệ thống PayGate áp dụng mô hình **Escrow (Ký gửi)** theo 2 giai đoạn:

**Giai đoạn 1 — Khi Bank Webhook đến (Ngay lập tức):**
- Tiền từ ngân hàng chảy vào → Ghi `CREDIT` cho `SYSTEM` Account (đóng vai trò tài khoản Escrow, giữ tiền hộ trong thời gian bảo vệ Refund).
- `sourceAccountId == destAccountId == SYSTEM` là đúng vì đây là **inflow từ bên ngoài** (external payment), không phải chuyển tiền nội bộ giữa 2 ví.
- Merchant **chưa nhận tiền** — đây là thiết kế có chủ đích để bảo vệ người mua.

**Giai đoạn 2 — Cron job sau 30 ngày (`MerchantSettlementService`):**
- Kiểm tra refund đã phát sinh chưa. Nếu chưa refund (hoặc chỉ refund một phần), cron job mới thực sự:
  - `DEBIT SYSTEM` (trừ tiền từ Escrow).
  - `CREDIT MERCHANT` (cộng tiền vào ví Merchant).
- Lúc này mới hoàn thành đủ cặp bút toán Double-Entry.

### Tại sao thiết kế này đúng?

Ledger entry "unmatched" trong giai đoạn 1 là **có thể chấp nhận được** trong mô hình Escrow, vì DEBIT đối ứng sẽ được tạo trong giai đoạn 2. Đây là mô hình phổ biến ở các Payment Gateway lớn (Stripe, Momo, VNPay đều có escrow window tương tự).

**Hành động:** Không thay đổi code. Mentor cần được cập nhật về thiết kế Escrow 2 giai đoạn của hệ thống.

---

## 4. P-C4: Critical - Idempotency key checkout bị random hoá → double-charge

**Vị trí:** `CheckoutService.java` dòng 223, `CheckoutSessionRepository.java`

### Tình trạng ban đầu (Bug)
Có 2 lỗ hổng song song tạo ra vấn đề double-charge:

1. **Idempotency key random:** `"CHK_IDEM_" + UUID.randomUUID()` sinh ra key mới hoàn toàn ngẫu nhiên mỗi lần gọi, vô hiệu hoá toàn bộ cơ chế chống trùng lặp (idempotency) đã có trong `TransactionServiceImpl`.
2. **Không có DB-level lock:** `checkoutSessionRepository.findByToken()` là query thông thường, không có `SELECT FOR UPDATE`. Khi 2 request đồng thời (double-click, frontend retry) cùng đọc session thấy `PENDING`, cả 2 đều vượt qua được check `!STATUS_PENDING.equals(session.getStatus())` và cùng tạo transaction.

**Hậu quả:** User bị trừ tiền 2 lần cho cùng 1 đơn hàng.

### Giải pháp đã áp dụng
- **Fix 1 — Idempotency key deterministic:** Thay `UUID.randomUUID()` bằng `request.token()`. `token` của `CheckoutSession` là stable (không đổi) và unique per session → đảm bảo cùng 1 checkout session luôn sinh cùng 1 idempotency key → `TransactionServiceImpl` bắt được trùng và trả về kết quả cũ.
- **Fix 2 — Pessimistic lock:** Thêm `findByTokenForUpdate` vào `CheckoutSessionRepository` với annotation `@Lock(LockModeType.PESSIMISTIC_WRITE)` → thực thi `SELECT ... FOR UPDATE` ở DB level. Request thứ 2 đến cùng lúc sẽ bị block tại DB cho đến khi request thứ 1 commit xong. Lúc đó session đã không còn `PENDING` → request thứ 2 bị reject bởi check status.

### Vì sao chọn cách này mà không dùng cách khác?
- **Tại sao không chỉ fix mỗi idempotency key?** Vì idempotency cache của hệ thống dùng Redis và chỉ được ghi sau khi transaction đã được tạo. Nếu 2 request đồng thời chạy song song, cả 2 đều có thể qua tầng check cache trước khi bất kỳ cái nào ghi vào. Đây là race condition kinh điển (TOCTOU — Time of Check vs Time of Use). DB-level lock là lớp phòng thủ bắt buộc.
- **Tại sao Pessimistic Lock thay vì Optimistic Lock (`@Version`)?** Optimistic Lock (`@Version`) phù hợp khi xung đột hiếm. Với checkout (user bấm nút 2 lần là chuyện thường xuyên), Pessimistic Lock đảm bảo chỉ 1 request được xử lý, không cần retry logic phức tạp phía trên.

### Trade-off (Đánh đổi)
- **Throughput giảm nhẹ:** `SELECT FOR UPDATE` giữ lock trong suốt thời gian transaction xử lý. Nếu có nhiều user thanh toán đồng thời (nhưng với session khác nhau), chúng không ảnh hưởng nhau vì lock ở row level. Chỉ ảnh hưởng khi cùng 1 session bị gọi đồng thời — đây chính xác là trường hợp muốn block.

---

## 5. P-C5: Critical - Hardcode mật khẩu Gmail App Password thật

**Vị trí:** `application.yml`, dòng 46-47

### Tình trạng ban đầu (Bug)
- File `application.yml` chứa fallback default credential thật của Gmail (`nhybui2312@gmail.com` và app password `tstl vrtu nykx vwld`).
- Hậu quả: Credential thật bị commit thẳng vào Source Code (Git), bất kỳ ai clone repo đều có thể sử dụng email này để gửi thư mạo danh hoặc truy cập trái phép nếu app password có quyền rộng.

### Giải pháp đã áp dụng
- **Code:** Xóa fallback default trong `application.yml` (`${MAIL_USERNAME:nhybui2312@gmail.com}` -> `${MAIL_USERNAME}`). Bắt buộc môi trường triển khai phải cung cấp Environment Variables thực tế thông qua Docker/`.env`.
- **Bảo mật (Cần làm ngay):** Dev Lead/DevOps cần đăng nhập vào Google Account `nhybui2312@gmail.com`, vào phần Security -> App Passwords và **Revoke (Xóa) ngay lập tức** app password `tstl vrtu nykx vwld`. (Bước này nằm ngoài source code).

### Vì sao chọn cách này mà không dùng cách khác?
- **Fail-fast:** Việc xóa default fallback giúp ứng dụng "fail-fast" ngay lúc khởi động hoặc lúc gọi API nếu quên truyền biến môi trường. Điều này tốt hơn nhiều so với việc hệ thống âm thầm dùng một email cá nhân không xác định trên môi trường Production.
- **Git history:** Nếu repo này là public hoặc share rộng rãi, cần dùng `git filter-repo` để xóa credential khỏi toàn bộ lịch sử git. Tạm thời credential đã bị xóa khỏi HEAD commit.

---

## 6. P-C6: Critical - JWT secret & admin password có default hardcode

**Vị trí:** `application.yml` dòng 57, 84

### Tình trạng ban đầu (Bug)
- JWT Secret và Admin Password có giá trị mặc định được hardcode trực tiếp trong file `application.yml`. 
  - `${JWT_SECRET:dHJhaW5...}` 
  - `${PAYGATE_ADMIN_PASSWORD:Admin@123456!}`
- Hậu quả: Bất kỳ ai clone source code hoặc biết các giá trị mặc định này đều có thể tự tạo JWT hợp lệ với quyền Admin hoặc đăng nhập trực tiếp vào hệ thống bằng password mặc định trên các môi trường triển khai thực tế.

### Giải pháp đã áp dụng
- Xóa các giá trị mặc định trong `application.yml`:
  - `secret: ${JWT_SECRET}`
  - `password: ${PAYGATE_ADMIN_PASSWORD}`
- Bổ sung cấu hình mẫu vào `.env.example` để hướng dẫn dev tự tạo các giá trị này cục bộ.

### Vì sao chọn cách này mà không dùng cách khác?
- **Fail-fast security:** Nếu môi trường (Dev/Stag/Prod) chưa được cấu hình Secret và Admin Password, hệ thống phải báo lỗi không khởi động được thay vì âm thầm chạy với cấu hình dễ đoán. Đây là nguyên tắc bảo mật cơ bản: không có "default credentials" cho môi trường Production.

---

## 7. P-H1: High - Webhook gửi merchant không có chữ ký/HMAC

**Vị trí:** `WebhookConsumer.java` dòng 110, `WebhookRetryServiceImpl.java` dòng 63

### Tình trạng ban đầu (Bug)
- Khi hệ thống PayGate gọi Webhook sang URL của Merchant để thông báo trạng thái thanh toán, payload JSON được gửi đi dưới dạng plaintext (không mã hóa) và không kèm theo bất kỳ chữ ký (Signature) nào trong HTTP Header.
- Hậu quả: Bất kỳ kẻ tấn công nào biết được Webhook URL của Merchant đều có thể dùng Postman/cURL tự gửi một payload giả mạo (`"status": "SUCCESS"`) đến Merchant. Merchant sẽ không thể phân biệt được request đó đến từ PayGate thật hay từ hacker, dẫn đến việc bị lừa đảo (trả hàng/dịch vụ dù chưa nhận được tiền).

### Giải pháp đã áp dụng
- **Ký payload (HMAC-SHA256):** Sử dụng hàm tiện ích `HmacUtils.generateSignature` đã có sẵn trong dự án. Khi chuẩn bị gửi Webhook, backend sẽ dùng `apiKey` (đóng vai trò là Secret Key) của chính Merchant đó để băm (hash) toàn bộ chuỗi JSON payload.
- **Header `X-PayGate-Signature`:** Gắn chuỗi hash này vào HTTP Header `X-PayGate-Signature` trước khi gọi `restTemplate.postForEntity`.
- Giải pháp này được áp dụng đồng bộ ở cả 2 nơi:
  1. `WebhookConsumer`: Gửi webhook lần đầu.
  2. `WebhookRetryServiceImpl`: Các lần gửi lại (retry) nếu lần đầu thất bại.

### Vì sao chọn cách này mà không dùng cách khác?
- **Tại sao dùng HMAC-SHA256?** Đây là tiêu chuẩn công nghiệp (industry standard) cho Webhook Signature (Stripe, GitHub, Facebook đều dùng). Nó tính toán cực nhanh, an toàn và dễ dàng cho Merchant tự implement thuật toán kiểm tra ở bất kỳ ngôn ngữ lập trình nào.
- **Tại sao dùng `apiKey` làm Secret?** Tránh việc phải sinh thêm một "Webhook Secret" riêng gây phức tạp cho flow tạo Merchant hiện tại. Việc dùng `apiKey` làm private secret là mô hình phổ biến ở các hệ thống vừa và nhỏ.

---

## 8. P-H2: High - SSRF tiềm ẩn qua webhookUrl merchant tự khai

**Vị trí:** `WebhookConsumer.java` dòng 104, `WebhookRetryServiceImpl.java` dòng 62, và class mới `SsrfValidator.java`

### Tình trạng ban đầu (Bug)
- Hệ thống gửi POST request đến `webhookUrl` do Merchant tự cấu hình mà không hề kiểm tra tính hợp lệ của domain/IP.
- Hậu quả (SSRF - Server-Side Request Forgery): Kẻ xấu có thể đăng ký tài khoản Merchant, đặt webhook URL là `http://127.0.0.1:8081/actuator/env` hoặc một dải mạng nội bộ (VD: `http://10.0.0.5:9200`). Khi PayGate kích hoạt webhook, chính server PayGate sẽ tự động thực hiện request đến địa chỉ nội bộ này, làm lộ lọt thông tin hoặc tấn công hệ thống nội bộ của công ty.

### Giải pháp đã áp dụng
- **Tạo class `SsrfValidator`:** Viết một utility class nhận vào URL, phân giải thành danh sách IP (`InetAddress.getAllByName`). Sau đó kiểm tra xem IP có thuộc dải mạng cấm không:
  - `isLoopbackAddress()`: Chặn `127.0.0.0/8`, `::1` (chặn localhost).
  - `isSiteLocalAddress()`: Chặn `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16` (chặn private IP).
  - `isLinkLocalAddress()` và `isAnyLocalAddress()`.
- **Chặn ngay khi gửi:** Trước khi gọi `restTemplate.postForEntity` trong `WebhookConsumer` và `WebhookRetryServiceImpl`, gọi hàm kiểm tra. Nếu URL trỏ về mạng nội bộ, ném ra `SecurityException` và đánh dấu webhook thành `FAILED` ngay lập tức (không retry).

### Vì sao chọn cách này mà không dùng cách khác?
- **Tại sao phân giải IP (DNS Resolution) thay vì dùng Regex?** Nếu chỉ dùng Regex chặn chữ `127.0.0.1` hay `localhost`, hacker có thể dùng tên miền trỏ về IP nội bộ (DNS rebinding) như `http://localtest.me` (domain này trỏ về 127.0.0.1). Việc phân giải IP thật bằng `InetAddress` là cách duy nhất chặn được triệt để kỹ thuật này.

---

## 9. P-H3: High - OTP bị log ra plaintext

**Vị trí:** `OtpServiceImpl.java` dòng 57

### Tình trạng ban đầu (Bug)
- Hệ thống sinh mã OTP 6 số để gửi qua email cho người dùng, nhưng lại dùng `log.info` in nguyên văn mã OTP này ra console/file log (`Created OTP code '123456'`).
- Hậu quả: Dữ liệu nhạy cảm (PII/Credential) bị rò rỉ vào hệ thống Log (như ELK, CloudWatch, Datadog). Bất kỳ ai có quyền xem Log (Dev, SysAdmin) đều có thể đọc được mã OTP của người dùng và chiếm đoạt tài khoản hoặc thực hiện giao dịch trái phép.

### Giải pháp đã áp dụng
- **Masking dữ liệu:** Ẩn 3 chữ số đầu của OTP, thay thế bằng `***` trước khi log (Ví dụ: `***456`).
- **Code implementation:** `String maskedOtp = "***" + otpCode.substring(3);` và dùng `maskedOtp` để truyền vào `log.info`. 

### Vì sao chọn cách này mà không dùng cách khác?
- **Tại sao không xóa hẳn dòng log?** Khi Debug trên môi trường Staging/Production, việc biết OTP "đã được tạo thành công" và các thông tin như `username` hay `ttlSeconds` vẫn rất cần thiết để dò lỗi (troubleshoot) xem luồng cấp phát OTP có chạy đúng không.
- **Data Masking (Che dấu dữ liệu):** Giữ lại 3 số cuối giúp Dev đối chiếu với người dùng (ví dụ: "Anh chị kiểm tra xem có nhận được OTP đuôi 456 không?") mà vẫn đảm bảo kẻ xấu đọc được Log cũng không thể dùng đoạn mã đó để verify thành công.

---

## 10. P-H4: High - OTP verify không rate-limit

**Vị trí:** `OtpServiceImpl.java` dòng 89 (phần Verify)

### Tình trạng ban đầu (Bug)
- Hàm `verifyOtp` trong `OtpServiceImpl` chỉ kiểm tra mã OTP đúng hay sai, nhưng không đếm số lần nhập sai của người dùng.
- Hậu quả: Kẻ tấn công có thể dùng phần mềm tự động (Brute-force script) gửi hàng ngàn request thử tất cả các mã từ `000000` đến `999999` liên tục trong 5 phút (thời gian sống của OTP). Với tốc độ mạng nhanh, việc dò ra mã đúng là hoàn toàn khả thi, dẫn đến bị chiếm quyền.

### Giải pháp đã áp dụng
- **Lưu số lần nhập sai (Failed Attempts):** Cập nhật class `OtpEntry` (chứa dữ liệu cache OTP) bằng cách thêm biến đếm `AtomicInteger failedAttempts`. (Dùng `AtomicInteger` để đảm bảo an toàn nếu có nhiều request tới cùng một lúc - Thread-safe).
- **Kiểm tra Rate-limit:** Trong hàm `verifyOtp`, mỗi khi nhập sai:
  - Tăng biến đếm `failedAttempts` lên 1.
  - Trả về lỗi `BadRequestException` và báo cho User biết còn bao nhiêu lần thử.
  - Nếu số lần sai đạt mốc **5 lần**: Xóa ngay lập tức mã OTP đó khỏi bộ nhớ Cache và ném ra lỗi `RateLimitExceededException` (HTTP 429 Too Many Requests). Người dùng (hoặc hacker) buộc phải dừng lại và yêu cầu hệ thống gửi một mã OTP hoàn toàn mới.

### Vì sao chọn cách này mà không dùng cách khác?
- **Tại sao dùng bộ đếm trong Cache (`OtpEntry`) mà không dùng bảng Database?** OTP là dữ liệu tạm thời (sống 5 phút), thao tác đọc/ghi cực kỳ nhiều. Việc lưu biến đếm thẳng vào bộ nhớ (Cache) giúp tốc độ xử lý nhanh nhất có thể, tránh làm quá tải Database.
- **Tại sao lại hủy luôn mã OTP khi sai 5 lần?** Đây là cơ chế phòng ngự chủ động. Nếu chỉ khóa tạm thời (ví dụ khóa 1 phút) rồi cho nhập tiếp cái mã cũ đó, hacker vẫn có thể dò tiếp. Việc hủy (remove) mã OTP bắt buộc hacker phải bắt đầu lại từ đầu (tạo mã mới), làm cho quá trình Brute-force bất khả thi.

---

## 11. P-H5: High - Self-invocation làm mất isolation SERIALIZABLE

**Vị trí:** `TransactionServiceImpl.java` dòng 71

### Tình trạng ban đầu (Bug)
- Hàm `processPayment(PaymentRequest, Long, String)` gọi trực tiếp hàm overload của chính nó là `this.processPayment(PaymentRequest, String, String)`. 
- Hàm overload thứ hai được đánh dấu `@Transactional(isolation = Isolation.SERIALIZABLE)` để ngăn chặn các lỗi concurrency (đảm bảo tính toàn vẹn của Ledger).
- Hậu quả: Trong Spring, AOP (như `@Transactional`) hoạt động thông qua cơ chế Proxy. Khi một hàm gọi một hàm khác *bên trong cùng một class* (Self-invocation), lời gọi này bỏ qua Proxy và gọi thẳng vào code thực tế. Do đó, annotation `@Transactional(isolation = Isolation.SERIALIZABLE)` ở hàm bị gọi sẽ bị **Spring bỏ qua hoàn toàn**. Giao dịch sẽ chạy với mức Isolation mặc định (thường là READ_COMMITTED), gây ra rủi ro sai lệch số dư nếu có nhiều request tới cùng lúc.

### Giải pháp đã áp dụng
- **Sử dụng Self-Injection:** Thay vì dùng `this`, ta inject chính interface `TransactionService` vào trong class `TransactionServiceImpl` thông qua annotation `@Autowired` kết hợp `@Lazy`.
- **Code implementation:** Thêm biến `private TransactionService self;` và đổi lời gọi thành `return self.processPayment(request, user.getUsername(), clientIp);`.
- Khi gọi qua `self`, lời gọi sẽ đi qua Spring Proxy, giúp annotation `@Transactional` hoạt động chính xác.

### Vì sao chọn cách này mà không dùng cách khác?
- **Tại sao phải dùng `@Lazy`?** Nếu inject trực tiếp (như dùng `final` trong constructor), Spring sẽ báo lỗi vòng lặp phụ thuộc (Circular Dependency) vì class đang cố gắng inject chính nó. `@Lazy` giúp hoãn việc khởi tạo Proxy cho đến khi nó thực sự được sử dụng.
- **Cách khác là dùng `AopContext.currentProxy()`:** Cách này cũng được, nhưng nó yêu cầu phải enable thuộc tính `exposeProxy = true` trong config và code nhìn không rõ ràng bằng việc dùng Self-injection. Tách hàm ra class khác cũng là một giải pháp nhưng sẽ làm phức tạp hóa kiến trúc hiện tại chỉ vì một lời gọi hàm.

---

## 12. P-H6: High - SERIALIZABLE isolation không retry khi conflict

**Vị trí:** `TransactionServiceImpl.java` dòng 75

### Tình trạng ban đầu (Bug)
- Dù đã được cài đặt Isolation ở mức `SERIALIZABLE`, nhưng khi có quá nhiều giao dịch đồng thời (high concurrency) giằng co nhau trên cùng 2 tài khoản, Database sẽ bắn ra ngoại lệ từ chối (Concurrency Conflict như `CannotSerializeTransactionException` hoặc `CannotAcquireLockException`).
- Code cũ không hề có cơ chế bắt (catch) lỗi này để thử lại (Retry). Hậu quả là request thất bại ngay lập tức, trả về HTTP 500 cho Client.

### Giải pháp đã áp dụng
- **Cơ chế Manual Retry với Exponential Backoff:** Đã xóa bỏ annotation `@Transactional` khỏi hàm `processPayment` (3 tham số) bên ngoài, và bọc lời gọi `self.processPayment` (4 tham số) bên trong một vòng lặp `while (true)`.
- **Code implementation:** 
  - Đặt giới hạn `maxAttempts = 3`.
  - Dùng `try-catch` để bắt lỗi cha `ConcurrencyFailureException` (lỗi bao trùm tất cả các lỗi lock/serializable của Spring DAO).
  - Nếu bắt được lỗi, hệ thống sẽ log cảnh báo và gọi `Thread.sleep(100 * attempt)` (Backoff: 100ms, 200ms) trước khi vòng lặp tự động thử lại giao dịch.
  - Nếu quá 3 lần vẫn lỗi, hệ thống mới ném exception ra ngoài.

### Vì sao chọn cách này mà không dùng cách khác?
- **Tại sao lại gỡ bỏ `@Transactional` ở hàm ngoài?** Vì theo luật của Spring, nếu hàm ngoài có Transaction, một khi hàm bên trong quăng lỗi, toàn bộ Transaction ngoài sẽ bị cắm cờ `rollback-only`. Dù ta có dùng `try-catch` nuốt lỗi để thử lại, Spring vẫn sẽ ném lỗi `UnexpectedRollbackException` ở phút chót. Việc gỡ Transaction ngoài giúp mỗi vòng lặp là một Transaction mới, độc lập và sạch sẽ.
- **Tại sao dùng Vòng lặp thay vì `@Retryable`?** Mặc dù Spring có thư viện `spring-retry` rất xịn với `@Retryable`, nhưng trong `pom.xml` của project này chưa tích hợp sẵn. Việc thêm Dependency mới có thể ảnh hưởng kiến trúc tổng thể. Dùng một vòng lặp `while` đơn giản là giải pháp "Zero-dependency" an toàn nhất và kiểm soát tốt nhất.

---

## 13. P-H7: High - Hai luồng refund không chia sẻ invariant -> double-refund

**Vị trí:** `TransactionServiceImpl.java` dòng 335 và `RefundService.java` dòng 123

### Tình trạng ban đầu (Bug)
- Hệ thống có 2 luồng hoàn tiền độc lập:
  - Luồng 1: Dành cho Admin gọi qua `TransactionServiceImpl.refund()`. Luồng này kiểm tra hoàn tiền bằng cách so sánh chuỗi `Description` của Transaction (ví dụ: `Refund for: TXN...`). Nó KHÔNG lưu vào bảng `Refunds`.
  - Luồng 2: Dành cho Merchant gọi API qua `RefundService.processRefund()`. Luồng này tính tổng tiền hoàn bằng cách truy vấn bảng `Refunds`.
- Hậu quả: Do hai luồng kiểm tra "tiêu chuẩn hoàn tiền" (Invariant) hoàn toàn khác nhau, nếu Admin đã bấm hoàn tiền (Luồng 1), Merchant vẫn có thể gọi API hoàn tiền tiếp (Luồng 2) vì API của Merchant không thấy lịch sử lưu trong bảng `Refunds`. Khách hàng nhận được tiền hoàn gấp đôi!

### Giải pháp đã áp dụng
- **Chia sẻ Invariant chéo nhau:** Đã inject `RefundRepository` vào `TransactionServiceImpl`.
- **Trong `TransactionServiceImpl` (Luồng Admin):** Bổ sung thêm đoạn check `refundRepository.sumRefundedAmountByOriginalTransactionRef`. Nếu phát hiện Merchant đã hoàn tiền qua API, Admin không được phép hoàn nữa.
- **Trong `RefundService` (Luồng Merchant):** Bổ sung thêm đoạn check `transactionRepository.existsByDescription(...)`. Nếu phát hiện Admin đã bồi hoàn thủ công, Merchant sẽ bị chặn lại.

### Vì sao chọn cách này mà không dùng cách khác?
- **Tại sao không viết chung 1 hàm?** Do logic của Admin (hoàn 100%, không cần webhook, không check ví Merchant) hoàn toàn khác biệt với logic của Merchant API (cho phép hoàn một phần, bắn webhook, validate API key, check số dư Merchant). Việc gộp chung sẽ làm mã nguồn cực kỳ phức tạp và dễ phá hỏng tính đóng gói.
- **Tại sao gọi "Chia sẻ Invariant"?** "Invariant" (Bất biến) ở đây là quy tắc "Tổng số tiền hoàn không bao giờ được vượt quá số tiền gốc". Việc bắt cả 2 luồng cùng nhìn vào 2 nguồn dữ liệu (Bảng Transaction và Bảng Refunds) giúp đảm bảo quy tắc này luôn đúng dù xuất phát từ đâu, xử lý nhanh chóng mà không cần đập đi xây lại cấu trúc Database.
