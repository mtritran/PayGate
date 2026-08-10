---
title: PayGate (GatePay) — Code Review Report (BNPL Focus)
date: 2026-08-10
tags:
  - code-review
  - security
  - paygate
  - bnpl
---

# PayGate (GatePay) — Báo cáo Review bảo mật (Focus: BNPL)

> [!info] Mục tiêu
> Báo cáo này đã được tinh chỉnh để tập trung riêng vào các issue bảo mật và kiến trúc có ảnh hưởng đến **tính năng BNPL (Buy Now Pay Later)**, dựa trên báo cáo static code review chung của dự án. 

## 1. Các thành phần liên quan đến BNPL
Trong kiến trúc hiện tại, luồng BNPL (hoặc Loan) sẽ phụ thuộc vào các dịch vụ và thành phần cốt lõi sau:
- **`LoanServiceImpl`**: Xử lý logic nghiệp vụ cấp tín dụng.
- **`CheckoutService` & `TransactionServiceImpl`**: Xử lý phiên thanh toán và trừ tiền (hạn mức). Tính toàn vẹn của database (Isolation) là cực kỳ quan trọng.
- **`OtpServiceImpl` & `PinController`**: Xác thực người dùng (OTP, mã PIN) để phê duyệt khoản vay hoặc thanh toán.

## 2. Bảng tổng hợp issue ảnh hưởng trực tiếp đến BNPL

| ID | Mức độ | Tiêu đề | Thành phần ảnh hưởng |
|---|---|---|---|
| P-C4 | Critical | Idempotency key checkout random → double-charge | Thanh toán BNPL (`CheckoutService`) |
| P-C5 | Critical | Hardcode Gmail App Password thật trong config | Toàn hệ thống (Core) |
| P-C6 | Critical | JWT secret & admin password default hardcode | Xác thực (Auth / API BNPL) |
| P-H3 | High | OTP log ra plaintext ở mức INFO | Xác nhận thanh toán (`OtpServiceImpl`) |
| P-H4 | High | OTP verify không rate-limit (Rủi ro brute-force) | Xác nhận thanh toán (`OtpController`) |
| P-H5 | High | Self-invocation làm mất isolation SERIALIZABLE | Trừ tiền hạn mức (`TransactionServiceImpl`) |
| P-H6 | High | SERIALIZABLE không retry khi conflict | Trừ tiền hạn mức (`TransactionServiceImpl`) |
| P-M4 | Medium | PIN endpoint thiếu rate-limit | Xác nhận thanh toán (`PinController`) |
| P-M6 | Medium | Optimistic + pessimistic lock dùng chồng lẫn | Khoá tài khoản hạn mức (`Account`) |
| P-M9 | Medium | Thiếu unit test cho service quan trọng | Logic cốt lõi BNPL (`LoanServiceImpl`) |
| P-L3 | Low | So sánh OTP không constant-time | Xác nhận thanh toán (`OtpServiceImpl`) |

---

## 3. Chi tiết issue & Hướng khắc phục cho team BNPL

### P-C4 — Idempotency key checkout bị random hoá
> [!danger] Critical
> **Vị trí:** `CheckoutService.java:166`
> **Mô tả:** Key sinh ngẫu nhiên (`UUID.randomUUID()`) mỗi lần gọi `processCheckout()`. Cơ chế chống gọi trùng lặp (idempotency) bị vô hiệu hoá.
> **Rủi ro cho BNPL:** Khách hàng double-click nút "Thanh toán", hệ thống sẽ xử lý 2 giao dịch song song, dẫn đến việc bị trừ hạn mức BNPL 2 lần cho 1 đơn hàng.
> **Cách fix:** Dùng `sessionToken` hoặc `orderId` làm idempotency key cố định cho mỗi phiên giao dịch.

### P-H3, P-H4, P-L3 — Lỗ hổng OTP (Log plaintext, Thiếu Rate-limit)
> [!warning] High
> **Vị trí:** `OtpServiceImpl.java`, `OtpController.java`
> **Mô tả:** Mã OTP sinh ra bị log trực tiếp vào file. Endpoint `/verify` không giới hạn số lần thử.
> **Rủi ro cho BNPL:** Kẻ gian có thể vét cạn (brute-force) OTP 6 số để chiếm đoạt giao dịch giải ngân/thanh toán BNPL của khách hàng, hoặc đọc từ log server.
> **Cách fix:** Xóa log ghi plaintext, áp dụng Rate-limit (giới hạn 5 lần sai/5 phút), và dùng hàm so sánh hằng số thời gian.

