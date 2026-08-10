---
title: PayGate (GatePay) — Code Review Report (BNPL Feature)
date: 2026-08-10
tags:
  - code-review
  - security
  - paygate
  - bnpl
---

# PayGate (GatePay) — Báo cáo Review chi tiết (Tính năng BNPL)

> [!info] Phạm vi
> Báo cáo này tập trung phân tích mã nguồn và bảo mật riêng cho tính năng **BNPL (Buy Now Pay Later)** trong repository `GatePay`, cụ thể là các lớp `BnplCheckoutService`, `LoanServiceImpl`, và các luồng liên quan.

## 1. Kiến trúc luồng BNPL

- **Stack**: Java 17, Spring Boot 3.2.5, Spring Data JPA.
- **Thành phần chính**:
  - `BnplCheckoutService`: Xử lý luồng thanh toán trả sau (chọn khách hàng, hồ sơ, check CIC, tạo proposal, confirm).
  - `LoanServiceImpl`: Quản lý khoản vay (apply, duyệt, giải ngân, trả nợ).
- **Điểm rủi ro (Risk Areas)**: Việc duy trì hạn mức tín dụng (Credit Limit), tính toán lãi suất, xử lý đồng thời (Concurrency) khi trả nợ/giải ngân, và bảo toàn tính toàn vẹn của Ledger (Double-entry).

## 2. Bảng tổng hợp issue

| ID | Mức độ | Tiêu đề | Vị trí |
|---|---|---|---|
| BNPL-C1 | Critical | Không trừ hạn mức khi vay (Unlimited Borrowing) | `BnplCheckoutService.java:225`, `confirmProposal` |
| BNPL-C2 | Critical | In tiền vô hạn cho SYSTEM Account (Phá vỡ Ledger) | `LoanServiceImpl.java:206` |
| BNPL-H1 | High | Lỗi Double-Charge khi trả nợ (Race Condition) | `LoanServiceImpl.java:327-360` |
| BNPL-H2 | High | Lỗ hổng Division by Zero (DoS) khi tạo Proposal | `BnplCheckoutService.java:248` |
| BNPL-M1 | Medium | Thiếu Lock (Concurrency) khi Confirm Proposal | `BnplCheckoutService.java:268` |
| BNPL-M2 | Medium | Hardcode lãi suất & ID hệ thống ở nhiều nơi | `BnplCheckoutService.java`, `LoanServiceImpl.java` |
| BNPL-M3 | Medium | Bơm lại hạn mức sai logic khi trả nợ | `LoanServiceImpl.java:418` |

---

## 3. Chi tiết issue + Test case phát hiện lỗi

### BNPL-C1 — Không trừ hạn mức khi vay (Unlimited Borrowing)

> [!danger] Critical
> **Vị trí:** `BnplCheckoutService.java` (`createProposal` và `confirmProposal`)

**Mô tả:** Hệ thống sử dụng `profile.getApprovedLimit()` để check xem user có đủ hạn mức duyệt BNPL hay không. Tuy nhiên, sau khi tạo khoản vay (Loan) và giải ngân, hệ thống **không hề trừ** số tiền đã vay khỏi `approvedLimit`. Điều này cho phép user vay vô hạn lần (mỗi lần <= approvedLimit) mà không bị giới hạn tổng dư nợ.

**Test case phát hiện lỗi:**
```
Given: User có BnplProfile với approvedLimit = 10,000,000 VND.
When: 
  - User thực hiện thanh toán BNPL đơn hàng 10,000,000 VND -> Thành công.
  - User tiếp tục thanh toán BNPL đơn hàng 10,000,000 VND thứ 2.
Then (kỳ vọng an toàn): Giao dịch 2 bị từ chối do hết hạn mức.
Thực tế (bug): Giao dịch 2 vẫn thành công, user nợ 20tr dù hạn mức chỉ có 10tr.
```
**Cách fix:** Cần phân biệt giữa `maxLimit` (hạn mức tối đa) và `availableLimit` (hạn mức khả dụng). Phải trừ `availableLimit` ngay khi `confirmProposal` thành công.

---

### BNPL-C2 — In tiền vô hạn cho SYSTEM Account (Phá vỡ Ledger)

> [!danger] Critical
> **Vị trí:** `LoanServiceImpl.java:206-210` (`acceptLoanOffer`)

**Mô tả:** Khi tài khoản SYSTEM không đủ tiền để giải ngân, code sử dụng lệnh `systemAccount.setBalance(new BigDecimal("10000000000.00"))` để set cứng số dư thành 10 tỷ VND. Điều này phá vỡ hoàn toàn nguyên tắc kế toán kép (Double-entry ledger) vì tiền được tạo ra từ hư không mà không có bút toán đối ứng. Hơn nữa, nó ghi đè (overwrite) số dư hiện tại thay vì cộng thêm.

**Test case phát hiện lỗi:**
```
Given: Tài khoản SYSTEM đang có số dư = 0.
When: Admin gọi `acceptLoanOffer` cho 1 khoản vay 5,000,000 VND.
Then (kỳ vọng an toàn): Báo lỗi thiếu quỹ (Insufficient funds) để Admin nạp tiền hợp lệ.
Thực tế (bug): SYSTEM Account tự động biến thành 10,000,000,000 VND trong DB, 
không có lịch sử Transaction nào giải thích dòng tiền này.
```
**Cách fix:** Xoá bỏ logic tự động set 10 tỷ. Hệ thống phải ném lỗi `InsufficientFundsException` và yêu cầu quy trình nạp tiền (Top-up) hợp lệ vào quỹ SYSTEM.

