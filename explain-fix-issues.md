# Giải thích chi tiết các Bug & Giải pháp (Dành cho Học tập & Present)

---

## 1. P-C1: Critical - Bank Webhook không xác thực (Lỗ hổng "Mua hàng 0 đồng")

### 1.1 Khái niệm & Bối cảnh
- **Webhook là gì?** Khi người dùng quét mã VietQR để thanh toán, ngân hàng (MB, Vietcombank...) xử lý xong sẽ tự động gửi 1 request HTTP (Webhook) đến server PayGate của chúng ta để báo: *"Tài khoản của bạn vừa nhận được tiền cho đơn hàng ORD-xxx"*.
- **Endpoint bị lỗi:** `POST /api/v1/integration/bank-webhook` trong `BankIntegrationController.java`.

---

### 1.2 Kịch bản tấn công thực tế (Exploit Scenario)

#### Khi chưa fix:
1. **Tạo đơn hàng:** Hacker vào website thương mại điện tử, chọn mua 1 chiếc iPhone giá **30.000.000 VNĐ**. Đơn hàng tạo ra mã `orderId` là `ORD-99999` với nội dung chuyển khoản `PAYGATE ORD-99999`.
2. **Bỏ qua bước trả tiền:** Hacker **không quét mã QR**, không tốn 1 xu nào.
3. **Bắn Webhook giả:** Hacker mở phần mềm Postman hoặc lệnh `curl`, tự gửi 1 request HTTP thẳng đến server PayGate:
   - **URL:** `POST https://paygate-domain.com/api/v1/integration/bank-webhook`
   - **Body:**
     ```json
     {
       "bankCode": "MB",
       "amount": 30000000,
       "transferContent": "PAYGATE ORD-99999"
     }
     ```
4. **Hệ thống bị lừa:**
   - Trong `SecurityConfig.java`, URL này được cấu hình `permitAll()` (ai cũng gọi được mà không cần đăng nhập).
   - Trong `BankIntegrationController.java` và `BankIntegrationService.java`, code chỉ lấy `transferContent`, bóc ra `orderId = ORD-99999`, tìm đơn hàng `PENDING` -> Đổi ngay thành `COMPLETED` -> Báo cho người bán: *"Đã nhận đủ 30 triệu"*.
5. **Hậu quả:** Người bán giao iPhone cho Hacker. Hacker lấy hàng 30 triệu hoàn toàn **miễn phí**.

---

### 1.3 Cơ chế phòng vệ sau khi Fix (HMAC Signature)

#### Cách hệ thống chặn cuộc tấn công:
1. Ngân hàng thực và PayGate thỏa thuận chung một chìa khóa bí mật (ví dụ: `webhookSecret = vietqr-secret-default`).
2. Khi Ngân hàng gửi Webhook thật, Ngân hàng dùng khóa này để băm nội dung JSON body thành một chuỗi chữ ký điện tử `HMAC-SHA256` và đính kèm vào Header `X-Bank-Signature`.
3. Server PayGate có `BankWebhookFilter` đứng trước Controller:
   - Đọc JSON Body gửi lên.
   - Dùng `webhookSecret` tự tính lại chữ ký HMAC.
   - So sánh chữ ký vừa tính với chữ ký trong Header `X-Bank-Signature`.
4. **Nếu Hacker tự bắn request:** Vì Hacker **không có `webhookSecret`**, chữ ký Hacker gửi lên sẽ sai hoặc không có -> `BankWebhookFilter` chặn ngay lập tức, trả về lỗi **`401 Unauthorized`**. Code xử lý cộng tiền phía sau hoàn toàn không bị động tới.

---

### 1.4 Câu hỏi mở rộng khi Present / Phỏng vấn

**Q: Tại sao không dùng IP Whitelist (chỉ cho IP của ngân hàng gọi)?**
> **Trả lời:** IP Whitelist dễ bị bypass nếu đối tác dùng CDN/Proxy hoặc IP động trong môi trường Cloud/Kubernetes. Ngoài ra, việc duy trì danh sách IP rất dễ gây gián đoạn nếu ngân hàng thay đổi IP mà không báo trước.

**Q: Tại sao không dùng API Key tĩnh?**
> **Trả lời:** API Key tĩnh gửi qua Header nếu bị lộ (sniffing) thì hacker có thể chép lại Key đó để gửi request giả mãi mãi. HMAC băm cả Body, nên nếu hacker đổi `amount` hay `orderId` thì chữ ký sẽ lập tức bị sai.

**Q: Điểm cần lưu ý về mặt kỹ thuật trong Spring Boot khi làm việc này?**
> **Trả lời:** Luồng `InputStream` của HTTP Request trong Spring Boot chỉ được đọc 1 lần (`Single-use stream`). Nếu Filter đọc Body để tính HMAC, Controller phía sau sẽ bị lỗi không đọc được Body nữa. Do đó phải dùng một wrapper class tên là `CachedBodyHttpServletRequest` để lưu cache mảng `byte[]` lại cho các tầng phía sau dùng tiếp.

**Q: Tại sao không xóa đường dẫn này khỏi `permitAll()` trong `SecurityConfig` để cho chắc?**
> **Trả lời:** Đây là **chủ ý thiết kế**. Endpoint bank-webhook được gọi từ **server ngân hàng**, không phải từ user đăng nhập, nên không có JWT token. Nếu để `authenticated()` thì sẽ bị chặn bởi tầng JWT Authentication Filter trước. `permitAll()` được giữ lại để by-pass tầng JWT; nhưng xác thực danh tính thực sự được kiểm soát bởi `BankWebhookFilter` ở một tầng Filter riêng biệt.

---

## 2. P-C2: Critical - Bank Webhook không đối chiếu amount (Lỗ hổng "Thanh toán thiếu")

### 2.1 Khái niệm & Bối cảnh
- Khi ngân hàng đẩy Webhook về, họ sẽ gửi kèm số tiền (`amount`) mà người dùng thực sự đã chuyển.
- **Endpoint bị lỗi:** `BankIntegrationService.java`, phương thức `processBankWebhook`. Code lấy thẳng `request.amount()` để cộng vào tài khoản hệ thống (System Account) và đánh dấu đơn hàng là đã thanh toán (`COMPLETED`).

---

### 2.2 Kịch bản tấn công thực tế (Exploit Scenario)

