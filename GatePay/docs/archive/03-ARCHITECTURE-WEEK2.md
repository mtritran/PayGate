---
tags:
  - training
  - project
  - paygate
  - architecture
  - week2
created: 2026-07-27
---

# System Architecture — PayGate Week 2

## 1. Kiến trúc tổng thể (Week 1 + Week 2 Integration)

```mermaid
graph TB
    subgraph Client["Angular 17 SPA"]
        FE_W1[Week 1 Modules: Dashboard, Payment, Merchant, Ledger]
        FE_W2[Week 2 Modules: Voucher Shop, QR Scanner, Vault, Loan, Bill]
    end

    subgraph Backend["Spring Boot Backend (Layered Architecture)"]
        subgraph Controllers
            CTRL_W1[Week 1: Account, Transaction, Merchant, Ledger Controllers]
            CTRL_W2[Week 2: Voucher, QR, Vault, Loan, Bill Controllers]
        end

        subgraph Services["Service Layer"]
            CORE[TransactionService.processPayment / refund]
            LOYALTY[LoyaltyService - Event Listener]
            VOUCHER_SVC[VoucherService]
            QR_SVC[QrService]
            VAULT_SVC[VaultService]
            LOAN_SVC[LoanService]
            BILL_SVC[BillService]
        end

        subgraph Repository["Repository Layer"]
            REPO_W1[Week 1: AccountRepo, TransactionRepo, LedgerRepo, MerchantRepo]
            REPO_W2[Week 2: VoucherRepo, UserVoucherRepo, PointTxnRepo, VaultRepo, LoanRepo, LoanScheduleRepo, BillProviderRepo, BillRepo, SavedBillRepo]
        end

        MAPPER[MapStruct Mappers]
        PUB[PaymentEventPublisher]
    end

    subgraph Infra
        DB[(PostgreSQL - V1..V14)]
        REDIS[(Redis: Idempotency, Balance Cache, Token Blacklist, Points Cache)]
        RMQ[(RabbitMQ: payment.exchange)]
    end

    FE_W1 & FE_W2 -->|HTTP REST /api/v1| CTRL_W1 & CTRL_W2
    CTRL_W2 --> Services
    VAULT_SVC & LOAN_SVC & BILL_SVC -->|Deposit/Withdraw/Disburse/Repay/Pay| CORE
    CORE --> PUB
    PUB -->|PaymentCompletedEvent| RMQ
    RMQ -->|Consume| LOYALTY
    LOYALTY --> REPO_W2
    CORE --> REPO_W1
    Services --> REPO_W2
    Services --> MAPPER
    REPO_W1 & REPO_W2 --> DB
    LOYALTY --> REDIS
```

---

## 2. Nguyên tắc kiến trúc

### 2.1. Tái sử dụng Core Payment Engine
Tất cả 5 Features Week 2 đều **KHÔNG** tự viết logic trừ/cộng số dư hay tạo Ledger mới. Thay vào đó, chúng đều gọi lại `TransactionService.processPayment()` (hoặc tạo internal `PaymentRequest`) để đảm bảo:
- Tính nguyên tử (`@Transactional(SERIALIZABLE)`).
- Double-entry Ledger (DEBIT + CREDIT) tự động cân bằng.
- Account Lock theo thứ tự `id` tăng dần — chống deadlock.
- Idempotency Key — chống trùng lặp.

### 2.2. Event-Driven Loyalty (Asynchronous)
Loyalty Engine **không nằm** trong luồng đồng bộ (synchronous) của `processPayment()`. Nó lắng nghe event **sau khi** giao dịch đã `COMPLETED`:

