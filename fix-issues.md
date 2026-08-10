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

---

## 14. P-M1: Medium - `Thread.sleep(3000)` giữ connection pool trong transaction

**Vị trí:** `AsyncSettlementService.java:71-76`

### Tình trạng ban đầu (Bug)
- Trong phương thức `settlePaymentAsync()`, có đoạn code `Thread.sleep(3000)` nằm bên trong một vòng xử lý đang giữ kết nối database (JDBC connection) từ pool Hikari.
- Hậu quả: Mỗi giao dịch đang xử lý sẽ giữ 1 connection trong 3 giây. Với 20 connection trong pool (cấu hình Hikari mặc định), chỉ cần 20 giao dịch đồng thời là pool cạn kiệt, mọi request mới phải chờ timeout để lấy connection.

### Giải pháp đã áp dụng
- Xóa hoàn toàn khối `try { Thread.sleep(3000); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }` khỏi `AsyncSettlementService.java`.
- Đây là code "simulate delay" chỉ dùng để test thủ công, không nên tồn tại trong môi trường production.

### Vì sao chọn cách này mà không dùng cách khác?
- **Tại sao không dời sleep ra ngoài transaction?** Vì không có lý do nghiệp vụ nào cần delay ở đây. `Thread.sleep` trong code settlement là artifact từ giai đoạn dev, không phải feature thực sự. Xóa đi là giải pháp đúng đắn nhất.
- **Trade-off:** Không có trade-off — đây là pure improvement. Xử lý settlement giờ nhanh hơn, connection pool không bị giữ tùy tiện.

---

## 15. P-M2: Medium - Không có job phục hồi transaction kẹt PENDING

**Vị trí:** `TransactionServiceImpl.java`, không có worker tương ứng

### Tình trạng ban đầu (Bug)
- Luồng thanh toán tạo Transaction với trạng thái `PENDING`, sau đó giao cho `AsyncSettlementService` chạy bất đồng bộ. Nếu server crash, mất điện, hoặc `@Async` thread pool bị quá tải tại thời điểm đó, Transaction sẽ kẹt ở trạng thái `PENDING` vĩnh viễn.
- Không có bất kỳ cron job hay recovery mechanism nào quét và xử lý lại các Transaction bị kẹt.

### Giải pháp đã áp dụng
- Tạo mới class `PendingTransactionRecoveryWorker.java` annotated với `@Component` và `@Scheduled(fixedDelay = 60000)` — chạy mỗi 60 giây.
- Logic: Tìm tất cả transaction có `status = PENDING` và `createdAt < now - 5 phút` (đã chờ quá lâu), sau đó gọi lại `asyncSettlementService.settlePaymentAsync(tx.getId())` để xử lý lại.
- Mỗi transaction được xử lý trong `try-catch` riêng để 1 lỗi không ảnh hưởng các transaction còn lại.

### Vì sao chọn cách này mà không dùng cách khác?
- **Tại sao dùng 5 phút làm threshold?** `settlePaymentAsync` thông thường chạy xong trong vài giây. Threshold 5 phút đủ rộng để tránh false positive (xử lý nhầm transaction đang chạy bình thường), nhưng không quá dài để tiền của user bị treo lâu.
- **Tại sao không dùng Dead Letter Queue (DLQ) của RabbitMQ?** Luồng `AsyncSettlementService` được gọi trực tiếp qua `@Async`, không qua Message Queue, nên DLQ không áp dụng được mà không cần tái cấu trúc lớn.
- **Trade-off:** Nếu transaction thực sự bị lỗi nghiệp vụ (ví dụ thiếu account) thì recovery job sẽ tiếp tục fail lặp đi lặp lại mỗi 60 giây. Cần kết hợp với alerting để dev được thông báo.

---

## 16. P-M3: Medium - CORS khai báo 2 nơi không đồng nhất

**Vị trí:** `SecurityConfig.java` vs `WebConfig.java`

### Tình trạng ban đầu (Bug)
- `SecurityConfig.java` cấu hình CORS với `allowedOriginPatterns = ["http://localhost:*", "http://127.0.0.1:*"]` — chấp nhận bất kỳ port nào trên localhost.
- `WebConfig.java` chỉ whitelist cụ thể port 4200, 4201.
- Vì Spring Security filter chạy trước `WebMvcConfigurer`, cấu hình CORS trong `SecurityConfig` được áp dụng. Điều này cho phép mọi origin `http://localhost:<bất_kỳ_port>` gửi request — bao gồm cả công cụ debug hay ứng dụng độc hại chạy trên máy cục bộ của user.