#### Khi chưa fix:
1. **Tạo đơn hàng:** Hacker tạo một đơn hàng mua Laptop trị giá **30.000.000 VNĐ** (Mã: `ORD-88888`).
2. **Thanh toán gian lận:** Hacker vẫn dùng app ngân hàng quét mã QR, nhưng **sửa số tiền chuyển khoản thành 10 VNĐ** với nội dung `PAYGATE ORD-88888`. Hoặc nếu hacker giỏi kỹ thuật, tự forge một webhook lên server với `amount = 10` (giả sử đã pass được P-C1 vì lộ webhook secret).
3. **Hệ thống bị lừa:**
   - PayGate nhận Webhook với số tiền `amount = 10`.
   - PayGate cộng đúng 10 VNĐ vào System Account.
   - PayGate tìm thấy đơn hàng `ORD-88888` và chuyển nó thành `COMPLETED` mà **không hề so sánh** xem 10 VNĐ này có bằng với giá trị đơn hàng (30 triệu) hay không.
4. **Hậu quả:** Hacker mua chiếc Laptop 30 triệu chỉ với **10 VNĐ**. Lỗ hổng này cực kỳ phổ biến ở các cổng thanh toán mới xây dựng chưa có kinh nghiệm.

---

### 2.3 Cơ chế phòng vệ sau khi Fix

#### Cách hệ thống chặn cuộc tấn công:
1. Khi có request Webhook đến, hệ thống trích xuất `orderId` và tìm ra thông tin đơn hàng lưu trong DB (`CheckoutSession`).
2. Lấy số tiền thực tế khách cần trả: `expectedAmount = session.getAmount()`.
3. So sánh 2 số tiền: `amount` (từ webhook) vs `expectedAmount` (từ DB). Lưu ý: phải scale về đúng 2 chữ số thập phân (`.setScale(2, RoundingMode.HALF_UP)`) để tránh lỗi sai số do kiểu float/double.
4. Nếu 2 số tiền **lệch nhau dù chỉ 1 đồng**, lập tức ném ra ngoại lệ `AmountMismatchException` và ngừng toàn bộ tiến trình.
5. Hacker gửi 10 VNĐ cho đơn 30 triệu -> Exception văng ra, đơn hàng vẫn nằm ở trạng thái `PENDING`.

---

### 2.4 Câu hỏi mở rộng khi Present / Phỏng vấn

**Q: Tại sao phải tự tạo ngoại lệ `AmountMismatchException` kế thừa từ `BadRequestException`?**
> **Trả lời:** Việc tạo Exception riêng giúp Code dễ đọc (Clean Code) và dễ viết Unit Test hơn. Khi viết Unit Test, thay vì assert chung chung bắt `RuntimeException`, mình có thể assert chính xác: *"Nếu amount lệch, hệ thống phải văng ra đúng AmountMismatchException"*.

**Q: Nếu khách lỡ chuyển dư tiền (ví dụ đơn 30tr, khách chuyển 30,000,001 VNĐ) thì sao? Việc throw Exception có làm trải nghiệm khách hàng kém đi không?**
> **Trả lời:** Sẽ làm trải nghiệm kém đi 1 chút (đơn không tự động gạch nợ được). **Tuy nhiên**, trong ngành tài chính (Fintech), quy tắc tối thượng là **"Bảo vệ sổ cái (Ledger)"**. Nếu ta chấp nhận chênh lệch, sổ sách giữa PayGate và Merchant sẽ bị lệch.
>
> *Cách giải quyết lý tưởng (Trade-off):* Về lâu dài, hệ thống nên thiết kế một luồng **"Ghi nhận tiền thừa/thiếu" (Reconciliation)**: Tạo một Suspense Account (Tài khoản treo) để cất số tiền dư này, sau đó có nhân viên đối soát xử lý tay hoặc tự động refund. Trong giai đoạn MVP hiện tại, **Strict Match (khớp 100%)** và block giao dịch là giải pháp an toàn nhất.

---

## 3. P-C3: Review kết quả — Thiết kế Escrow, không phải bug

### 3.1 Bài học quan trọng: Đọc code phải theo luồng, không phải theo từng file đơn lẻ

Mentor đưa ra nhận xét này dựa trên **static review** (đọc từng file, không trace toàn bộ flow). Vì vậy chỉ thấy `BankIntegrationService` tạo 1 `LedgerEntry CREDIT` cho SYSTEM mà không thấy phần còn lại.

**Sau khi trace đầy đủ**, hệ thống thực ra có **2 giai đoạn rõ ràng:**

---

### 3.2 Kiến trúc Escrow 2 giai đoạn

```
Khách thanh toán → Ngân hàng → PayGate Bank Webhook
                                       │
                               [Giai đoạn 1 - Ngay lập tức]
                               CREDIT SYSTEM Escrow
                               (Giữ tiền hộ 30 ngày)
                                       │
                               [Giai đoạn 2 - Cron Job 30 ngày]
                               MerchantSettlementService
                               DEBIT SYSTEM + CREDIT MERCHANT
                               (Cộng tiền thật cho Merchant)
```

**Giai đoạn 1 — `BankIntegrationService.processBankWebhook`:**
- SYSTEM Account đóng vai trò **Tài khoản Escrow** (ký gửi tạm).
- Ghi `CREDIT SYSTEM` = tiền đã vào hệ thống, đang nằm chờ.
- Merchant chưa nhận tiền — đây là chủ đích để bảo vệ người mua (có thể refund trong 30 ngày).

**Giai đoạn 2 — `MerchantSettlementService.settleSingleTransaction` (cron mỗi ngày):**
- Sau 30 ngày không có refund, mới chạy Double-Entry thật:
  - `DEBIT SYSTEM` (giảm tiền Escrow).
  - `CREDIT MERCHANT` (cộng tiền vào ví Merchant).
- Kiểm tra refund đã phát sinh, tính net amount → đảm bảo Merchant chỉ nhận đúng tiền thật.

---

### 3.3 Tại sao thiết kế "unmatched ledger" trong giai đoạn 1 lại hợp lệ?

Trong mô hình Escrow, bút toán CREDIT giai đoạn 1 và DEBIT giai đoạn 2 tuy nằm ở 2 thời điểm khác nhau nhưng đều gắn vào cùng **Transaction ID** gốc. Toàn bộ vòng đời của 1 giao dịch vẫn đảm bảo cân bằng Double-Entry khi nhìn tổng thể.

Đây là mô hình phổ biến ở các Payment Gateway lớn (Stripe gọi là "Holding period", MoMo có "Thời gian giữ tiền").

---

### 3.4 Câu hỏi hay khi Present

**Q: Nếu cron job bị lỗi, tiền của Merchant có bị mất không?**
> **Trả lời:** Không mất, tiền vẫn nằm an toàn trong SYSTEM Escrow Account. Cron job có idempotency check (`existsByOriginalTransactionRef`), nên khi chạy lại lần sau sẽ tự pick up những transaction chưa được settle và xử lý tiếp. Đây là lý do tại sao cần cả `MerchantSettlement` record lẫn cơ chế pagination trong service đó.