### P-H5, P-H6 — Mất Isolation SERIALIZABLE gây race condition
> [!warning] High
> **Vị trí:** `TransactionServiceImpl.java`
> **Mô tả:** Việc gọi `this.processPayment()` bỏ qua AOP proxy của Spring, làm mất scope transaction `@Transactional(isolation = SERIALIZABLE)`. Không có cơ chế retry khi deadlock/conflict.
> **Rủi ro cho BNPL:** Khi có nhiều request đồng thời, hạn mức tài khoản có thể bị tính toán sai do dirty-read hoặc lost-update. Hơn nữa, thiếu retry sẽ khiến khách hàng bị lỗi 500 thay vì xử lý mượt mà.
> **Cách fix:** Inject `TransactionService` vào chính nó (self-injection) hoặc tách class. Áp dụng `@Retryable` bắt lỗi `CannotSerializeTransactionException`.

### P-M4 — PIN endpoint public thiếu rate-limit
> [!info] Medium
> **Vị trí:** `/api/v1/users/pin/verify` (`PinController.java`)
> **Mô tả:** Giống như OTP, endpoint verify PIN không giới hạn số lần thử sai.
> **Rủi ro cho BNPL:** Tấn công brute-force vét cạn mã PIN 6 số để thực hiện thanh toán BNPL trái phép.
> **Cách fix:** Bổ sung Rate-limit theo User ID.

### P-M6 — Lock DB dùng chồng lấn (Account)
> [!info] Medium
> **Vị trí:** Entity `Account.java`
> **Mô tả:** Có chứa `@Version` (Optimistic Lock) nhưng hệ thống lại có luồng không qua `findByIdForUpdate` (Pessimistic Lock). 
> **Rủi ro cho BNPL:** Khi thay đổi số dư hạn mức, có thể sinh ra `OptimisticLockException` chưa được catch/retry gây lỗi giao dịch.
> **Cách fix:** Thống nhất chiến lược Lock tài khoản tiền/hạn mức, khuyến nghị dùng Pessimistic Lock (`SELECT ... FOR UPDATE`) cho các API biến động số dư.

### P-M9 — Thiếu Unit Test cho `LoanServiceImpl`
> [!info] Medium
> **Vị trí:** `LoanServiceImpl.java`
> **Mô tả:** Logic liên quan đến nghiệp vụ vay chưa được test tự động (coverage 0%).
> **Rủi ro cho BNPL:** Logic tính hạn mức, xử lý lãi/kỳ hạn rất dễ xảy ra regression bug (lỗi hồi quy) nếu không có unit test.
> **Cách fix:** Bổ sung mock test với độ phủ (coverage) ít nhất đạt chuẩn dự án.

### P-C5, P-C6 — Hardcode Credential, JWT Secret
> [!danger] Critical
> **Vị trí:** `application.yml`
> **Mô tả:** Lộ password email thật, JWT secret mặc định và password admin.
> **Rủi ro cho BNPL:** Rủi ro hạ tầng dùng chung. Hacker giả mạo token có thể bypass toàn bộ hệ thống hoặc chiếm quyền Admin, thao túng cấu hình BNPL.
> **Cách fix:** Thu hồi App Password ngay, buộc truyền tham số qua biến môi trường.

---
## 4. Kế hoạch ưu tiên (Action Plan cho BNPL Team)
1. **[Bảo mật]** Thu hồi password email thật (P-C5) ngay lập tức. Cấu hình lại `application.yml` để nhận biến môi trường (P-C6).
2. **[Thanh toán]** Xử lý lỗi Idempotency (P-C4) và Transaction Isolation (P-H5, P-H6) để đảm bảo không sai lệch hạn mức/tiền.
3. **[Xác thực]** Thêm Rate-limit triệt để cho OTP/PIN và bỏ log plaintext (P-H3, P-H4, P-M4).
4. **[Bảo trì]** Bổ sung Unit Test cho `LoanServiceImpl` (P-M9).