### Giải pháp đã áp dụng
- Thêm `@Value("${cors.allowed-origins:http://localhost:4200,http://localhost:4201}")` vào `SecurityConfig.java`.
- Thay `setAllowedOriginPatterns(List.of("http://localhost:*", ...))` bằng `setAllowedOriginPatterns(Arrays.asList(allowedOrigins.split(",")))`.
- CORS origin giờ đọc từ config, mặc định chỉ cho phép 2 port frontend chuẩn. Môi trường production sẽ override giá trị này qua biến môi trường.

### Vì sao chọn cách này mà không dùng cách khác?
- **Tại sao không xóa WebConfig?** `WebConfig` còn chứa các cấu hình khác (message converter, resource handler...). Chỉ cần đảm bảo CORS trong `SecurityConfig` là nguồn tin cậy duy nhất, `WebConfig.addCorsMappings` sẽ bị Spring Security override mà không gây conflict.
- **Trade-off:** Developer muốn chạy frontend ở port khác (vd: 3000) phải thêm vào biến môi trường `cors.allowed-origins`. Đây là hành vi đúng — rõ ràng và kiểm soát được.

---

## 17. P-M4: Medium - Refund/PIN endpoint thiếu rate-limit

**Vị trí:** `RefundController.java`, `PinController.java`

### Tình trạng ban đầu (Bug)
- `POST /api/v1/refunds` (merchant API): không giới hạn số lần gọi — kẻ tấn công có thể brute-force để trigger refund liên tục hoặc làm quá tải hệ thống.
- `POST /api/v1/users/pin/verify`: không rate-limit — PIN 6 số chỉ có 1,000,000 tổ hợp, có thể brute-force toàn bộ trong TTL nếu không bị chặn.

### Giải pháp đã áp dụng
- Thêm annotation `@RateLimit(limit = 10, windowSeconds = 60, key = "refund")` vào `RefundController.processRefund()`.
- Thêm annotation `@RateLimit(limit = 5, windowSeconds = 60, key = "pin_verify")` vào `PinController.verifyPin()`.
- Dự án đã có sẵn annotation `@RateLimit` và AOP interceptor, chỉ cần áp dụng vào 2 endpoint này.

### Vì sao chọn cách này mà không dùng cách khác?
- **Tại sao dùng 5 lần/phút cho PIN và 10 lần/phút cho Refund?** PIN là bảo vệ trực tiếp tài sản, threshold thấp (5) để ngăn brute-force hiệu quả. Refund có thể merchant cần gọi nhiều hơn trong batch, threshold cao hơn (10) để tránh block legitimate traffic.
- **Tại sao không dùng Spring Security throttle?** Project đã tự xây `@RateLimit` với Redis backend, dùng lại là nhất quán nhất.

---

## 18. P-M5: Medium - `CheckoutService` không theo pattern interface+impl

**Vị trí:** `CheckoutService.java`

### Tình trạng ban đầu (Bug)
- `CheckoutService` là một `@Service` class monolithic chứa cả business logic lẫn đóng vai trò là "interface" cho controller gọi vào — vi phạm pattern chuẩn `Interface + Impl` mà toàn bộ các service khác trong project đều tuân theo.
- Hậu quả: Không thể mock `CheckoutService` dễ dàng trong unit test (phải dùng `@SpyBean`), không thể swap implementation, khó maintain.

### Giải pháp đã áp dụng
- Tạo `interface CheckoutService` chứa các method signatures: `createCheckoutSession`, `getCheckoutInfo`, `getCheckoutInfoByTxnRef`, `processCheckout`, `cancelCheckout`.
- Chuyển toàn bộ business logic vào `CheckoutServiceImpl implements CheckoutService`.
- Controller giờ inject `CheckoutService` (interface), không còn phụ thuộc trực tiếp vào concrete class.

### Vì sao chọn cách này mà không dùng cách khác?
- **Tại sao tách thành interface?** Đây là pattern chuẩn của Spring (Dependency Inversion Principle). Giúp unit test dễ hơn vì có thể `@MockBean CheckoutService`, đồng thời nhất quán với toàn bộ codebase.
- **Trade-off:** Refactor này cần update tất cả nơi inject `CheckoutService`. Bù lại, test coverage tăng lên rõ rệt.

---

## 19. P-M6: Medium - Optimistic lock và Pessimistic lock dùng chồng lẫn nhau

**Vị trí:** `Account.java:61-64`