**Q: Sao không CREDIT Merchant ngay, rồi nếu có refund thì trừ lại sau?**
> **Trả lời:** Cách đó phức tạp và rủi ro hơn. Nếu Merchant đã rút tiền ra rồi mới có refund, hệ thống sẽ phải đòi lại tiền từ Merchant — cực kỳ phức tạp về mặt pháp lý và UX. Giữ tiền trước, settle sau là mô hình an toàn hơn nhiều.

---

## 4. P-C4: Critical - Idempotency Key Random → Double-Charge (Lỗ hổng "Trừ tiền 2 lần")

### 4.1 Khái niệm & Bối cảnh
- **Idempotency (Tính Idempotent):** Một API được gọi là Idempotent nếu gọi nhiều lần với cùng tham số đầu vào đều cho cùng kết quả — tức là chỉ tạo ra 1 hiệu ứng duy nhất, không bị lặp lại.
- **Vấn đề thực tế:** Trong thanh toán, user rất hay double-click nút "Thanh toán", hoặc khi mạng chập chờn frontend tự động retry. Nếu hệ thống không Idempotent, mỗi request sẽ tạo 1 giao dịch mới → user bị trừ tiền nhiều lần.

---

### 4.2 Kịch bản tấn công / Lỗi thực tế

#### Có 2 vấn đề song song:

**Vấn đề 1 — Idempotency key random:**
- Code cũ: `"CHK_IDEM_" + UUID.randomUUID()` → Mỗi lần `processCheckout` được gọi, dù cùng session, đều sinh ra 1 key hoàn toàn mới.
- `TransactionServiceImpl` có kiểm tra idempotency key trong Redis cache và trong DB, nhưng cơ chế này bị vô hiệu hoá vì key mỗi lần khác nhau.

**Vấn đề 2 — Race Condition, không có DB lock:**
- Timeline khi user double-click:
  ```
  T=0ms:  Request 1 đọc session → status = PENDING ✅
  T=1ms:  Request 2 đọc session → status = PENDING ✅  (R1 chưa kịp commit)
  T=5ms:  Request 1 tạo transaction → trừ tiền lần 1
  T=6ms:  Request 2 tạo transaction → trừ tiền lần 2  (DISASTER!)
  T=10ms: Request 1 set session = PROCESSING, commit
  T=11ms: Request 2 set session = PROCESSING, commit  (overwrite)
  ```
- Đây là lỗi TOCTOU (Time of Check, Time of Use) — check status ở thời điểm T=0 nhưng use (tạo transaction) ở T=5, trong khoảng giữa có thể bị chen vào.

---

### 4.3 Cơ chế phòng vệ sau khi Fix

**Fix 1 — Deterministic Idempotency Key:**
- Thay `UUID.randomUUID()` bằng `request.token()` (token của checkout session).
- Token là unique per session và không bao giờ thay đổi → cùng session luôn sinh cùng key → `TransactionServiceImpl` nhận ra duplicate và trả về transaction cũ.

**Fix 2 — Pessimistic DB Lock:**
- Thêm method `findByTokenForUpdate` với `@Lock(LockModeType.PESSIMISTIC_WRITE)` → PostgreSQL thực thi `SELECT ... FOR UPDATE`.
- Timeline sau khi fix:
  ```
  T=0ms:  Request 1 lock session row → status = PENDING ✅, bắt đầu xử lý
  T=1ms:  Request 2 cố lock session row → BỊ BLOCK (DB giữ lock)
  T=10ms: Request 1 set session = PROCESSING, commit, release lock
  T=11ms: Request 2 được release → đọc lại → status = PROCESSING ≠ PENDING → throw BadRequestException
  ```
- Chỉ 1 transaction được tạo, user chỉ bị trừ tiền đúng 1 lần.

---

### 4.4 Câu hỏi mở rộng khi Present / Phỏng vấn

**Q: Tại sao chỉ fix idempotency key là chưa đủ?**
> **Trả lời:** Vì đây là race condition (TOCTOU). Redis/DB idempotency cache được ghi *sau khi* tạo transaction. Nếu 2 request đến cùng nhau (milliseconds), cả 2 đều qua được check cache trước khi bất kỳ cái nào ghi vào. Fix idempotency key đúng là quan trọng (defense in depth), nhưng DB-level lock mới là lớp phòng thủ chính xử lý race condition.

**Q: Tại sao chọn Pessimistic Lock thay vì Optimistic Lock (`@Version`)?**
> **Trả lời:** Optimistic Lock (`@Version`) hoạt động theo kiểu "cứ làm, nếu xung đột thì throw `OptimisticLockException`". Caller phải tự retry. Trong context checkout, nếu retry → lại gọi `processCheckout` từ đầu → phức tạp. Pessimistic Lock chủ động block request thứ 2 tại DB, đơn giản hơn nhiều và phù hợp với tình huống "xung đột xảy ra thường xuyên" (user double-click là việc bình thường, không phải hiếm).

**Q: `SELECT FOR UPDATE` ảnh hưởng performance thế nào nếu có nhiều user thanh toán đồng thời?**
> **Trả lời:** Lock ở **row level** (khóa từng dòng, không khóa cả bảng). Mỗi checkout session là 1 row riêng biệt → 1000 user thanh toán 1000 session khác nhau hoàn toàn không ảnh hưởng nhau. Chỉ khi cùng 1 session bị gọi đồng thời (double-click) mới bị serialize — đây đúng là hành vi mong muốn.

---

## 5. P-C5: Critical - Hardcode mật khẩu Gmail thật (Lỗ hổng "Lộ lọt thông tin nhạy cảm")

### 5.1 Khái niệm & Bối cảnh
- **Hardcoded Credentials:** Là lỗi bảo mật cực kỳ nghiêm trọng khi developer viết thẳng username/password/API key thật vào trong source code và commit lên Git.
- **Bối cảnh lỗi:** Trong file `application.yml`, cấu hình mail được thiết lập fallback mặc định chứa email và App Password thật của ai đó (`nhybui2312@gmail.com` và `tstl vrtu nykx vwld`). 

---

### 5.2 Kịch bản tấn công / Lỗi thực tế

#### Khi chưa fix:
1. File `application.yml` được commit lên Git.
2. Bất kỳ ai clone repo này (kể cả khi repo để chế độ Private nhưng bị rò rỉ, hoặc thành viên cũ trong team đã nghỉ việc) đều có thể đọc được App Password này.
3. Kẻ tấn công có thể dùng chính email `nhybui2312@gmail.com` để gửi spam, lừa đảo (phishing) dưới danh nghĩa dự án, hoặc đọc lén email tùy thuộc vào quyền của App Password.
4. Điều này phá vỡ toàn bộ quy tắc về bảo mật thông tin (Information Security).

---

### 5.3 Cơ chế phòng vệ sau khi Fix