```mermaid
sequenceDiagram
    participant User
    participant PaymentCtrl as TransactionController
    participant TxnService as TransactionService
    participant EventPub as PaymentEventPublisher
    participant RMQ as RabbitMQ
    participant Loyalty as LoyaltyEventListener

    User->>PaymentCtrl: POST /transactions/pay
    PaymentCtrl->>TxnService: processPayment()
    TxnService->>TxnService: Lock accounts, update balance, create Txn + Ledger
    TxnService->>EventPub: publish(PaymentCompletedEvent)
    TxnService-->>PaymentCtrl: TransactionResponse (COMPLETED)
    PaymentCtrl-->>User: 201 Created

    EventPub->>RMQ: Publish event
    RMQ->>Loyalty: Consume event (async)
    Loyalty->>Loyalty: Calculate points by TransactionType & amount
    Loyalty->>Loyalty: INSERT point_transactions (EARN)
    Note over Loyalty: Không ảnh hưởng response time của Payment
```

### 2.3. Voucher Apply Flow (Synchronous - trước Payment)
```mermaid
sequenceDiagram
    participant User
    participant BillCtrl as BillController
    participant VoucherSvc as VoucherService
    participant TxnService as TransactionService

    User->>BillCtrl: POST /bills/pay {billId, voucherCode}
    BillCtrl->>VoucherSvc: applyVoucher(voucherCode, originalAmount, "BILL_PAYMENT")
    VoucherSvc->>VoucherSvc: Validate: exists, not expired, applicableType matches, minOrderAmount
    VoucherSvc-->>BillCtrl: {valid, discountAmount, finalAmount}

    alt Voucher hợp lệ
        BillCtrl->>TxnService: processPayment(finalAmount, USER→MERCHANT_PROVIDER)
        TxnService-->>BillCtrl: TransactionResponse (COMPLETED)
        BillCtrl->>VoucherSvc: markUsed(userVoucherId)
        BillCtrl-->>User: 200 OK {status: PAID, transactionRef}
    else Voucher không hợp lệ
        BillCtrl-->>User: 400 Bad Request
    end
```

---

## 3. Luồng tích hợp chi tiết (Integration Workflows)

### 3.1. Savings Vault — Account Isolation & Auto-Completion Pattern

Mỗi Hũ tiết kiệm sở hữu 1 `Account` riêng với `owner_type = VAULT`:

```
┌─────────────────────────────────────────────────────────────┐
│  User A                                                      │
│  ┌──────────────────────┐    ┌──────────────────────────┐   │
│  │ USER_ACCOUNT (AC001) │◄──►│ VAULT_ACCOUNT_1 (AC050)  │   │
│  │ balance: 8,000,000   │    │ balance: 2,000,000       │   │
│  │ ownerType: USER      │    │ ownerType: VAULT         │   │
│  └──────────────────────┘    │ vault: "Du lịch Đà Lạt"  │   │
│                              │ target: 5,000,000        │   │
│                              │ progress: 40%            │   │
│                              └──────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

- **Deposit** (`VAULT_DEPOSIT`): `@Transactional` `processPayment(source=AC001, dest=AC050, amount=500K)` → Ledger: DEBIT AC001, CREDIT AC050.
- **Auto-Completion Trigger**: Ngay sau khi `processPayment` thành công, `VaultServiceImpl.deposit()` kiểm tra `vaultAccount.balance >= vault.targetAmount`. Nếu đúng:
  - Cập nhật `vault.status = COMPLETED` và `vault.completedAt = NOW()`.
- **Withdraw** (`VAULT_WITHDRAW`): `@Transactional` `processPayment(source=AC050, dest=AC001, amount=200K)` → Ledger: DEBIT AC050, CREDIT AC001.
- Tổng DEBIT = tổng CREDIT toàn hệ thống vẫn cân bằng → `GET /admin/ledger/verify` vẫn trả `balanced = true`.

### 3.2. Loan System — Disbursement & Repayment Workflow

```mermaid
sequenceDiagram
    participant User
    participant Admin
    participant LoanCtrl as LoanController
    participant LoanSvc as LoanService
    participant TxnService as TransactionService
    participant DB as PostgreSQL

    User->>LoanCtrl: POST /loans/apply {amount: 5M, term: 3}
    LoanCtrl->>LoanSvc: apply()
    LoanSvc->>LoanSvc: Validate: chưa có khoản vay ACTIVE, hạn mức 500K-20M
    LoanSvc->>LoanSvc: Tính toán: interestRate=1.5%, monthly=1,741,667₫, total=5,225,000₫
    LoanSvc->>DB: INSERT loans (status=PENDING_APPROVAL)
    LoanSvc-->>User: LoanResponse

    Admin->>LoanCtrl: POST /admin/loans/{id}/approve
    LoanCtrl->>LoanSvc: approve()
    LoanSvc->>TxnService: processPayment(SYSTEM→USER, 5M, type=LOAN_DISBURSEMENT)
    TxnService->>TxnService: Lock accounts, DEBIT SYSTEM, CREDIT USER, Ledger
    TxnService-->>LoanSvc: TransactionResponse (COMPLETED)
    LoanSvc->>DB: INSERT 3 loan_schedules (PENDING)
    LoanSvc->>DB: UPDATE loan → ACTIVE, disbursed_at
    LoanSvc-->>Admin: LoanResponse

    User->>LoanCtrl: POST /loans/{id}/repay {repayType: NEXT_PERIOD}
    LoanCtrl->>LoanSvc: repay()
    LoanSvc->>TxnService: processPayment(USER→SYSTEM, 1,741,667₫, type=LOAN_REPAYMENT)
    TxnService-->>LoanSvc: TransactionResponse (COMPLETED)
    LoanSvc->>DB: UPDATE schedule → PAID, UPDATE loan.remaining_amount
    Note over LoanSvc: Nếu remaining_amount = 0 → loan.status = PAID_OFF