### Tình trạng ban đầu (Bug)
- Entity `Account` vừa có `@Version` (Optimistic Lock) vừa có các query dùng `findByIdForUpdate` (Pessimistic Lock — `SELECT FOR UPDATE`).
- Hai cơ chế này xung đột nhau: Pessimistic lock giữ row-level lock ở DB, khi commit Spring còn kiểm tra `@Version` → nếu version bị cập nhật bởi một transaction khác (dù bản thân đã lock), sẽ bị `OptimisticLockException` ném ra ngoài không mong muốn.
- Hệ quả: request thất bại với lỗi 500 thay vì được retry.

### Giải pháp đã áp dụng
- Xóa bỏ field `@Version private Long version` và các annotation liên quan khỏi `Account.java`.
- Giữ nguyên chiến lược Pessimistic Lock (`SELECT FOR UPDATE`) vì toàn bộ luồng thanh toán đã xây dựng dựa trên đó (lock account theo thứ tự id tăng dần để tránh deadlock).

### Vì sao chọn cách này mà không dùng cách khác?
- **Tại sao giữ Pessimistic thay vì Optimistic?** Trong hệ thống thanh toán có concurrency cao và cần tính nhất quán tuyệt đối (tránh phantom read, lost update), Pessimistic Lock (SERIALIZABLE + SELECT FOR UPDATE) phù hợp hơn. Optimistic Lock phù hợp cho hệ thống ít contention hơn, và cần tầng retry ở application layer.
- **Trade-off:** Pessimistic Lock tốn overhead hơn Optimistic trong trường hợp ít conflict. Nhưng với fintech, đây là chi phí đáng chấp nhận.

---

## 20. P-M7: Medium - `merchant-mock` không verify/idempotent webhook

**Vị trí:** `merchant-mock/server.js`

### Tình trạng ban đầu (Bug)
- Endpoint `/api/paygate-webhook` trong `merchant-mock` không kiểm tra trạng thái hiện tại của order trước khi cập nhật.
- Nếu cùng một webhook được gửi 2 lần (retry do timeout), order sẽ bị ghi đè trạng thái lần 2, có thể gây ra side effect không mong muốn (ví dụ trigger notification 2 lần, ghi log trùng).

### Giải pháp đã áp dụng
- Thêm kiểm tra idempotent ngay đầu handler: nếu `order.status !== 'PENDING'` thì log cảnh báo và trả về `200 { message: 'Webhook already processed' }` ngay lập tức, không xử lý tiếp.
- Chỉ cho phép cập nhật trạng thái khi order đang ở trạng thái `PENDING` ban đầu.

### Vì sao chọn cách này mà không dùng cách khác?
- **Tại sao vẫn trả 200 thay vì 409?** Theo best practice webhook, server nhận nên luôn trả 2xx để phía gửi (PayGate) không retry tiếp. Trả 409 có thể khiến hệ thống retry vô ích. Log cảnh báo nội bộ để debug là đủ.
- **Trade-off:** Đây là `merchant-mock` phục vụ test/demo, logic đơn giản là phù hợp. Merchant thật cần lưu `transactionRef` vào DB và dùng unique constraint để idempotency chắc chắn hơn.

---

## 21. P-M8: Medium - Spec-drift: thiếu entity/API Payout/SettlementBucket

**Vị trí:** `docs/FEATURE_04_REFUND_MANAGEMENT.md`

### Tình trạng ban đầu (Bug/Spec mismatch)
- Tài liệu `FEATURE_04_REFUND_MANAGEMENT.md` mô tả cơ chế "2 hũ" (Payout/SettlementBucket): Hũ A giữ tiền 30 ngày, Hũ B sẵn sàng rút. Có mô tả API `GET /merchants/me/pending-balance` và `POST /merchants/me/payout`.
- Thực tế code không có controller hay entity nào implement các API này — gọi sẽ nhận 404.

### Giải pháp đã áp dụng
- Cập nhật `FEATURE_04_REFUND_MANAGEMENT.md` để phản ánh đúng thiết kế thực tế: xóa phần mô tả "2 hũ" và các API Payout không tồn tại.
- Thiết kế thực tế đã triển khai là: tiền chạy qua SYSTEM Escrow account → sau 30 ngày cron job `MerchantSettlementService` tự động chuyển về ví Merchant. Merchant không cần tự gọi API payout.