---

### BNPL-H1 — Lỗi Double-Charge khi trả nợ (Race Condition)

> [!warning] High
> **Vị trí:** `LoanServiceImpl.java:327-360` (`repayLoan`)

**Mô tả:** Trạng thái của kỳ hạn (`scheduleToPay.setStatus(PROCESSING)`) chỉ được cập nhật **sau khi** đã gọi `transactionService.processPayment(...)`. Nếu user double-click nút "Trả nợ", 2 request đồng thời sẽ cùng đọc thấy kỳ hạn đang ở trạng thái `PENDING`, cùng gọi xử lý thanh toán 2 lần cho 1 kỳ thanh toán.

**Test case phát hiện lỗi:**
```
Given: Kỳ hạn 1 cần trả 1,000,000 VND. User có 5,000,000 VND trong ví.
When: Bắn 2 request `POST /repay` đồng thời (concurrent).
Then (kỳ vọng an toàn): Chỉ 1 request thành công, user bị trừ 1tr.
Thực tế (bug): Cả 2 request đều thành công, user bị trừ 2,000,000 VND cho cùng 1 kỳ hạn.
```
**Cách fix:** 
- Đổi trạng thái thành `PROCESSING` **trước khi** gọi `processPayment`, nếu gọi thanh toán lỗi thì rollback lại thành `PENDING`.
- Hoặc sử dụng Pessimistic Lock (`SELECT FOR UPDATE`) khi query `LoanSchedule`.

---

### BNPL-H2 — Lỗ hổng Division by Zero (DoS) khi tạo Proposal

> [!warning] High
> **Vị trí:** `BnplCheckoutService.java:248`

**Mô tả:** Tham số `tenorMonths` từ `request` không được validate. Code thực hiện phép chia: `totalRepayable.divide(BigDecimal.valueOf(request.tenorMonths()), ...)`
Nếu request truyền `tenorMonths = 0`, hệ thống sẽ văng lỗi `ArithmeticException: / by zero`, gây gián đoạn luồng xử lý (500 Internal Server Error). Nếu truyền số âm, hệ thống cũng tính sai lãi suất.

**Test case phát hiện lỗi:**
```
Given: Session hợp lệ đã qua bước duyệt tín dụng.
When: Gửi `POST /proposal` với payload `{"financedAmount": 1000, "tenorMonths": 0}`.
Then (kỳ vọng an toàn): Trả về 400 Bad Request (Validation failed).
Thực tế (bug): Server lỗi 500 Internal Server Error.
```
**Cách fix:** Thêm `@Valid`, `@Min(1)` vào DTO `BnplProposalCreateRequest` hoặc bổ sung check logic thủ công.

---

### BNPL-M1 — Thiếu Lock khi Confirm Proposal

> [!info] Medium
> **Vị trí:** `BnplCheckoutService.java:268` (`confirmProposal`)

**Mô tả:** Việc kiểm tra trạng thái `"PENDING_CONFIRMATION"` và cập nhật thành `"APPROVED"` diễn ra cách xa nhau mà không có khoá. Các request đồng thời có thể bypass validation và tạo ra nhiều khoản vay (Loan) cho cùng 1 CheckoutSession.
**Cách fix:** Dùng `@Lock(LockModeType.PESSIMISTIC_WRITE)` khi truy vấn `BnplProposal`.

### BNPL-M2 & M3 — Hardcode và Logic cộng hạn mức sai

> [!info] Medium
> **Mô tả:** 
> - **M2**: Lãi suất `0.015` bị hardcode cứng ở nhiều nơi (`BnplCheckoutService.java:245`, `LoanServiceImpl.java:59`). Gây khó khăn khi thay đổi chính sách.
> - **M3**: Trong `LoanServiceImpl.java` (dòng 418), hàm `handlePaymentCompleted` liên tục cộng số tiền trả nợ vào `approvedLimit` của user. Do vay không trừ (lỗi C1) nhưng trả nợ lại cộng thêm, hạn mức tín dụng của user sẽ tăng lên vĩnh viễn không kiểm soát sau mỗi chu kỳ vay-trả.

---

## 4. Kế hoạch ưu tiên (Action Plan cho team BNPL)

1. **Vá lỗ hổng tài chính ngay lập tức (C1, C2, M3):** 
   - Ngừng việc in tiền 10 tỷ trong hệ thống.
   - Bổ sung khái niệm **Available Limit**. Trừ khi vay, cộng lại khi trả nợ. Tuyệt đối không cộng vượt quá mức phê duyệt tối đa.
2. **Fix lỗi Race Condition (H1, M1):** Sửa lại logic thanh toán trả nợ, khoá (lock) bản ghi hoặc đổi trạng thái DB trước khi gọi third-party/thanh toán.
3. **Bổ sung Validation (H2):** Chặn các tham số không hợp lệ từ payload API (đặc biệt là kỳ hạn `tenorMonths`).
