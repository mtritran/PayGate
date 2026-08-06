package com.training.paygate.service;

import com.training.paygate.cache.BalanceCacheService;
import com.training.paygate.dto.request.RefundCreateRequest;
import com.training.paygate.dto.response.RefundResponse;
import com.training.paygate.entity.Account;
import com.training.paygate.entity.Refund;
import com.training.paygate.entity.Transaction;
import com.training.paygate.entity.User;
import com.training.paygate.enums.AccountStatus;
import com.training.paygate.enums.OwnerType;
import com.training.paygate.enums.RefundStatus;
import com.training.paygate.enums.Role;
import com.training.paygate.enums.TransactionStatus;
import com.training.paygate.enums.TransactionType;
import com.training.paygate.exception.BadRequestException;
import com.training.paygate.exception.ResourceNotFoundException;
import com.training.paygate.messaging.publisher.PaymentEventPublisher;
import com.training.paygate.repository.AccountRepository;
import com.training.paygate.repository.LedgerEntryRepository;
import com.training.paygate.repository.RefundRepository;
import com.training.paygate.repository.TransactionRepository;
import com.training.paygate.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RefundServiceTest {

    @Mock private RefundRepository refundRepository;
    @Mock private TransactionRepository transactionRepository;
    @Mock private AccountRepository accountRepository;
    @Mock private UserRepository userRepository;
    @Mock private LedgerEntryRepository ledgerEntryRepository;
    @Mock private BalanceCacheService balanceCacheService;
    @Mock private NotificationService notificationService;
    @Mock private PaymentEventPublisher paymentEventPublisher;

    @InjectMocks
    private RefundService refundService;

    // ─── Shared fixtures ────────────────────────────────────────────────────────

    private static final String USERNAME = "customer@test.com";
    private static final String TX_REF   = "TXN-PAY-100";
    private static final String ORDER_ID = "ORD-100";

    private User activeUser;
    private Transaction completedTx;
    private Account merchantAccount;
    private Account userAccount;

    @BeforeEach
    void setUp() {
        activeUser = User.builder()
                .username(USERNAME)
                .email(USERNAME)
                .role(Role.USER)
                .active(true)
                .build();
        activeUser.setId(100L);

        completedTx = Transaction.builder()
                .id(1L)
                .transactionRef(TX_REF)
                .sourceAccountId(10L)
                .destAccountId(20L)
                .merchantId(5L)
                .amount(new BigDecimal("500000.00"))
                .status(TransactionStatus.COMPLETED)
                .type(TransactionType.PAYMENT)
                .description("Order payment #ORD-100")
                .build();

        merchantAccount = Account.builder()
                .id(20L)
                .ownerId(5L)
                .ownerType(OwnerType.MERCHANT)
                .balance(new BigDecimal("1000000.00"))
                .currency("VND")
                .status(AccountStatus.ACTIVE)
                .build();

        userAccount = Account.builder()
                .id(10L)
                .ownerId(100L)
                .ownerType(OwnerType.USER)
                .balance(new BigDecimal("200000.00"))
                .currency("VND")
                .status(AccountStatus.ACTIVE)
                .build();
    }

    // ─── Helper: stub happy-path for a regular USER ───────────────────────────

    private void stubHappyPathForUser() {
        when(userRepository.findByUsername(USERNAME)).thenReturn(Optional.of(activeUser));
        when(refundRepository.findByIdempotencyKey(anyString())).thenReturn(Optional.empty());
        when(transactionRepository.findByTransactionRefForUpdate(TX_REF)).thenReturn(Optional.of(completedTx));
        when(accountRepository.findByOwnerIdAndOwnerType(100L, OwnerType.USER)).thenReturn(Optional.of(userAccount));
        when(refundRepository.sumRefundedAmountByOriginalTransactionRef(TX_REF)).thenReturn(BigDecimal.ZERO);
        when(accountRepository.findByOwnerIdAndOwnerType(5L, OwnerType.MERCHANT)).thenReturn(Optional.of(merchantAccount));
        // consistent lock ordering: id 10 < 20
        when(accountRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(userAccount));
        when(accountRepository.findByIdForUpdate(20L)).thenReturn(Optional.of(merchantAccount));
        when(refundRepository.save(any(Refund.class))).thenAnswer(i -> i.getArgument(0));
    }

    // ════════════════════════════════════════════════════════════════════════════
    // Happy Paths
    // ════════════════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("Happy Paths")
    class HappyPaths {

        @Test
        @DisplayName("Full refund succeeds — balances updated, status COMPLETED")
        void processRefund_Success() {
            RefundCreateRequest request = new RefundCreateRequest(TX_REF, ORDER_ID, new BigDecimal("500000.00"), "Defective item");
            stubHappyPathForUser();

            RefundResponse response = refundService.processRefund(request, USERNAME);

            assertThat(response).isNotNull();
            assertThat(response.status()).isEqualTo(RefundStatus.COMPLETED);   // ← enum, not String
            assertThat(response.amountRefunded()).isEqualTo(new BigDecimal("500000.00"));
            assertThat(response.sourceType()).isEqualTo("NORMAL");
            assertThat(merchantAccount.getBalance()).isEqualByComparingTo("500000.00");
            assertThat(userAccount.getBalance()).isEqualByComparingTo("700000.00");
        }

        @Test
        @DisplayName("Partial refund succeeds — only partial amount deducted")
        void processRefund_PartialRefundSuccess() {
            RefundCreateRequest request = new RefundCreateRequest(TX_REF, ORDER_ID, new BigDecimal("100000.00"), "Partial return");
            stubHappyPathForUser();
            // 200 000 already refunded, now requesting 100 000 more → total 300 000 < 500 000 ✓
            when(refundRepository.sumRefundedAmountByOriginalTransactionRef(TX_REF))
                    .thenReturn(new BigDecimal("200000.00"));

            RefundResponse response = refundService.processRefund(request, USERNAME);

            assertThat(response.amountRefunded()).isEqualByComparingTo("100000.00");
            assertThat(merchantAccount.getBalance()).isEqualByComparingTo("900000.00");
            assertThat(userAccount.getBalance()).isEqualByComparingTo("300000.00");
        }

        @Test
        @DisplayName("Idempotent request — returns existing refund without any side effects")
        void processRefund_Idempotent() {
            Refund existingRefund = Refund.builder()
                    .refundRef("RF-EXISTING-123")
                    .originalTransactionRef(TX_REF)
                    .orderId(ORDER_ID)
                    .merchantId(5L)
                    .userId(100L)
                    .amount(new BigDecimal("500000.00"))
                    .sourceType("NORMAL")
                    .installmentsCancelled(0)
                    .status(RefundStatus.COMPLETED)   // ← enum
                    .createdAt(LocalDateTime.now())
                    .build();

            RefundCreateRequest request = new RefundCreateRequest(TX_REF, ORDER_ID, new BigDecimal("500000.00"), "Duplicate call");

            when(userRepository.findByUsername(USERNAME)).thenReturn(Optional.of(activeUser));
            when(refundRepository.findByIdempotencyKey(anyString())).thenReturn(Optional.of(existingRefund));

            RefundResponse response = refundService.processRefund(request, USERNAME);

            assertThat(response.refundId()).isEqualTo("RF-EXISTING-123");
            assertThat(response.status()).isEqualTo(RefundStatus.COMPLETED);
            // Không được truy vấn thêm sau khi idempotency cache hit
            verify(transactionRepository, never()).findByTransactionRefForUpdate(any());
            verify(accountRepository, never()).save(any());
        }

        @Test
        @DisplayName("BNPL refund via TransactionType.LOAN_REPAYMENT — sourceType = BNPL")
        void processRefund_BnplByType_Success() {
            completedTx.setType(TransactionType.LOAN_REPAYMENT);
            RefundCreateRequest request = new RefundCreateRequest(TX_REF, "ORD-200", new BigDecimal("500000.00"), "Cancel BNPL");
            stubHappyPathForUser();

            RefundResponse response = refundService.processRefund(request, USERNAME);

            assertThat(response.sourceType()).isEqualTo("BNPL");
            // installmentsCancelled không còn hardcode = 3; @PrePersist không chạy trong unit test → default 0
            assertThat(response.installmentsCancelled()).isEqualTo(0);
        }

        @Test
        @DisplayName("BNPL refund via description fallback (type=PAYMENT but description contains BNPL)")
        void processRefund_BnplByDescriptionFallback_Success() {
            completedTx.setType(TransactionType.PAYMENT);
            completedTx.setDescription("BNPL Installment for order #ORD-300");
            RefundCreateRequest request = new RefundCreateRequest(TX_REF, "ORD-300", new BigDecimal("500000.00"), "Cancel");
            stubHappyPathForUser();

            RefundResponse response = refundService.processRefund(request, USERNAME);

            assertThat(response.sourceType()).isEqualTo("BNPL");
        }

        @Test
        @DisplayName("Admin refund — credits original customer account, not admin wallet")
        void processRefund_AdminSuccess_CreditGoesToCustomer() {
            // Admin user
            User adminUser = User.builder()
                    .username("admin@system.com")
                    .email("admin@system.com")
                    .role(Role.ADMIN)
                    .active(true)
                    .build();
            adminUser.setId(999L);

            RefundCreateRequest request = new RefundCreateRequest(TX_REF, ORDER_ID, new BigDecimal("500000.00"), "Admin override");

            when(userRepository.findByUsername("admin@system.com")).thenReturn(Optional.of(adminUser));
            when(refundRepository.findByIdempotencyKey(anyString())).thenReturn(Optional.empty());
            when(transactionRepository.findByTransactionRefForUpdate(TX_REF)).thenReturn(Optional.of(completedTx));
            // ADMIN path: tìm account theo sourceAccountId của tx (= 10L), không phải ownerId=999
            when(accountRepository.findById(10L)).thenReturn(Optional.of(userAccount));
            when(refundRepository.sumRefundedAmountByOriginalTransactionRef(TX_REF)).thenReturn(BigDecimal.ZERO);
            when(accountRepository.findByOwnerIdAndOwnerType(5L, OwnerType.MERCHANT)).thenReturn(Optional.of(merchantAccount));
            when(accountRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(userAccount));
            when(accountRepository.findByIdForUpdate(20L)).thenReturn(Optional.of(merchantAccount));
            when(refundRepository.save(any(Refund.class))).thenAnswer(i -> i.getArgument(0));

            RefundResponse response = refundService.processRefund(request, "admin@system.com");

            assertThat(response.status()).isEqualTo(RefundStatus.COMPLETED);
            // Tiền về ví khách hàng gốc (id=10), không phải ví admin
            assertThat(userAccount.getBalance()).isEqualByComparingTo("700000.00");
            assertThat(merchantAccount.getBalance()).isEqualByComparingTo("500000.00");
            // findByOwnerIdAndOwnerType không được gọi với adminId=999
            verify(accountRepository, never()).findByOwnerIdAndOwnerType(999L, OwnerType.USER);
        }
    }

    // ════════════════════════════════════════════════════════════════════════════
    // Authentication & User Validation
    // ════════════════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("Authentication & User Validation")
    class AuthValidation {

        @Test
        @DisplayName("Blank username throws BadRequestException")
        void processRefund_BlankUsername_Error() {
            RefundCreateRequest request = new RefundCreateRequest(TX_REF, ORDER_ID, new BigDecimal("500000.00"), "test");

            assertThatThrownBy(() -> refundService.processRefund(request, "  "))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("Username cannot be empty");

            verify(userRepository, never()).findByUsername(any());
        }

        @Test
        @DisplayName("User not found throws ResourceNotFoundException")
        void processRefund_UserNotFound_Error() {
            RefundCreateRequest request = new RefundCreateRequest(TX_REF, ORDER_ID, new BigDecimal("500000.00"), "test");
            when(userRepository.findByUsername(USERNAME)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> refundService.processRefund(request, USERNAME))
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessageContaining("Authenticated user not found");
        }

        @Test
        @DisplayName("Inactive user throws BadRequestException")
        void processRefund_InactiveUser_Error() {
            activeUser.setActive(false);
            RefundCreateRequest request = new RefundCreateRequest(TX_REF, ORDER_ID, new BigDecimal("500000.00"), "test");
            when(userRepository.findByUsername(USERNAME)).thenReturn(Optional.of(activeUser));

            assertThatThrownBy(() -> refundService.processRefund(request, USERNAME))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("inactive");
        }
    }

    // ════════════════════════════════════════════════════════════════════════════
    // Amount Validation
    // ════════════════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("Amount Validation")
    class AmountValidation {

        @Test
        @DisplayName("Negative amount throws BadRequestException")
        void processRefund_NegativeAmount_Error() {
            RefundCreateRequest request = new RefundCreateRequest(TX_REF, ORDER_ID, new BigDecimal("-10000.00"), "Negative");
            when(userRepository.findByUsername(USERNAME)).thenReturn(Optional.of(activeUser));

            assertThatThrownBy(() -> refundService.processRefund(request, USERNAME))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("must be a positive number greater than zero");
        }

        @Test
        @DisplayName("Zero amount throws BadRequestException")
        void processRefund_ZeroAmount_Error() {
            RefundCreateRequest request = new RefundCreateRequest(TX_REF, ORDER_ID, BigDecimal.ZERO, "Zero");
            when(userRepository.findByUsername(USERNAME)).thenReturn(Optional.of(activeUser));

            assertThatThrownBy(() -> refundService.processRefund(request, USERNAME))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("must be a positive number greater than zero");
        }
    }

    // ════════════════════════════════════════════════════════════════════════════
    // Transaction Validation
    // ════════════════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("Transaction Validation")
    class TransactionValidation {

        @Test
        @DisplayName("Transaction not found throws ResourceNotFoundException")
        void processRefund_TxNotFound_Error() {
            RefundCreateRequest request = new RefundCreateRequest("TXN-INVALID", ORDER_ID, new BigDecimal("500000.00"), "Not found");
            when(userRepository.findByUsername(USERNAME)).thenReturn(Optional.of(activeUser));
            when(refundRepository.findByIdempotencyKey(anyString())).thenReturn(Optional.empty());
            when(transactionRepository.findByTransactionRefForUpdate("TXN-INVALID")).thenReturn(Optional.empty());

            assertThatThrownBy(() -> refundService.processRefund(request, USERNAME))
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessageContaining("Original transaction not found");
        }

        @Test
        @DisplayName("Non-COMPLETED transaction throws BadRequestException")
        void processRefund_UncompletedTx_Error() {
            completedTx.setStatus(TransactionStatus.PENDING);
            RefundCreateRequest request = new RefundCreateRequest(TX_REF, ORDER_ID, new BigDecimal("500000.00"), "Pending refund");
            when(userRepository.findByUsername(USERNAME)).thenReturn(Optional.of(activeUser));
            when(refundRepository.findByIdempotencyKey(anyString())).thenReturn(Optional.empty());
            when(transactionRepository.findByTransactionRefForUpdate(TX_REF)).thenReturn(Optional.of(completedTx));

            assertThatThrownBy(() -> refundService.processRefund(request, USERNAME))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("cannot be refunded");
        }

        @Test
        @DisplayName("Transaction missing merchantId throws BadRequestException")
        void processRefund_MissingMerchantId_Error() {
            completedTx.setMerchantId(null);
            RefundCreateRequest request = new RefundCreateRequest(TX_REF, ORDER_ID, new BigDecimal("500000.00"), "Refund");
            when(userRepository.findByUsername(USERNAME)).thenReturn(Optional.of(activeUser));
            when(refundRepository.findByIdempotencyKey(anyString())).thenReturn(Optional.empty());
            when(transactionRepository.findByTransactionRefForUpdate(TX_REF)).thenReturn(Optional.of(completedTx));

            assertThatThrownBy(() -> refundService.processRefund(request, USERNAME))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("missing merchant reference");
        }
    }

    // ════════════════════════════════════════════════════════════════════════════
    // Ownership & Authorization
    // ════════════════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("Ownership & Authorization")
    class OwnershipValidation {

        @Test
        @DisplayName("User trying to refund another user's transaction — IDOR blocked (400)")
        void processRefund_UnauthorizedUser_Error() {
            completedTx.setSourceAccountId(999L); // belongs to someone else
            RefundCreateRequest request = new RefundCreateRequest(TX_REF, ORDER_ID, new BigDecimal("500000.00"), "IDOR attempt");
            when(userRepository.findByUsername(USERNAME)).thenReturn(Optional.of(activeUser));
            when(refundRepository.findByIdempotencyKey(anyString())).thenReturn(Optional.empty());
            when(transactionRepository.findByTransactionRefForUpdate(TX_REF)).thenReturn(Optional.of(completedTx));
            when(accountRepository.findByOwnerIdAndOwnerType(100L, OwnerType.USER)).thenReturn(Optional.of(userAccount));

            assertThatThrownBy(() -> refundService.processRefund(request, USERNAME))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("does not belong to the authenticated user");
        }

        @Test
        @DisplayName("Admin refund — source account of tx not found → ResourceNotFoundException")
        void processRefund_AdminSourceAccountNotFound_Error() {
            User adminUser = User.builder()
                    .username("admin@system.com")
                    .email("admin@system.com")
                    .role(Role.ADMIN)
                    .active(true)
                    .build();
            adminUser.setId(999L);

            RefundCreateRequest request = new RefundCreateRequest(TX_REF, ORDER_ID, new BigDecimal("500000.00"), "Admin refund");
            when(userRepository.findByUsername("admin@system.com")).thenReturn(Optional.of(adminUser));
            when(refundRepository.findByIdempotencyKey(anyString())).thenReturn(Optional.empty());
            when(transactionRepository.findByTransactionRefForUpdate(TX_REF)).thenReturn(Optional.of(completedTx));
            // sourceAccountId = 10L nhưng không tìm thấy account
            when(accountRepository.findById(10L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> refundService.processRefund(request, "admin@system.com"))
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessageContaining("Source account not found");
        }
    }

    // ════════════════════════════════════════════════════════════════════════════
    // Business Rule Validation
    // ════════════════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("Business Rule Validation")
    class BusinessRuleValidation {

        @Test
        @DisplayName("Cumulative refund exceeds original amount throws BadRequestException")
        void processRefund_CumulativeOverRefund_Error() {
            // 300 000 đã refund + 300 000 mới = 600 000 > 500 000 gốc
            RefundCreateRequest request = new RefundCreateRequest(TX_REF, ORDER_ID, new BigDecimal("300000.00"), "Over-refund");
            when(userRepository.findByUsername(USERNAME)).thenReturn(Optional.of(activeUser));
            when(refundRepository.findByIdempotencyKey(anyString())).thenReturn(Optional.empty());
            when(transactionRepository.findByTransactionRefForUpdate(TX_REF)).thenReturn(Optional.of(completedTx));
            when(accountRepository.findByOwnerIdAndOwnerType(100L, OwnerType.USER)).thenReturn(Optional.of(userAccount));
            when(refundRepository.sumRefundedAmountByOriginalTransactionRef(TX_REF))
                    .thenReturn(new BigDecimal("300000.00"));

            assertThatThrownBy(() -> refundService.processRefund(request, USERNAME))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("would exceed original transaction amount");
        }

        @Test
        @DisplayName("Merchant balance insufficient throws BadRequestException")
        void processRefund_InsufficientMerchantBalance_Error() {
            merchantAccount.setBalance(new BigDecimal("100000.00"));
            RefundCreateRequest request = new RefundCreateRequest(TX_REF, ORDER_ID, new BigDecimal("500000.00"), "Defective item");
            when(userRepository.findByUsername(USERNAME)).thenReturn(Optional.of(activeUser));
            when(refundRepository.findByIdempotencyKey(anyString())).thenReturn(Optional.empty());
            when(transactionRepository.findByTransactionRefForUpdate(TX_REF)).thenReturn(Optional.of(completedTx));
            when(accountRepository.findByOwnerIdAndOwnerType(100L, OwnerType.USER)).thenReturn(Optional.of(userAccount));
            when(refundRepository.sumRefundedAmountByOriginalTransactionRef(TX_REF)).thenReturn(BigDecimal.ZERO);
            when(accountRepository.findByOwnerIdAndOwnerType(5L, OwnerType.MERCHANT)).thenReturn(Optional.of(merchantAccount));
            when(accountRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(userAccount));
            when(accountRepository.findByIdForUpdate(20L)).thenReturn(Optional.of(merchantAccount));

            assertThatThrownBy(() -> refundService.processRefund(request, USERNAME))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("Merchant wallet balance");
        }
    }
}