#### Giải pháp chuẩn:
1. **Source Code:** Xóa hoàn toàn giá trị default. Sửa thành `${MAIL_USERNAME}` và `${MAIL_PASSWORD}`. Bắt buộc người chạy ứng dụng phải cung cấp qua biến môi trường.
2. **Fail-Fast:** Nếu dev quên cấu hình biến môi trường, ứng dụng sẽ lỗi ngay lúc khởi động hoặc lúc gọi API gửi mail. Điều này tốt hơn rất nhiều so với việc ứng dụng tự động "âm thầm" dùng một email cá nhân.
3. **Operations (Bắt buộc):** Truy cập vào Google Account `nhybui2312@gmail.com`, vào phần **Security -> App Passwords** và xóa (Revoke) ngay mật khẩu `tstl vrtu nykx vwld`.

---

### 5.4 Câu hỏi mở rộng khi Present / Phỏng vấn

**Q: Tại sao xóa trong file `application.yml` rồi vẫn chưa an toàn 100%?**
> **Trả lời:** Git lưu lại toàn bộ lịch sử commit. Dù đã xóa ở commit mới nhất, kẻ tấn công vẫn có thể xem lại lịch sử các commit cũ và tìm thấy password này.
> **Cách xử lý triệt để:** 
> 1. Xóa App Password thật ở phía dịch vụ cung cấp (Google Account). Đây là cách duy nhất đảm bảo password bị vô hiệu hóa hoàn toàn dù có bị lộ.
> 2. Dùng các công cụ như `git filter-repo` hoặc `BFG Repo-Cleaner` để viết lại toàn bộ lịch sử Git, xóa sạch dấu vết của password này.

---

## 6. P-C6: Critical - JWT secret & admin password có default hardcode

### 6.1 Khái niệm & Bối cảnh
- **JWT Secret:** Là chuỗi ký tự bí mật dùng để ký (sign) token JWT. Bất kỳ ai có chuỗi secret này đều có thể tự tạo ra token hợp lệ (giả mạo bất kỳ user nào, với bất kỳ quyền gì).
- **Admin Password:** Mật khẩu của tài khoản quản trị hệ thống.

---

### 6.2 Kịch bản tấn công / Lỗi thực tế

#### Lỗ hổng:
Trong file `application.yml`, hai giá trị siêu nhạy cảm này lại được gán giá trị mặc định:
- `secret: ${JWT_SECRET:dHJhaW5...}`
- `password: ${PAYGATE_ADMIN_PASSWORD:Admin@123456!}`

#### Hậu quả:
1. **Lỗ hổng Login:** Khi triển khai ứng dụng, nếu dev quên cấu hình biến môi trường, ứng dụng vẫn âm thầm khởi động bình thường. Hacker chỉ cần thử đăng nhập bằng `admin` / `Admin@123456!` là chiếm được toàn quyền hệ thống.
2. **Lỗ hổng Forgery (Giả mạo Token):** Kể cả khi đổi mật khẩu admin, hacker có source code (biết chuỗi JWT_SECRET mặc định). Nếu backend cũng chưa đổi JWT_SECRET, hacker có thể tự dùng thư viện JWT ký một token có payload `{ "sub": "admin", "role": "ADMIN" }` và gọi API thẳng vào backend mà không cần qua bước đăng nhập.

---

### 6.3 Cơ chế phòng vệ sau khi Fix

#### Giải pháp chuẩn:
1. **Nguyên tắc "Fail-Fast":** Xóa bỏ hoàn toàn giá trị fallback mặc định trong `application.yml`. Trả về `secret: ${JWT_SECRET}` và `password: ${PAYGATE_ADMIN_PASSWORD}`.
2. **Bắt buộc cấu hình:** Nếu dev quên truyền biến môi trường lúc khởi động, Spring Boot sẽ ném exception `IllegalArgumentException: Could not resolve placeholder` và **từ chối khởi động**. 
3. Điều này ép buộc mọi môi trường (đặc biệt là Production) PHẢI có file `.env` hoặc cấu hình biến môi trường đàng hoàng, đảm bảo mỗi môi trường dùng một Secret khác nhau và an toàn.

---

### 6.4 Câu hỏi mở rộng khi Present / Phỏng vấn

**Q: Tại sao phải ép hệ thống "Fail-Fast" (chết ngay lập tức) thay vì dùng cấu hình mặc định cho tiện lúc code local?**
> **Trả lời:** "Tiện lúc code" thường dẫn đến "Thảm họa lúc deploy". Nếu có cấu hình mặc định, khi deploy lên Production rất dễ xảy ra trường hợp DevOps quên set biến môi trường. Vì app vẫn chạy bình thường nên không ai phát hiện ra, cho đến khi bị hack. Thà để app chết ngay từ đầu (báo lỗi thiếu cấu hình) để DevOps biết và sửa, còn hơn là chạy với lỗ hổng bảo mật.

---

## 7. P-H1: High - Webhook gửi merchant không có chữ ký/HMAC (Lỗ hổng Giả mạo Webhook)

### 7.1 Khái niệm & Bối cảnh
- **Webhook:** Là cơ chế để PayGate "báo cáo chủ động" cho website của Merchant biết rằng "Đơn hàng X đã thanh toán thành công, hãy giao hàng đi".
- **Vấn đề cốt lõi:** Webhook bản chất chỉ là một HTTP POST request. Bất kỳ ai trên Internet (không chỉ riêng PayGate) đều có thể gửi một POST request đến website của Merchant.

---

### 7.2 Kịch bản tấn công / Lỗi thực tế

#### Khi chưa fix:
1. PayGate gửi webhook báo thanh toán thành công chỉ bằng một JSON payload đơn thuần.
2. Hacker phát hiện hoặc đoán được URL nhận webhook của Merchant (VD: `https://shop.com/api/payment/webhook`).
3. Hacker dùng Postman tự bắn 1 request y hệt với nội dung `{"orderId": "123", "status": "SUCCESS"}`.
4. Server của Merchant nhận được request, tưởng là từ PayGate gửi, liền cập nhật đơn hàng thành "Đã thanh toán" và tự động giao hàng (Key game, mã thẻ cào, phần mềm...).
5. Hacker lấy được hàng hóa mà không tốn một xu nào. Lỗi này cực kỳ phổ biến ở các website tích hợp thanh toán kém.

---

### 7.3 Cơ chế phòng vệ sau khi Fix

#### Giải pháp chuẩn: Cơ chế HMAC Signature
- **Bên gửi (PayGate):**
  - Lấy toàn bộ nội dung JSON chuẩn bị gửi đi.
  - Dùng thuật toán HMAC-SHA256 kết hợp với một "Chìa khóa bí mật" (Secret Key - ở đây dùng `apiKey` của Merchant) để tạo ra một chuỗi băm (Hash / Signature).
  - Gắn chuỗi Signature này vào Header `X-PayGate-Signature` và gửi đi.
