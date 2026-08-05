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
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RefundServiceTest {

    @Mock
    private RefundRepository refundRepository;
    @Mock
    private TransactionRepository transactionRepository;
    @Mock
    private AccountRepository accountRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private LedgerEntryRepository ledgerEntryRepository;
    @Mock
    private BalanceCacheService balanceCacheService;
    @Mock
    private NotificationService notificationService;
    @Mock
    private PaymentEventPublisher paymentEventPublisher;

    @InjectMocks
    private RefundService refundService;

    private User activeUser;
    private Transaction completedTx;
    private Account merchantAccount;
    private Account userAccount;

    @BeforeEach
    void setUp() {
        activeUser = User.builder()
                .username("customer@test.com")
                .email("customer@test.com")
                .role(Role.USER)
                .active(true)
                .build();
        activeUser.setId(100L);

        completedTx = Transaction.builder()
                .id(1L)
                .transactionRef("TXN-PAY-100")
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

    @Test
    @DisplayName("processRefund_Success: Normal refund succeeds and updates balances")
    void processRefund_Success() {
        RefundCreateRequest request = new RefundCreateRequest("TXN-PAY-100", "ORD-100", new BigDecimal("500000.00"), "Defective item");

        when(userRepository.findByUsername("customer@test.com")).thenReturn(Optional.of(activeUser));
        when(refundRepository.findByOrderId("ORD-100")).thenReturn(Optional.empty());
        when(transactionRepository.findByTransactionRefForUpdate("TXN-PAY-100")).thenReturn(Optional.of(completedTx));
        when(accountRepository.findByOwnerIdAndOwnerType(100L, OwnerType.USER)).thenReturn(Optional.of(userAccount));
        when(refundRepository.sumRefundedAmountByOriginalTransactionRef("TXN-PAY-100")).thenReturn(BigDecimal.ZERO);
        when(accountRepository.findByOwnerIdAndOwnerType(5L, OwnerType.MERCHANT)).thenReturn(Optional.of(merchantAccount));
        when(accountRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(userAccount));
        when(accountRepository.findByIdForUpdate(20L)).thenReturn(Optional.of(merchantAccount));
        when(refundRepository.save(any(Refund.class))).thenAnswer(i -> i.getArgument(0));

        RefundResponse response = refundService.processRefund(request, "customer@test.com");

        assertThat(response).isNotNull();
        assertThat(response.status()).isEqualTo("COMPLETED");
        assertThat(response.amountRefunded()).isEqualTo(new BigDecimal("500000.00"));
        assertThat(response.sourceType()).isEqualTo("NORMAL");
        assertThat(merchantAccount.getBalance()).isEqualTo(new BigDecimal("500000.00"));
        assertThat(userAccount.getBalance()).isEqualTo(new BigDecimal("700000.00"));
    }

    @Test
    @DisplayName("processRefund_Idempotent: Repeated request with same orderId returns previous refund response")
    void processRefund_Idempotent() {
        Refund existingRefund = Refund.builder()
                .refundRef("RF-EXISTING-123")
                .originalTransactionRef("TXN-PAY-100")
                .orderId("ORD-100")
                .merchantId(5L)
                .userId(100L)
                .amount(new BigDecimal("500000.00"))
                .sourceType("NORMAL")
                .installmentsCancelled(0)
                .status("COMPLETED")
                .createdAt(LocalDateTime.now())
                .build();

        RefundCreateRequest request = new RefundCreateRequest("TXN-PAY-100", "ORD-100", new BigDecimal("500000.00"), "Duplicate call");

        when(userRepository.findByUsername("customer@test.com")).thenReturn(Optional.of(activeUser));
        when(refundRepository.findByOrderId("ORD-100")).thenReturn(Optional.of(existingRefund));

        RefundResponse response = refundService.processRefund(request, "customer@test.com");

        assertThat(response.refundId()).isEqualTo("RF-EXISTING-123");
        assertThat(response.status()).isEqualTo("COMPLETED");
        verify(transactionRepository, never()).findByTransactionRefForUpdate(any());
        verify(accountRepository, never()).save(any());
    }

    @Test
    @DisplayName("processRefund_UnauthorizedUserError: User trying to refund someone else's transaction throws IDOR 400")
    void processRefund_UnauthorizedUserError() {
        completedTx.setSourceAccountId(999L); // Original transaction belongs to account 999, not 10
        RefundCreateRequest request = new RefundCreateRequest("TXN-PAY-100", "ORD-100", new BigDecimal("500000.00"), "IDOR attempt");

        when(userRepository.findByUsername("customer@test.com")).thenReturn(Optional.of(activeUser));
        when(refundRepository.findByOrderId("ORD-100")).thenReturn(Optional.empty());
        when(transactionRepository.findByTransactionRefForUpdate("TXN-PAY-100")).thenReturn(Optional.of(completedTx));
        when(accountRepository.findByOwnerIdAndOwnerType(100L, OwnerType.USER)).thenReturn(Optional.of(userAccount));

        assertThatThrownBy(() -> refundService.processRefund(request, "customer@test.com"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("does not belong to the authenticated user");
    }

    @Test
    @DisplayName("processRefund_InvalidAmountError: Negative or null amount throws 400")
    void processRefund_InvalidAmountError() {
        RefundCreateRequest request = new RefundCreateRequest("TXN-PAY-100", "ORD-100", new BigDecimal("-10000.00"), "Negative amount");

        when(userRepository.findByUsername("customer@test.com")).thenReturn(Optional.of(activeUser));

        assertThatThrownBy(() -> refundService.processRefund(request, "customer@test.com"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("must be a positive number greater than zero");
    }

    @Test
    @DisplayName("processRefund_BnplSuccess: BNPL refund cancels installments")
    void processRefund_BnplSuccess() {
        completedTx.setDescription("BNPL Installment Order #ORD-200");
        completedTx.setType(TransactionType.LOAN_REPAYMENT);
        RefundCreateRequest request = new RefundCreateRequest("TXN-PAY-100", "ORD-200", new BigDecimal("500000.00"), "Cancel BNPL");

        when(userRepository.findByUsername("customer@test.com")).thenReturn(Optional.of(activeUser));
        when(refundRepository.findByOrderId("ORD-200")).thenReturn(Optional.empty());
        when(transactionRepository.findByTransactionRefForUpdate("TXN-PAY-100")).thenReturn(Optional.of(completedTx));
        when(accountRepository.findByOwnerIdAndOwnerType(100L, OwnerType.USER)).thenReturn(Optional.of(userAccount));
        when(refundRepository.sumRefundedAmountByOriginalTransactionRef("TXN-PAY-100")).thenReturn(BigDecimal.ZERO);
        when(accountRepository.findByOwnerIdAndOwnerType(5L, OwnerType.MERCHANT)).thenReturn(Optional.of(merchantAccount));
        when(accountRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(userAccount));
        when(accountRepository.findByIdForUpdate(20L)).thenReturn(Optional.of(merchantAccount));
        when(refundRepository.save(any(Refund.class))).thenAnswer(i -> i.getArgument(0));

        RefundResponse response = refundService.processRefund(request, "customer@test.com");

        assertThat(response.sourceType()).isEqualTo("BNPL");
        assertThat(response.installmentsCancelled()).isEqualTo(3);
    }

    @Test
    @DisplayName("processRefund_InsufficientMerchantBalanceError: Throws 400 when merchant balance is insufficient")
    void processRefund_InsufficientMerchantBalanceError() {
        merchantAccount.setBalance(new BigDecimal("100000.00"));
        RefundCreateRequest request = new RefundCreateRequest("TXN-PAY-100", "ORD-100", new BigDecimal("500000.00"), "Defective item");

        when(userRepository.findByUsername("customer@test.com")).thenReturn(Optional.of(activeUser));
        when(refundRepository.findByOrderId("ORD-100")).thenReturn(Optional.empty());
        when(transactionRepository.findByTransactionRefForUpdate("TXN-PAY-100")).thenReturn(Optional.of(completedTx));
        when(accountRepository.findByOwnerIdAndOwnerType(100L, OwnerType.USER)).thenReturn(Optional.of(userAccount));
        when(refundRepository.sumRefundedAmountByOriginalTransactionRef("TXN-PAY-100")).thenReturn(BigDecimal.ZERO);
        when(accountRepository.findByOwnerIdAndOwnerType(5L, OwnerType.MERCHANT)).thenReturn(Optional.of(merchantAccount));
        when(accountRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(userAccount));
        when(accountRepository.findByIdForUpdate(20L)).thenReturn(Optional.of(merchantAccount));

        assertThatThrownBy(() -> refundService.processRefund(request, "customer@test.com"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Merchant wallet balance");
    }

    @Test
    @DisplayName("processRefund_CumulativeOverRefundError: Throws 400 when cumulative refund amount exceeds original tx amount")
    void processRefund_CumulativeOverRefundError() {
        RefundCreateRequest request = new RefundCreateRequest("TXN-PAY-100", "ORD-100", new BigDecimal("300000.00"), "Partial refund");

        when(userRepository.findByUsername("customer@test.com")).thenReturn(Optional.of(activeUser));
        when(refundRepository.findByOrderId("ORD-100")).thenReturn(Optional.empty());
        when(transactionRepository.findByTransactionRefForUpdate("TXN-PAY-100")).thenReturn(Optional.of(completedTx));
        when(accountRepository.findByOwnerIdAndOwnerType(100L, OwnerType.USER)).thenReturn(Optional.of(userAccount));
        when(refundRepository.sumRefundedAmountByOriginalTransactionRef("TXN-PAY-100")).thenReturn(new BigDecimal("300000.00"));

        assertThatThrownBy(() -> refundService.processRefund(request, "customer@test.com"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("would exceed original transaction amount");
    }

    @Test
    @DisplayName("processRefund_MissingMerchantIdError: Throws 400 when original tx is missing merchantId")
    void processRefund_MissingMerchantIdError() {
        completedTx.setMerchantId(null);
        RefundCreateRequest request = new RefundCreateRequest("TXN-PAY-100", "ORD-100", new BigDecimal("500000.00"), "Refund");

        when(userRepository.findByUsername("customer@test.com")).thenReturn(Optional.of(activeUser));
        when(refundRepository.findByOrderId("ORD-100")).thenReturn(Optional.empty());
        when(transactionRepository.findByTransactionRefForUpdate("TXN-PAY-100")).thenReturn(Optional.of(completedTx));

        assertThatThrownBy(() -> refundService.processRefund(request, "customer@test.com"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("missing merchant reference");
    }

    @Test
    @DisplayName("processRefund_UncompletedTxError: Refund on non-COMPLETED transaction throws 400")
    void processRefund_UncompletedTxError() {
        completedTx.setStatus(TransactionStatus.PENDING);
        RefundCreateRequest request = new RefundCreateRequest("TXN-PAY-100", "ORD-100", new BigDecimal("500000.00"), "Pending refund");

        when(userRepository.findByUsername("customer@test.com")).thenReturn(Optional.of(activeUser));
        when(refundRepository.findByOrderId("ORD-100")).thenReturn(Optional.empty());
        when(transactionRepository.findByTransactionRefForUpdate("TXN-PAY-100")).thenReturn(Optional.of(completedTx));

        assertThatThrownBy(() -> refundService.processRefund(request, "customer@test.com"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("cannot be refunded");
    }

    @Test
    @DisplayName("processRefund_TxNotFound: Non-existing transactionRef throws 404")
    void processRefund_TxNotFound() {
        RefundCreateRequest request = new RefundCreateRequest("TXN-INVALID", "ORD-100", new BigDecimal("500000.00"), "Not found");

        when(userRepository.findByUsername("customer@test.com")).thenReturn(Optional.of(activeUser));
        when(refundRepository.findByOrderId("ORD-100")).thenReturn(Optional.empty());
        when(transactionRepository.findByTransactionRefForUpdate("TXN-INVALID")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> refundService.processRefund(request, "customer@test.com"))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Original transaction not found");
    }
}