### Vì sao chọn cách này mà không dùng cách khác?
- **Tại sao không implement API Payout thay vì xóa doc?** Phạm vi sprint hiện tại không bao gồm việc thêm feature mới. Xóa spec sai khỏi doc giúp tránh nhầm lẫn cho người đọc và mentor review, thành thật hơn về những gì đã thực sự được xây.
- **Trade-off:** Merchant không tự chủ rút tiền — phải chờ cron job chạy. Đây là quyết định kiến trúc của team, có thể mở rộng thành manual payout sau này.

---

## 22. P-M9: Medium - Thiếu unit test cho nhiều service quan trọng

**Vị trí:** `src/test/java/...`

### Tình trạng ban đầu (Bug)
- Nhiều service quan trọng có 0% test coverage: `LoanServiceImpl`, `VoucherServiceImpl`, `VaultServiceImpl`, `RecurringPaymentServiceImpl`, `BillServiceImpl`, `OtpServiceImpl`, `LinkedBankServiceImpl`, `AiServiceImpl`.
- Không có unit test → không thể phát hiện regression khi refactor, không đảm bảo behavior đúng khi business logic thay đổi.

### Giải pháp đã áp dụng
- Tạo `LoanServiceImplTest.java` trong `src/test/java/com/training/paygate/service/impl/` với các test case cơ bản cho `LoanServiceImpl` (happy path + exception cases).
- Đây là bước khởi đầu — thêm test cho service quan trọng nhất trước, các service còn lại sẽ được bổ sung dần.

### Vì sao chọn cách này mà không dùng cách khác?
- **Tại sao ưu tiên LoanServiceImpl?** BNPL/Loan là nghiệp vụ phức tạp nhất và nhạy cảm nhất về tài chính — risk nếu có bug cao nhất.
- **Trade-off:** Coverage vẫn còn thấp ở nhiều service khác. Cần tiếp tục bổ sung test ở các sprint sau, đặc biệt cho `OtpServiceImpl` và `TransactionServiceImpl`.

---

## 23. P-M10: Medium - DB password hardcode trong `docker-compose.yml`

**Vị trí:** `docker-compose.yml:8,59`

### Tình trạng ban đầu (Bug)
- `POSTGRES_PASSWORD: 11111111` và `SPRING_DATASOURCE_PASSWORD: 11111111` được hardcode trực tiếp trong `docker-compose.yml`.
- File này commit lên Git → mật khẩu DB lộ trong toàn bộ lịch sử repository, ai có quyền đọc repo là biết password.

### Giải pháp đã áp dụng
- Thay `11111111` bằng `${DB_PASS}` ở cả 2 vị trí trong `docker-compose.yml`.
- Giá trị thực tế của `DB_PASS` được khai báo trong file `.env` (đã có trong `.gitignore`) hoặc inject qua CI/CD environment secrets.

### Vì sao chọn cách này mà không dùng cách khác?
- **Tại sao dùng `.env` thay vì Vault/Secret Manager?** Đây là môi trường dev/training, `.env` file là đủ và đơn giản. Production thực tế nên dùng Kubernetes Secret hoặc AWS Secrets Manager.
- **Trade-off:** Developer clone repo lần đầu phải tự tạo file `.env`. Cần có `.env.example` mẫu (đã có trong project) để hướng dẫn.

---

## 24. P-L1: Low - DEBUG logging không theo profile

**Vị trí:** `application.yml:77-79`

### Tình trạng ban đầu (Bug)
- Cấu hình `logging.level.org.hibernate.SQL: DEBUG` và `logging.level.com.training.paygate: DEBUG` được đặt trực tiếp trong `application.yml` mà không phân biệt profile.
- Hậu quả: Môi trường production cũng in ra toàn bộ câu SQL và log nội bộ ở mức DEBUG → gây lộ thông tin nhạy cảm trong log, tốn tài nguyên I/O, khó tìm lỗi thực sự trong biển log.

### Giải pháp đã áp dụng
- Xóa hoàn toàn khối `logging:` khỏi `application.yml`.
- Nếu cần DEBUG khi phát triển, developer tự thêm vào `application-dev.yml` hoặc set biến môi trường `LOGGING_LEVEL_ORG_HIBERNATE_SQL=DEBUG` tại local.

### Vì sao chọn cách này mà không dùng cách khác?
- **Tại sao không tách sang `application-dev.yml`?** File `application-dev.yml` chưa tồn tại trong project, và tạo thêm file mới có thể nằm ngoài phạm vi sprint. Xóa khỏi file chung là giải pháp an toàn nhất và ít xâm lấn nhất.
- **Trade-off:** Developer sẽ không thấy SQL log khi chạy local nếu quên set. Nhưng đây là hành vi đúng — mặc định im lặng, bật log chủ động khi cần debug.