- **Bên nhận (Merchant):**
  - Nhận được request, đọc Header `X-PayGate-Signature`.
  - Merchant tự lấy JSON body nhận được, dùng chung thuật toán HMAC-SHA256 và chung "Chìa khóa bí mật" (`apiKey`) để tạo ra một chuỗi Hash của riêng mình.
  - So sánh chuỗi Hash vừa tạo với chuỗi Hash PayGate gửi trong Header. Nếu **giống hệt nhau**, chắc chắn request đến từ PayGate (vì chỉ có PayGate và Merchant mới biết Secret Key). Nếu khác nhau, hoặc thiếu Header -> Bỏ qua request (Bị giả mạo).

---

### 7.4 Câu hỏi mở rộng khi Present / Phỏng vấn

**Q: HMAC an toàn hơn MD5/SHA256 thông thường ở điểm nào?**
> **Trả lời:** MD5 hay SHA256 là băm một chiều (Hash). Bất kỳ ai biết nội dung JSON cũng có thể tạo ra mã MD5/SHA256 y hệt. Còn HMAC (Hash-based Message Authentication Code) yêu cầu phải có một **Secret Key** mới tạo ra mã băm được. Do đó, dù hacker biết cấu trúc JSON, nhưng không có Secret Key thì không thể tạo ra được chữ ký (Signature) hợp lệ.

**Q: Tại sao phải sửa ở cả 2 chỗ `WebhookConsumer` và `WebhookRetryServiceImpl`?**
> **Trả lời:** `WebhookConsumer` xử lý việc gửi webhook lần đầu. Nhưng mạng có thể bị lỗi, Merchant server sập, nên PayGate có cơ chế Retry (thử gửi lại) nằm trong `WebhookRetryServiceImpl`. Nếu chỉ fix ở lần gửi đầu, hacker có thể nhắm vào lỗ hổng ở các lần Retry. Do đó mọi request gửi ra ngoài (dù là lần đầu hay lần thử lại thứ n) đều BẮT BUỘC phải được ký.

---

## 8. P-H2: High - SSRF qua Webhook Merchant (Lỗ hổng "Mượn dao giết người")

### 8.1 Khái niệm & Bối cảnh
- **SSRF (Server-Side Request Forgery):** Lỗ hổng cho phép kẻ tấn công lợi dụng server của hệ thống (ở đây là PayGate) để gửi các HTTP request đến những mạng lưới mà chỉ có server đó mới truy cập được (VD: mạng nội bộ công ty, các server database, redis, máy chủ nội bộ không mở ra Internet).
- **Bối cảnh lỗi:** Khi người dùng thanh toán xong, PayGate dùng `RestTemplate` để POST thông tin đến một URL mà Merchant tự cấu hình.

---

### 8.2 Kịch bản tấn công / Lỗi thực tế

#### Lỗ hổng:
Hệ thống lấy thẳng `url` do Merchant điền vào form đăng ký để gọi HTTP POST mà không kiểm tra xem URL đó trỏ đi đâu.

#### Quá trình tấn công:
1. Kẻ xấu đăng ký tài khoản Merchant. Thay vì nhập URL trang web bán hàng, hắn nhập `http://127.0.0.1:8081/actuator/env` (Cổng 8081 thường dùng cho các service nội bộ, Spring Actuator).
2. Kẻ xấu dùng một tài khoản User khác để mua hàng của chính hắn.
3. PayGate nhận thanh toán thành công, kích hoạt Webhook.
4. Server PayGate ngây thơ gọi HTTP POST đến `http://127.0.0.1:8081/actuator/env`.
5. BÙM! Server PayGate đã tự gọi vào mạng nội bộ của chính nó. Tùy vào Endpoint được gọi mà hậu quả có thể từ dò rỉ thông tin (port scanning), lấy cắp biến môi trường, cho đến sập hệ thống nội bộ.

---

### 8.3 Cơ chế phòng vệ sau khi Fix

#### Giải pháp chuẩn: `SsrfValidator`
1. Đã tạo một class tiện ích `SsrfValidator.java`. 
2. Class này nhận vào URL, tách lấy tên miền (host) và dùng hàm DNS của Java (`InetAddress.getAllByName`) để lấy IP thực tế của tên miền đó.
3. Nó kiểm tra xem IP đó có thuộc các dải mạng cấm hay không:
   - **Localhost:** `127.0.0.1` (Chặn máy chủ tự gọi chính nó).
   - **Private Network (LAN):** `10.x.x.x`, `192.168.x.x`, `172.16.x.x` (Chặn gọi vào các server khác trong cùng mạng nội bộ công ty).
4. Áp dụng hàm `isSafeUrl()` này vào trước mọi lời gọi `RestTemplate` trong `WebhookConsumer` và `WebhookRetryServiceImpl`. Nếu URL trả về IP cấm, chặn ngay (ném `SecurityException`) và không retry.

---

### 8.4 Câu hỏi mở rộng khi Present / Phỏng vấn

**Q: Tại sao tôi không dùng Regex đơn giản chặn chữ `127.0.0.1` hoặc `localhost` mà phải viết phức tạp dùng `InetAddress` phân giải IP?**
> **Trả lời:** Hacker rất thông minh. Nếu bạn chỉ chặn chuỗi text, hắn sẽ mua một tên miền (Ví dụ: `http://localtest.me` hoặc `http://hacker-domain.com`) và trỏ bản ghi DNS của tên miền đó về `127.0.0.1` (gọi là DNS Rebinding). Hàm Regex sẽ cho qua vì thấy tên miền hợp lệ. Nhưng khi dùng `InetAddress` để phân giải thành IP thật, hệ thống sẽ phát hiện ra cái đích cuối cùng là `127.0.0.1` và lập tức chặn lại. Phân giải DNS là lớp bảo vệ bắt buộc chống SSRF.

---

## 9. P-H3: High - OTP bị log ra plaintext (Lỗ hổng Lộ lọt Dữ liệu Nhạy cảm)

### 9.1 Khái niệm & Bối cảnh
- **Log System:** Trong hệ thống thực tế, các dòng log (`log.info`, `log.error`) không chỉ in ra màn hình mà sẽ được gom lại và đẩy lên các hệ thống quản lý Log tập trung (như ELK Stack, Splunk, Datadog, AWS CloudWatch).
- **Rủi ro:** Rất nhiều người trong công ty (Dev, SysAdmin, Tester) có quyền truy cập vào các hệ thống Log này để debug. Nếu ta log các thông tin nhạy cảm (Mật khẩu, OTP, Số thẻ tín dụng, API Key), những người này có thể dễ dàng đọc được.

---

### 9.2 Kịch bản tấn công / Lỗi thực tế

#### Lỗ hổng:
Trong `OtpServiceImpl.java`, hệ thống hồn nhiên in ra dòng log:
`[OTP GENERATED] Created OTP code '123456' for user 'testuser' ...`