```

### 3.3. Bill Payment — Mock Provider Engine

```
┌──────────────────────┐        ┌────────────────────────────────┐
│  bill_providers      │───FK──→│  merchants (Week 1)            │
│  ┌────────────────┐  │        │  ┌──────────────────────────┐  │
│  │ EVN_HANOI      │──┼────────┼─→│ Merchant: EVN Hà Nội     │  │
│  │ type: ELECTRIC  │  │        │  │ Account: MERCHANT (AC80) │  │
│  └────────────────┘  │        │  └──────────────────────────┘  │
│  ┌────────────────┐  │        │  ┌──────────────────────────┐  │
│  │ VNPT_HN        │──┼────────┼─→│ Merchant: VNPT Hà Nội    │  │
│  │ type: INTERNET  │  │        │  │ Account: MERCHANT (AC81) │  │
│  └────────────────┘  │        │  └──────────────────────────┘  │
└──────────────────────┘        └────────────────────────────────┘

Luồng: User → lookup(providerCode, customerCode) → Trả info hóa đơn UNPAID
     → User bấm Pay → processPayment(USER_AC → MERCHANT_AC, amount, BILL_PAYMENT)
     → UPDATE bill.status = PAID
```

### 3.4. QR Code Payment — Frontend ↔ Backend Flow

```mermaid
sequenceDiagram
    participant Receiver as Merchant/User (Người nhận)
    participant Backend as PayGate Backend
    participant Payer as User (Người trả)
    participant FE as Angular Frontend

    Receiver->>Backend: POST /qr/generate {accountNumber, amount, description}
    Backend->>Backend: Build JSON Payload → Base64 encode → Generate QR Image PNG
    Backend-->>Receiver: {qrPayload, qrImageBase64, expiresAt}
    Receiver->>Receiver: Hiển thị / In QR Code

    Payer->>FE: Mở Camera / Upload ảnh QR
    FE->>FE: html5-qrcode decode → Extract payload string
    FE->>Backend: POST /qr/parse {qrPayload}
    Backend->>Backend: Base64 decode → Validate accountNumber exists & ACTIVE, check expiresAt
    Backend-->>FE: {accountNumber, receiverName, receiverType, destAccountId, amount, description}
    FE-->>Payer: Hiển thị màn xác nhận (Tên người nhận, Số tiền, Nội dung)

    Payer->>FE: Bấm "Xác nhận thanh toán"
    FE->>Backend: POST /transactions/pay {idempotencyKey, destAccountId, amount, description}
    Backend-->>FE: TransactionResponse (COMPLETED)