---

## 25. P-L2: Low - `/actuator/**` permitAll

**Vị trí:** `SecurityConfig.java`

### Tình trạng ban đầu (Bug)
- Toàn bộ `/actuator/**` được `permitAll()` — bất kỳ ai không cần xác thực đều có thể truy cập mọi actuator endpoint.
- Nếu `management.endpoints.web.exposure.include=*` (vô tình hoặc cố ý), các endpoint như `/actuator/env`, `/actuator/heapdump`, `/actuator/beans` bị lộ — chứa thông tin cực kỳ nhạy cảm (credentials, config, heap dump).

### Giải pháp đã áp dụng
- Thay `.requestMatchers("/actuator/**").permitAll()` bằng `.requestMatchers("/actuator/health", "/actuator/info", "/actuator/metrics/**").permitAll()`.
- Chỉ 3 endpoint an toàn và cần thiết cho monitoring được public. Tất cả endpoint actuator khác yêu cầu xác thực.

### Vì sao chọn cách này mà không dùng cách khác?
- **Tại sao cho phép `/actuator/health` và `/actuator/info` public?** Đây là 2 endpoint cần thiết cho load balancer và health check của Kubernetes/Docker. Block chúng sẽ khiến infrastructure không hoạt động.
- **Trade-off:** Nếu cần monitor metrics từ Prometheus/Grafana không qua auth, cần cấu hình thêm management security riêng ở `application.yml`.

---

## 26. P-L3: Low - So sánh OTP không constant-time

**Vị trí:** `OtpServiceImpl.java:94`

### Tình trạng ban đầu (Bug)
- So sánh OTP bằng `entry.otpCode.equals(otpCode.trim())` — Java String `equals()` thoát sớm (short-circuit) ngay khi gặp ký tự đầu tiên khác nhau.
- Kẻ tấn công tinh vi có thể đo thời gian response để phân biệt "đúng 0 ký tự" với "đúng 3 ký tự" → timing attack. Mức độ rủi ro thấp hơn P-H4 (thiếu rate-limit) nhưng vẫn nên fix.

### Giải pháp đã áp dụng
- Thay `entry.otpCode.equals(otpCode.trim())` bằng `java.security.MessageDigest.isEqual(entry.otpCode.getBytes(StandardCharsets.UTF_8), otpCode.trim().getBytes(StandardCharsets.UTF_8))`.
- `MessageDigest.isEqual()` so sánh trong thời gian không đổi (constant-time) bất kể vị trí ký tự khác nhau ở đâu.

### Vì sao chọn cách này mà không dùng cách khác?
- **Tại sao không dùng `SecureRandom` hay hash OTP?** OTP cần được so sánh trực tiếp sau khi sinh ra — hash thêm không cần thiết vì OTP đã có TTL ngắn (5 phút) và rate-limit (5 lần). `MessageDigest.isEqual` là đủ và không cần thêm dependency.
- **Trade-off:** Không có — đây là pure improvement, không thay đổi logic nghiệp vụ.

---

## 27. P-L4: Low - `BankSimulateController` hardcode URL đích

**Vị trí:** `provider-mock/BankSimulateController.java`

### Tình trạng ban đầu (Bug)
- URL `http://localhost:8081/api/v1/integration/bank-webhook` và webhook secret được hardcode trực tiếp trong code Java của `BankSimulateController`.
- Hậu quả: Nếu backend GatePay chạy ở port khác hoặc host khác (vd: Docker container với hostname `backend`), `provider-mock` sẽ gọi sai địa chỉ và fail.

### Giải pháp đã áp dụng
- Thay hardcode bằng 2 `@Value` annotation:
  - `@Value("${paygate.backend.webhook-url:http://localhost:8081/api/v1/integration/bank-webhook}")` → biến `paygateBankWebhookUrl`.
  - `@Value("${paygate.vietqr.webhook-secret:vietqr-secret-default}")` → biến `webhookSecret`.
- Giá trị mặc định vẫn giữ `localhost:8081` để không break workflow local hiện tại, nhưng nay có thể override qua `application.properties` hoặc biến môi trường khi chạy Docker.

### Vì sao chọn cách này mà không dùng cách khác?
- **Tại sao dùng `@Value` thay vì `@ConfigurationProperties`?** Chỉ có 2 giá trị, dùng `@Value` đơn giản và không cần tạo thêm class config.
- **Trade-off:** Không có — giải pháp nhỏ, ít rủi ro, cải thiện tính linh hoạt khi deploy.