#### Quá trình tấn công:
1. Một nhân viên IT xấu tính (hoặc hacker chiếm được quyền xem Log) mở hệ thống Log (Kibana/Datadog).
2. Họ gõ từ khóa tìm kiếm: `"OTP GENERATED"`.
3. Hệ thống trả về hàng ngàn dòng log, phơi bày toàn bộ mã OTP của tất cả khách hàng cùng với tên user/email của họ ngay tại thời điểm real-time (thời gian thực).
4. Kẻ xấu chỉ việc mở trang đăng nhập/quên mật khẩu, nhập username của nạn nhân, rồi qua bên hệ thống Log copy mã OTP mới nhất và dán vào. Tinh tinh, chiếm đoạt tài khoản thành công!

---

### 9.3 Cơ chế phòng vệ sau khi Fix

#### Giải pháp chuẩn: Data Masking (Che dấu dữ liệu)
Thay vì in trực tiếp biến `otpCode` ra log, ta dùng kỹ thuật Masking:
1. Tạo một chuỗi mới: `String maskedOtp = "***" + otpCode.substring(3);`
2. Kết quả mã `123456` sẽ biến thành `***456`.
3. Truyền chuỗi `maskedOtp` này vào hàm `log.info` thay vì `otpCode`.

---

### 9.4 Câu hỏi mở rộng khi Present / Phỏng vấn

**Q: Tại sao không xóa luôn dòng log đó đi cho an toàn tuyệt đối?**
> **Trả lời:** Dòng log đó chứa các thông tin cực kỳ quan trọng cho việc vận hành (Operations/Troubleshoot). Khi hệ thống lỗi, Ops cần nhìn vào log để biết "Lúc 9h sáng nay hệ thống có sinh OTP cho user A không?". Nếu xóa hẳn, hệ thống sẽ trở thành một "hộp đen" (blackbox), rất khó debug.

**Q: Tại sao lại che 3 số đầu mà để lộ 3 số cuối (`***456`)?**
> **Trả lời:** Giữ lại 3 số cuối mang lại lợi ích lớn trong hỗ trợ khách hàng (Customer Support). Ví dụ, khách hàng gọi lên phàn nàn "Tôi không nhận được mã". Nhân viên CSKH có thể nhìn vào Log và hỏi: "Dạ hệ thống vừa gửi một mã có đuôi là 456, anh chị kiểm tra lại hộp thư rác xem có không ạ?". Dù CSKH biết 3 số cuối nhưng cũng không thể tự ý đăng nhập vào tài khoản khách hàng được. Đây là sự cân bằng hoàn hảo giữa Bảo mật (Security) và Vận hành (Usability).

---

## 10. P-H4: High - OTP verify không rate-limit (Lỗ hổng Brute-force OTP)

### 10.1 Khái niệm & Bối cảnh
- **Rate-limit:** Là cơ chế giới hạn số lần thực hiện một hành động trong một khoảng thời gian nhất định (Ví dụ: Chỉ được nhập sai mật khẩu 5 lần).
- **Brute-force:** Kỹ thuật dò tìm mật khẩu/OTP bằng cách thử tất cả các trường hợp có thể xảy ra (từ `000000` đến `999999`).

---

### 10.2 Kịch bản tấn công / Lỗi thực tế

#### Lỗ hổng:
Hệ thống cho phép OTP sống (TTL) trong 5 phút. Hàm `verifyOtp` khi nhận OTP sai chỉ trả về lỗi `BadRequest` bình thường, mà không hề đếm xem người đó đã nhập sai bao nhiêu lần.

#### Quá trình tấn công:
1. Hacker lấy được email/username của bạn và bấm "Quên mật khẩu / Gửi lại OTP". Bạn nhận được mã OTP vào điện thoại, nhưng hacker không biết mã đó.
2. Hacker dùng một đoạn script tự động (như Burp Suite Intruder hoặc Python Script).
3. Script này bắt đầu gửi request liên tục lên API `/verify`:
   - Thử `000000` -> Sai.
   - Thử `000001` -> Sai.
   ...
   - Thử `523910` -> BÙM! Trúng phóc.
4. Với 6 chữ số, có đúng 1.000.000 trường hợp. Với tốc độ gửi 3.000 request/giây (băng thông bình thường), hacker chỉ mất khoảng **5 phút** để vét cạn toàn bộ 1 triệu trường hợp. Vừa vặn bằng đúng thời gian sống (TTL) của OTP.
5. Hacker chiếm đoạt tài khoản thành công mà không cần bẻ khóa hay lấy cắp email.

---

### 10.3 Cơ chế phòng vệ sau khi Fix

#### Giải pháp chuẩn: Rate-limit kết hợp Hủy OTP
1. **Lưu trữ biến đếm:** Trong Cache lưu mã OTP (Class `OtpEntry`), thêm một biến đếm thread-safe `AtomicInteger failedAttempts`.
2. **Kiểm tra mỗi lần nhập sai:** 
   - Tăng `failedAttempts` lên 1.
   - Nếu số lần sai **nhỏ hơn 5**: Trả về lỗi bình thường kèm theo lời cảnh báo (Ví dụ: "Bạn còn 4 lần thử").
   - Nếu số lần sai **bằng 5**: Lập tức xóa hẳn (`remove`) mã OTP đó khỏi hệ thống Cache.
   - Trả về HTTP Status `429 Too Many Requests` (thông qua `RateLimitExceededException`).

---

### 10.4 Câu hỏi mở rộng khi Present / Phỏng vấn

**Q: Tại sao phải dùng `AtomicInteger` thay vì biến `int failedAttempts` thông thường?**
> **Trả lời:** Hacker khi Brute-force thường dùng kỹ thuật Multi-threading (chạy hàng trăm luồng cùng lúc). Nếu dùng biến `int` bình thường, khi 2 luồng cùng nhập sai cùng một lúc, `failedAttempts++` có thể bị lỗi Race Condition (đếm thiếu). `AtomicInteger` đảm bảo việc tăng biến đếm là an toàn tuyệt đối trong môi trường đa luồng.

**Q: Tại sao khi nhập sai 5 lần lại xóa hẳn mã OTP đó khỏi Cache, thay vì chỉ khóa 1 phút?**
> **Trả lời:** Nếu chỉ khóa (lock) tạm thời 1 phút rồi lại cho nhập tiếp cái mã cũ đó, hacker vẫn có thể chia nhỏ cuộc tấn công ra làm nhiều lần trong ngày. Việc xóa hẳn (revoke) ép người dùng phải đi một luồng (flow) từ đầu: Xin cấp OTP mới -> Mất thêm thời gian -> Brute-force bị phá sản hoàn toàn vì cứ dò được 5 số lại bị đổi mã.

