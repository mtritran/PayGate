# 🔧 Services Overview — Tổng Quan Tất Cả Services

> **Cập nhật lần cuối:** 2026-08-09

## Backend Services (GatePay)

### Core Services

| Service | Dòng | Mục đích | Phương thức chính |
|---|---|---|---|
| **AccountServiceImpl** | 370 | Quản lý tài khoản ví (tạo, topup, xem số dư) | `createAccount`, `getBalance`, `topUp`, `getAccountHistory` |
| **TransactionServiceImpl** | 436 | Xử lý thanh toán + Refund (SERIALIZABLE) | `processPayment`, `getTransactionByRef`, `refund` |
| **AuthServiceImpl** | ~150 | Đăng ký/Đăng nhập, JWT, Refresh Token rotation | `register`, `login`, `refreshToken`, `logout` |
| **MerchantServiceImpl** | ~200 | Quản lý đối tác merchant | `create`, `requestMerchant`, `approveMerchant` |

### Financial Services

| Service | Dòng | Mục đích | Phương thức chính |
|---|---|---|---|
| **LoanServiceImpl** | 473 | Vay tiêu dùng, duyệt vay, trả nợ kỳ, xuất PDF | `applyLoan`, `acceptLoanOffer`, `repayLoan` |
| **VaultServiceImpl** | 350 | Hũ tiết kiệm (heo đất) | `create`, `deposit`, `withdraw`, `close` |
| **BillServiceImpl** | 369 | Thanh toán hóa đơn điện/nước/viễn thông | `getProviders`, `lookup`, `pay`, `saveBill` |
| **RecurringPaymentServiceImpl** | 346 | Thanh toán định kỳ tự động | `create`, `executeDuePayments`, `executeNow` |

### Intelligence Services

| Service | Dòng | Mục đích |
|---|---|---|
| **FraudDetectionService** | 356 | Đánh giá rủi ro gian lận realtime (điểm 0-100) |
| **AiServiceImpl** | 160* | Trợ lý tài chính AI (Facade sau refactor) |
| **AiContextBuilderService** | ~200 | Gom dữ liệu tài chính cho AI prompt |
| **OpenRouterClientService** | ~70 | HTTP client gọi OpenRouter API |

*Sau khi refactor từ 533 dòng xuống 160 dòng.

### Support Services

| Service | Mục đích |
|---|---|
| **LedgerServiceImpl** | Sổ cái kép Double-Entry |
| **EmailServiceImpl** | Gửi email (473 dòng) |
| **NotificationServiceImpl** | Thông báo in-app (WebSocket) |
| **WebhookRetryServiceImpl** | Retry webhook 5 lần, exponential backoff |
| **OtpServiceImpl** | Sinh và xác minh OTP |
| **VoucherServiceImpl** | Quản lý voucher và điểm thưởng |

## Workers (Scheduled Jobs)

| Worker | Mục đích |
|---|---|
| **BillSubscriptionWorker** | Tự động thanh toán hóa đơn theo kỳ |
| **MerchantSettlementWorker** | Chuyển Hũ A → Hũ B khi đủ 30 ngày |
| **RecurringPaymentWorker** | Quét và chạy các khoản thanh toán định kỳ đến hạn |

## Dependency Graph

```
AuthServiceImpl
    └── AccountService (tự tạo ví khi đăng ký)

TransactionServiceImpl
    ├── FraudDetectionService (check trước khi xử lý)
    ├── IdempotencyCacheService (dedup Redis)
    ├── AsyncSettlementService (quyết toán async)
    └── NotificationService (thông báo sau giao dịch)

LoanServiceImpl
    ├── TransactionService (disburse/repay)
    └── EmailService (gửi hợp đồng PDF)

AiServiceImpl (Facade)
    ├── AiContextBuilderService (lấy data)
    ├── OpenRouterClientService (gọi LLM)
    └── AiIntentParserUtil (phân tích cú pháp)
```

## Vấn Đề Code Smells Đã Biết

> [!WARNING]
> - `EmailServiceImpl` (473 dòng) — chưa refactor
> - `LoanServiceImpl` (473 dòng) — phức tạp, nhiều trách nhiệm
> - `BillServiceImpl` (369 dòng) — nhồi nhét quá nhiều repository

## Liên kết

- [[System Overview]] — Kiến trúc tổng thể
- [[Database Design]] — Schema DB
- [[Feature 01 - BNPL]] — LoanService là service cốt lõi