```

---

## 4. Cấu trúc package bổ sung (Backend)

```
com.training.paygate
├── controller/
│   ├── VoucherController.java          # /api/v1/vouchers/*, /api/v1/admin/vouchers
│   ├── RewardController.java           # /api/v1/rewards/*
│   ├── QrController.java              # /api/v1/qr/*
│   ├── VaultController.java           # /api/v1/vaults/*
│   ├── LoanController.java            # /api/v1/loans/*, /api/v1/admin/loans/*
│   └── BillController.java            # /api/v1/bills/*
├── service/
│   ├── LoyaltyService.java            # interface
│   ├── VoucherService.java            # interface
│   ├── QrService.java                 # interface
│   ├── VaultService.java              # interface
│   ├── LoanService.java               # interface
│   ├── BillService.java               # interface
│   └── impl/
│       ├── LoyaltyServiceImpl.java     # @EventListener PaymentCompletedEvent
│       ├── VoucherServiceImpl.java
│       ├── QrServiceImpl.java
│       ├── VaultServiceImpl.java
│       ├── LoanServiceImpl.java
│       └── BillServiceImpl.java
├── entity/
│   ├── Voucher.java
│   ├── UserVoucher.java
│   ├── PointTransaction.java
│   ├── Vault.java
│   ├── Loan.java
│   ├── LoanSchedule.java
│   ├── BillProvider.java
│   ├── Bill.java
│   └── SavedBill.java
├── repository/
│   ├── VoucherRepository.java
│   ├── UserVoucherRepository.java
│   ├── PointTransactionRepository.java
│   ├── VaultRepository.java
│   ├── LoanRepository.java
│   ├── LoanScheduleRepository.java
│   ├── BillProviderRepository.java
│   ├── BillRepository.java
│   └── SavedBillRepository.java
├── dto/
│   ├── request/
│   │   ├── VoucherCreateRequest.java
│   │   ├── VoucherRedeemRequest.java
│   │   ├── VoucherApplyRequest.java
│   │   ├── QrGenerateRequest.java
│   │   ├── QrParseRequest.java
│   │   ├── VaultCreateRequest.java
│   │   ├── VaultDepositRequest.java
│   │   ├── LoanApplyRequest.java
│   │   ├── LoanRepayRequest.java
│   │   ├── BillLookupRequest.java
│   │   ├── BillPayRequest.java
│   │   └── SaveBillRequest.java
│   └── response/
│       ├── PointsResponse.java
│       ├── VoucherResponse.java
│       ├── UserVoucherResponse.java
│       ├── VoucherApplyResponse.java
│       ├── QrGenerateResponse.java
│       ├── QrParseResponse.java
│       ├── VaultResponse.java
│       ├── VaultTransactionResponse.java
│       ├── LoanResponse.java
│       ├── LoanScheduleResponse.java
│       ├── BillProviderResponse.java
│       ├── BillResponse.java
│       └── SavedBillResponse.java
└── enums/
    ├── VoucherApplicableType.java      # ALL, BILL_PAYMENT, PAYMENT, LOAN_REPAYMENT
    ├── UserVoucherStatus.java          # AVAILABLE, USED, EXPIRED
    ├── PointTransactionType.java       # EARN, REDEEM
    ├── VaultStatus.java                # ACTIVE, COMPLETED, CLOSED
    ├── LoanStatus.java                 # PENDING_APPROVAL, ACTIVE, PAID_OFF, REJECTED, OVERDUE
    ├── LoanScheduleStatus.java         # PENDING, PAID, OVERDUE
    ├── RepayType.java                  # NEXT_PERIOD, FULL_SETTLEMENT
    ├── BillType.java                   # ELECTRICITY, WATER, INTERNET
    └── BillStatus.java                 # UNPAID, PAID
```