---

## 11. P-H5: High - Self-invocation làm mất isolation SERIALIZABLE (Lỗi Spring AOP Proxy)

### 11.1 Khái niệm & Bối cảnh
- **Spring AOP (Aspect-Oriented Programming):** Khi bạn dùng annotation `@Transactional` trên một hàm, Spring không chạy trực tiếp class của bạn. Nó tạo ra một lớp "Proxy" bọc bên ngoài class của bạn. Khi ai đó gọi hàm, họ thực chất gọi vào Proxy. Proxy sẽ làm nhiệm vụ mở Transaction (Begin TX), sau đó mới gọi vào code thực tế của bạn, rồi cuối cùng đóng Transaction (Commit/Rollback).
- **Isolation.SERIALIZABLE:** Là mức độ cô lập Transaction cao nhất trong Database. Nó đảm bảo các giao dịch chạy đồng thời sẽ không bao giờ giẫm đạp lên nhau (như thể chúng được xếp hàng chạy tuần tự). Rất cần thiết cho các hệ thống ví điện tử/tài chính.

---

### 11.2 Kịch bản lỗi (Bug thực tế)

#### Lỗ hổng (Self-invocation):
Trong `TransactionServiceImpl.java`, hàm `processPayment` (có 3 tham số, không có Transactional đặc biệt) gọi sang hàm `processPayment` overload (có 4 tham số, đánh dấu `@Transactional(isolation = Isolation.SERIALIZABLE)`). 
Vì gọi trực tiếp bằng `this.processPayment(...)` (gọi nội bộ trong cùng một class), lời gọi này **không đi qua lớp Proxy bọc bên ngoài**.

#### Hậu quả:
Spring Proxy hoàn toàn "không biết" là hàm thứ 2 vừa được gọi. Do đó, annotation `@Transactional(isolation = Isolation.SERIALIZABLE)` bị **bỏ qua hoàn toàn (ignored)**. Giao dịch thanh toán sẽ được chạy với mức Isolation mặc định của Database (thường là READ_COMMITTED). 
Nếu có 2 luồng cùng thanh toán cho 1 đơn hàng cùng 1 mili-giây, Isolation mặc định không thể cản được Race Condition, dẫn đến việc trừ tiền 2 lần hoặc sai lệch số dư.

---

### 11.3 Cơ chế phòng vệ sau khi Fix

#### Giải pháp chuẩn: Self-Injection
Để ép Spring phải đi qua Proxy kể cả khi gọi hàm nội bộ, ta phải tiêm (inject) chính bản thân cái interface đó vào trong class:
1. Thêm biến: 
```java
@Autowired 
@Lazy 
private TransactionService self;
```
2. Sửa lời gọi `this.processPayment(...)` thành `self.processPayment(...)`.

Khi dùng `self`, hệ thống sẽ gọi ra lớp Proxy bên ngoài. Proxy sẽ nhận ra "À, hàm này có `@Transactional(isolation = Isolation.SERIALIZABLE)`", nó sẽ phát lệnh SET TRANSACTION ISOLATION LEVEL SERIALIZABLE xuống Database trước khi chạy code bên trong. 

---

### 11.4 Câu hỏi mở rộng khi Present / Phỏng vấn

**Q: Tại sao phải dùng `@Lazy` khi Self-Injection? Nếu bỏ `@Lazy` thì bị gì?**
> **Trả lời:** Nếu không có `@Lazy`, khi Spring Boot khởi động, nó tạo `TransactionServiceImpl` và thấy cần inject `TransactionService`. Nhưng lúc này Proxy của `TransactionService` lại chưa tạo xong (vì chính nó đang được khởi tạo). Điều này dẫn đến lỗi kinh điển: **Circular Dependency** (Vòng lặp phụ thuộc). Annotation `@Lazy` bảo Spring là: "Cứ tạo class này đi, gán cho biến `self` một cái Proxy rỗng. Khi nào code thực sự chạy đến hàm `self.processPayment` thì mới tiêm ruột thật vào".

**Q: Có cách nào khác ngoài Self-Injection không?**
> **Trả lời:** Có. Cách 1: Dùng `AopContext.currentProxy()` (nhưng phải enable expose-proxy trong file config, code nhìn không đẹp). Cách 2: Tách hàm xử lý chính ra một class (Service) khác hoàn toàn, rồi gọi chéo nhau. Tuy nhiên Self-Injection với `@Lazy` là cách chuẩn Spring, dễ hiểu và tốn ít công refactor nhất.

---

## 12. P-H6: High - SERIALIZABLE isolation không retry khi conflict (Lỗi sập giao dịch khi tải cao)

### 12.1 Khái niệm & Bối cảnh
- **Concurrency Conflict (Xung đột đồng thời):** Khi bạn dùng mức Isolation cao nhất là `SERIALIZABLE`, Database sẽ khóa chặt các dòng dữ liệu (Row Lock) đang được thao tác. Nếu có một giao dịch thứ 2 cũng cố gắng đọc/ghi vào các dòng đó cùng lúc, Database sẽ ưu tiên một cái, và ném lỗi (từ chối) cái còn lại (như `CannotSerializeTransactionException` ở Postgres hoặc `CannotAcquireLockException`).
- **Bối cảnh lỗi:** Khi hệ thống chạy flash-sale (Ví dụ: 100 người cùng chuyển tiền vào 1 tài khoản đích), Database từ chối liên tục vì khóa tài khoản đích. Hệ thống ném lỗi 500 thẳng mặt người dùng.

---

### 12.2 Kịch bản lỗi (Bug thực tế)

#### Lỗ hổng:
Hệ thống tin tưởng tuyệt đối vào Database. Khi Database báo lỗi xung đột Lock, hệ thống không hề có cơ chế xử lý (Try-catch/Retry), mà để lỗi trôi tuột ra ngoài thành `HTTP 500 Internal Server Error`. 

#### Hậu quả:
Người dùng thanh toán thất bại mà không rõ lý do. Trải nghiệm người dùng (UX) cực kỳ tệ. Trong một hệ thống chịu tải cao, xung đột là chuyện "bình thường ở huyện", hệ thống TỐT là hệ thống biết tự động thử lại trong âm thầm.

---

### 12.3 Cơ chế phòng vệ sau khi Fix

