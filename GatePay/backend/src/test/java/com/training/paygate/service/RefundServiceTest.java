package com.training.paygate.service;

import com.training.paygate.cache.BalanceCacheService;
import com.training.paygate.dto.request.RefundCreateRequest;
import com.training.paygate.dto.response.RefundResponse;
import com.training.paygate.entity.Account;
import com.training.paygate.entity.Merchant;
import com.training.paygate.entity.Refund;
import com.training.paygate.entity.Transaction;
import com.training.paygate.entity.User;
import com.training.paygate.enums.AccountStatus;
import com.training.paygate.enums.MerchantStatus;
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
import com.training.paygate.repository.MerchantRepository;
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
    @Mock private MerchantRepository merchantRepository;
    @Mock private LedgerEntryRepository ledgerEntryRepository;
    @Mock private BalanceCacheService balanceCacheService;
    @Mock private NotificationService notificationService;
    @Mock private PaymentEventPublisher paymentEventPublisher;

    @InjectMocks
    private RefundService refundService;

    // ─── Shared fixtures ────────────────────────────────────────────────────────

    private static final String API_KEY  = "MC_KEY_TEST_123";
    private static final String TX_REF   = "TXN-PAY-100";
    private static final String ORDER_ID = "ORD-100";

    private Merchant activeMerchant;
    private User customerUser;
    private Transaction completedTx;
    private Account merchantAccount;
    private Account userAccount;

    @BeforeEach
    void setUp() {
        activeMerchant = Merchant.builder()
                .merchantCode("MC_TEST")
                .merchantName("Test Merchant")
                .apiKey(API_KEY)
                .status(MerchantStatus.ACTIVE)
                .active(true)
                .build();
        activeMerchant.setId(5L);

        customerUser = User.builder()
                .username("customer@test.com")
                .email("customer@test.com")
                .role(Role.USER)
                .active(true)
                .build();
        customerUser.setId(100L);

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

    private void stubHappyPathForMerchant() {
        when(merchantRepository.findByApiKey(API_KEY)).thenReturn(Optional.of(activeMerchant));
        when(refundRepository.findByIdempotencyKey(anyString())).thenReturn(Optional.empty());
        when(transactionRepository.findByTransactionRefForUpdate(TX_REF)).thenReturn(Optional.of(completedTx));
        when(accountRepository.findById(10L)).thenReturn(Optional.of(userAccount));
        when(refundRepository.sumRefundedAmountByOriginalTransactionRef(TX_REF)).thenReturn(BigDecimal.ZERO);
        when(accountRepository.findByOwnerIdAndOwnerType(5L, OwnerType.MERCHANT)).thenReturn(Optional.of(merchantAccount));
        when(accountRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(userAccount));
        when(accountRepository.findByIdForUpdate(20L)).thenReturn(Optional.of(merchantAccount));
        when(userRepository.findById(100L)).thenReturn(Optional.of(customerUser));
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
            RefundCreateRequest request = new RefundCreateRequest(API_KEY, TX_REF, ORDER_ID, new BigDecimal("500000.00"));
            stubHappyPathForMerchant();

            RefundResponse response = refundService.processRefund(request);

            assertThat(response).isNotNull();
            assertThat(response.status()).isEqualTo(RefundStatus.COMPLETED);
            assertThat(response.amountRefunded()).isEqualTo(new BigDecimal("500000.00"));
            assertThat(response.sourceType()).isEqualTo("NORMAL");
            assertThat(merchantAccount.getBalance()).isEqualByComparingTo("500000.00");
            assertThat(userAccount.getBalance()).isEqualByComparingTo("700000.00");
        }

        @Test
        @DisplayName("Partial refund succeeds — only partial amount deducted")
        void processRefund_PartialRefundSuccess() {
            RefundCreateRequest request = new RefundCreateRequest(API_KEY, TX_REF, ORDER_ID, new BigDecimal("100000.00"));
            stubHappyPathForMerchant();
            when(refundRepository.sumRefundedAmountByOriginalTransactionRef(TX_REF))
                    .thenReturn(new BigDecimal("200000.00"));

            RefundResponse response = refundService.processRefund(request);

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
                    .status(RefundStatus.COMPLETED)
                    .createdAt(LocalDateTime.now())
                    .build();

            RefundCreateRequest request = new RefundCreateRequest(API_KEY, TX_REF, ORDER_ID, new BigDecimal("500000.00"));

            when(merchantRepository.findByApiKey(API_KEY)).thenReturn(Optional.of(activeMerchant));
            when(refundRepository.findByIdempotencyKey(anyString())).thenReturn(Optional.of(existingRefund));

            RefundResponse response = refundService.processRefund(request);

            assertThat(response.refundId()).isEqualTo("RF-EXISTING-123");
            assertThat(response.status()).isEqualTo(RefundStatus.COMPLETED);
            verify(transactionRepository, never()).findByTransactionRefForUpdate(any());
            verify(accountRepository, never()).save(any());
        }

        @Test
        @DisplayName("BNPL refund via TransactionType.LOAN_REPAYMENT — sourceType = BNPL")
        void processRefund_BnplByType_Success() {
            completedTx.setType(TransactionType.LOAN_REPAYMENT);
            RefundCreateRequest request = new RefundCreateRequest(API_KEY, TX_REF, "ORD-200", new BigDecimal("500000.00"));
            stubHappyPathForMerchant();

            RefundResponse response = refundService.processRefund(request);

            assertThat(response.sourceType()).isEqualTo("BNPL");
            assertThat(response.installmentsCancelled()).isEqualTo(0);
        }

        @Test
        @DisplayName("BNPL refund via description fallback (type=PAYMENT but description contains BNPL)")
        void processRefund_BnplByDescriptionFallback_Success() {
            completedTx.setType(TransactionType.PAYMENT);
            completedTx.setDescription("BNPL Installment for order #ORD-300");
            RefundCreateRequest request = new RefundCreateRequest(API_KEY, TX_REF, "ORD-300", new BigDecimal("500000.00"));
            stubHappyPathForMerchant();

            RefundResponse response = refundService.processRefund(request);

            assertThat(response.sourceType()).isEqualTo("BNPL");
        }
    }

    // ════════════════════════════════════════════════════════════════════════════
    // Merchant API Key Validation
    // ════════════════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("Merchant API Key Validation")
    class MerchantValidation {

        @Test
        @DisplayName("Blank API Key throws BadRequestException")
        void processRefund_BlankApiKey_Error() {
            RefundCreateRequest request = new RefundCreateRequest("  ", TX_REF, ORDER_ID, new BigDecimal("500000.00"));

            assertThatThrownBy(() -> refundService.processRefund(request))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("Merchant API Key must not be empty");

            verify(merchantRepository, never()).findByApiKey(any());
        }

        @Test
        @DisplayName("Invalid API Key throws BadRequestException")
        void processRefund_InvalidApiKey_Error() {
            RefundCreateRequest request = new RefundCreateRequest("INVALID_KEY", TX_REF, ORDER_ID, new BigDecimal("500000.00"));
            when(merchantRepository.findByApiKey("INVALID_KEY")).thenReturn(Optional.empty());

            assertThatThrownBy(() -> refundService.processRefund(request))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("Invalid Merchant API Key");
        }

        @Test
        @DisplayName("Inactive Merchant throws BadRequestException")
        void processRefund_InactiveMerchant_Error() {
            activeMerchant.setActive(false);
            RefundCreateRequest request = new RefundCreateRequest(API_KEY, TX_REF, ORDER_ID, new BigDecimal("500000.00"));
            when(merchantRepository.findByApiKey(API_KEY)).thenReturn(Optional.of(activeMerchant));

            assertThatThrownBy(() -> refundService.processRefund(request))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("inactive or pending approval");
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
            RefundCreateRequest request = new RefundCreateRequest(API_KEY, TX_REF, ORDER_ID, new BigDecimal("-10000.00"));
            when(merchantRepository.findByApiKey(API_KEY)).thenReturn(Optional.of(activeMerchant));

            assertThatThrownBy(() -> refundService.processRefund(request))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("must be a positive number greater than zero");
        }

        @Test
        @DisplayName("Zero amount throws BadRequestException")
        void processRefund_ZeroAmount_Error() {
            RefundCreateRequest request = new RefundCreateRequest(API_KEY, TX_REF, ORDER_ID, BigDecimal.ZERO);
            when(merchantRepository.findByApiKey(API_KEY)).thenReturn(Optional.of(activeMerchant));

            assertThatThrownBy(() -> refundService.processRefund(request))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("must be a positive number greater than zero");
        }
    }

    // ════════════════════════════════════════════════════════════════════════════
    // Transaction & Ownership Validation
    // ════════════════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("Transaction & Ownership Validation")
    class TransactionValidation {

        @Test
        @DisplayName("Transaction not found throws ResourceNotFoundException")
        void processRefund_TxNotFound_Error() {
            RefundCreateRequest request = new RefundCreateRequest(API_KEY, "TXN-INVALID", ORDER_ID, new BigDecimal("500000.00"));
            when(merchantRepository.findByApiKey(API_KEY)).thenReturn(Optional.of(activeMerchant));
            when(refundRepository.findByIdempotencyKey(anyString())).thenReturn(Optional.empty());
            when(transactionRepository.findByTransactionRefForUpdate("TXN-INVALID")).thenReturn(Optional.empty());

            assertThatThrownBy(() -> refundService.processRefund(request))
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessageContaining("Original transaction not found");
        }

        @Test
        @DisplayName("Non-COMPLETED transaction throws BadRequestException")
        void processRefund_UncompletedTx_Error() {
            completedTx.setStatus(TransactionStatus.PENDING);
            RefundCreateRequest request = new RefundCreateRequest(API_KEY, TX_REF, ORDER_ID, new BigDecimal("500000.00"));
            when(merchantRepository.findByApiKey(API_KEY)).thenReturn(Optional.of(activeMerchant));
            when(refundRepository.findByIdempotencyKey(anyString())).thenReturn(Optional.empty());
            when(transactionRepository.findByTransactionRefForUpdate(TX_REF)).thenReturn(Optional.of(completedTx));

            assertThatThrownBy(() -> refundService.processRefund(request))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("cannot be refunded");
        }

        @Test
        @DisplayName("Transaction missing merchantId throws BadRequestException")
        void processRefund_MissingMerchantId_Error() {
            completedTx.setMerchantId(null);
            RefundCreateRequest request = new RefundCreateRequest(API_KEY, TX_REF, ORDER_ID, new BigDecimal("500000.00"));
            when(merchantRepository.findByApiKey(API_KEY)).thenReturn(Optional.of(activeMerchant));
            when(refundRepository.findByIdempotencyKey(anyString())).thenReturn(Optional.empty());
            when(transactionRepository.findByTransactionRefForUpdate(TX_REF)).thenReturn(Optional.of(completedTx));

            assertThatThrownBy(() -> refundService.processRefund(request))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("missing merchant reference");
        }

        @Test
        @DisplayName("Transaction belonging to a different Merchant throws BadRequestException")
        void processRefund_DifferentMerchant_Error() {
            completedTx.setMerchantId(999L);
            RefundCreateRequest request = new RefundCreateRequest(API_KEY, TX_REF, ORDER_ID, new BigDecimal("500000.00"));
            when(merchantRepository.findByApiKey(API_KEY)).thenReturn(Optional.of(activeMerchant));
            when(refundRepository.findByIdempotencyKey(anyString())).thenReturn(Optional.empty());
            when(transactionRepository.findByTransactionRefForUpdate(TX_REF)).thenReturn(Optional.of(completedTx));

            assertThatThrownBy(() -> refundService.processRefund(request))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("does not belong to the authenticated Merchant");
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
            RefundCreateRequest request = new RefundCreateRequest(API_KEY, TX_REF, ORDER_ID, new BigDecimal("300000.00"));
            when(merchantRepository.findByApiKey(API_KEY)).thenReturn(Optional.of(activeMerchant));
            when(refundRepository.findByIdempotencyKey(anyString())).thenReturn(Optional.empty());
            when(transactionRepository.findByTransactionRefForUpdate(TX_REF)).thenReturn(Optional.of(completedTx));
            when(accountRepository.findById(10L)).thenReturn(Optional.of(userAccount));
            when(refundRepository.sumRefundedAmountByOriginalTransactionRef(TX_REF))
                    .thenReturn(new BigDecimal("300000.00"));

            assertThatThrownBy(() -> refundService.processRefund(request))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("would exceed original transaction amount");
        }

        @Test
        @DisplayName("Merchant balance insufficient throws BadRequestException")
        void processRefund_InsufficientMerchantBalance_Error() {
            merchantAccount.setBalance(new BigDecimal("100000.00"));
            RefundCreateRequest request = new RefundCreateRequest(API_KEY, TX_REF, ORDER_ID, new BigDecimal("500000.00"));
            when(merchantRepository.findByApiKey(API_KEY)).thenReturn(Optional.of(activeMerchant));
            when(refundRepository.findByIdempotencyKey(anyString())).thenReturn(Optional.empty());
            when(transactionRepository.findByTransactionRefForUpdate(TX_REF)).thenReturn(Optional.of(completedTx));
            when(accountRepository.findById(10L)).thenReturn(Optional.of(userAccount));
            when(refundRepository.sumRefundedAmountByOriginalTransactionRef(TX_REF)).thenReturn(BigDecimal.ZERO);
            when(accountRepository.findByOwnerIdAndOwnerType(5L, OwnerType.MERCHANT)).thenReturn(Optional.of(merchantAccount));
            when(accountRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(userAccount));
            when(accountRepository.findByIdForUpdate(20L)).thenReturn(Optional.of(merchantAccount));

            assertThatThrownBy(() -> refundService.processRefund(request))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("Merchant wallet balance");
        }
    }
}