#### Giải pháp chuẩn: Vòng lặp Retry với Exponential Backoff
1. **Gỡ bỏ `@Transactional` ở hàm ngoài:** Xóa `@Transactional` ở hàm `processPayment` (3 tham số) để tránh việc Spring đánh dấu Rollback toàn bộ giao dịch ngoài khi hàm con bị lỗi.
2. **Bọc vòng lặp `while(true)`:** Gọi hàm xử lý thực tế `self.processPayment` (4 tham số) bên trong vòng lặp.
3. **Catch lỗi `ConcurrencyFailureException`:** Đây là lỗi tổ tiên (Superclass) của mọi lỗi về Lock trong Spring Data. Nếu gặp lỗi này:
   - Tăng số lần thử (attempt).
   - Sleep một khoảng thời gian tăng dần: `Thread.sleep(100 * attempt)` (100ms, 200ms, 300ms) để nhường đường cho giao dịch khác chạy xong.
   - Gọi lại vòng lặp.
   - Nếu thử 3 lần vẫn thất bại, lúc đó mới buông tay ném lỗi ra ngoài.

---

### 12.4 Câu hỏi mở rộng khi Present / Phỏng vấn

**Q: Tại sao phải gỡ `@Transactional` ở hàm ngoài (3 tham số) mới Retry được?**
> **Trả lời:** Đây là "Cái bẫy Spring Transaction" (Spring Transaction Trap). Nếu hàm ngoài có `@Transactional`, khi hàm bên trong bị lỗi `ConcurrencyFailureException`, Spring sẽ ngay lập tức đánh dấu Transaction ngoài là `rollback-only`. Mặc dù code của bạn đã dùng `catch` để nuốt lỗi đó và thử gọi lại hàm con lần 2, nhưng khi hàm ngoài chạy xong, Spring sẽ kiểm tra cờ `rollback-only` và quăng ra lỗi `UnexpectedRollbackException`. Do đó, hàm đóng vai trò điều phối Retry TUYỆT ĐỐI KHÔNG ĐƯỢC nằm trong Transaction.

**Q: Tại sao không dùng thư viện `@Retryable` của Spring?**
> **Trả lời:** Dùng `@Retryable` là cách "thanh lịch" nhất. Tuy nhiên, nó đòi hỏi phải cài thêm dependency `spring-retry` và `spring-boot-starter-aop` vào `pom.xml`. Trong bối cảnh fix bug nhanh hoặc hệ thống hạn chế thêm dependency, việc viết một vòng lặp `while-catch` truyền thống vẫn đáp ứng hoàn hảo chức năng, dễ debug và không làm phình to (bloat) project.

---

## 13. P-H7: High - Hai luồng refund không chia sẻ invariant (Lỗi nhân đôi tiền hoàn - Double Refund)

### 13.1 Khái niệm & Bối cảnh
- **Invariant (Bất biến):** Là một quy tắc hoặc điều kiện trong phần mềm luôn luôn phải ĐÚNG (TRUE). Ở hệ thống thanh toán, Invariant quan trọng nhất về Refund là: "Tổng số tiền hoàn lại cho khách không bao giờ được lớn hơn số tiền khách đã thanh toán lúc đầu".
- **Bối cảnh lỗi:** Hệ thống PayGate cho phép 2 cách để hoàn tiền:
  1. Admin bấm nút "Hoàn tiền" trên Dashboard (gọi vào `TransactionServiceImpl.refund()`).
  2. Merchant (Cửa hàng) tự động gọi qua API hoàn tiền (gọi vào `RefundService.processRefund()`).

---

### 13.2 Kịch bản lỗi (Bug thực tế)

#### Lỗ hổng (Mỗi người một kiểu):
Tuy cùng là "Hoàn tiền", nhưng hai ông viết code này (Luồng Admin và Luồng Merchant) lại lưu trữ và kiểm tra theo 2 kiểu khác nhau:
- Admin khi hoàn tiền thì lưu vào bảng `Transaction` với mô tả: `"Refund for: TXN123"`. Và Admin kiểm tra Invariant bằng cách chọc vào bảng `Transaction` để xem có mô tả này chưa.
- Merchant API khi hoàn tiền thì lại lưu vào bảng `Refunds`. Và Merchant kiểm tra Invariant bằng cách đếm (sum) tiền trong bảng `Refunds`.

#### Quá trình tấn công:
1. Bạn vừa mua một cái áo qua thẻ.
2. Cửa hàng (Merchant) tự động gọi API hoàn tiền. Code chạy qua `RefundService`, ghi 1 dòng vào bảng `Refunds`. Khách nhận lại 100% tiền.
3. Vài phút sau, bạn lên web phàn nàn, Admin vào xem đơn, bấm "Hoàn tiền" (luồng `TransactionServiceImpl`).
4. Admin check xem đơn này đã hoàn chưa bằng cách tìm chữ `"Refund for: TXN123"` trong bảng `Transaction`. Tất nhiên là KHÔNG CÓ (vì lúc nãy Merchant lưu bên bảng `Refunds`). 
5. Thế là Admin nhấn nút, và BÙM, hệ thống chuyển tiếp cho khách 100% tiền nữa. Khách ăn được gấp đôi tiền, công ty vỡ nợ.

---

### 13.3 Cơ chế phòng vệ sau khi Fix

#### Giải pháp chuẩn: Cross-Check Invariant (Kiểm tra chéo)
Thay vì đập đi xây lại làm 1 bảng duy nhất (tốn rất nhiều công sức refactor code), ta bắt 2 luồng phải nhìn vào "chiếc gương" của nhau:
1. Nhúng `RefundRepository` vào `TransactionServiceImpl`. Khi Admin bấm hoàn tiền, ngoài check bảng `Transaction`, Admin phải hỏi thêm bảng `Refunds` xem Merchant có đang hoàn tiền qua API không.
2. Ngược lại, trong `RefundService.processRefund()`, Merchant trước khi hoàn phải hỏi bảng `Transaction` xem Admin có đang bấm hoàn tiền thủ công không (`transactionRepository.existsByDescription`).
3. Nếu cả 2 đều nói "Chưa", lúc đó mới thực hiện.

---

### 13.4 Câu hỏi mở rộng khi Present / Phỏng vấn

**Q: Tại sao tôi không đập 2 hàm này đi và viết gộp thành 1 hàm Refund dùng chung cho cả Admin và Merchant? DRY (Don't Repeat Yourself) cơ mà?**
> **Trả lời:** Đừng mù quáng theo DRY! Quy trình nghiệp vụ của Admin hoàn toàn khác với Merchant. Admin hoàn tiền là "quyền lực tối cao", bắt buộc hoàn 100%, không cần quan tâm ví Merchant còn tiền không (cứ trừ âm). Còn Merchant hoàn qua API là hoàn từng phần (Partial Refund), phải kiểm tra số dư ví Merchant, phải tạo Idempotency Key, và phải bắn Webhook thông báo. Nếu gộp 2 luồng này làm 1 hàm, code của bạn sẽ tràn ngập các lệnh `if(isAdmin) ... else ...`, phá vỡ nguyên tắc Single Responsibility (SRP) và khiến code cực kỳ khó bảo trì. Chia sẻ Invariant (Data layer) là cách tốt nhất để giữ 2 luồng (Business layer) sạch sẽ và độc lập.
