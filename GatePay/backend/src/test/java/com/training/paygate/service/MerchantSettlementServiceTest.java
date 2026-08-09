package com.training.paygate.service;

import com.training.paygate.cache.BalanceCacheService;
import com.training.paygate.entity.Account;
import com.training.paygate.entity.LedgerEntry;
import com.training.paygate.entity.Merchant;
import com.training.paygate.entity.MerchantSettlement;
import com.training.paygate.entity.Transaction;
import com.training.paygate.enums.AccountStatus;
import com.training.paygate.enums.MerchantStatus;
import com.training.paygate.enums.OwnerType;
import com.training.paygate.enums.SettlementStatus;
import com.training.paygate.enums.TransactionStatus;
import com.training.paygate.enums.TransactionType;
import com.training.paygate.messaging.event.PaymentCompletedEvent;
import com.training.paygate.messaging.publisher.PaymentEventPublisher;
import com.training.paygate.repository.AccountRepository;
import com.training.paygate.repository.LedgerEntryRepository;
import com.training.paygate.repository.MerchantRepository;
import com.training.paygate.repository.MerchantSettlementRepository;
import com.training.paygate.repository.RefundRepository;
import com.training.paygate.repository.TransactionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MerchantSettlementServiceTest {

    @Mock private TransactionRepository transactionRepository;
    @Mock private MerchantSettlementRepository merchantSettlementRepository;
    @Mock private RefundRepository refundRepository;
    @Mock private AccountRepository accountRepository;
    @Mock private LedgerEntryRepository ledgerEntryRepository;
    @Mock private MerchantRepository merchantRepository;
    @Mock private BalanceCacheService balanceCacheService;
    @Mock private NotificationService notificationService;
    @Mock private PaymentEventPublisher paymentEventPublisher;

    @InjectMocks
    private MerchantSettlementService merchantSettlementService;

    private static final String TX_REF = "TXN-ORD-100235";
    private static final Long MERCHANT_ID = 5L;
    private static final Long MERCHANT_USER_ID = 10L;
    private static final BigDecimal AMOUNT = new BigDecimal("500000.00");

    private Transaction completedTx;
    private Merchant merchant;
    private Account systemAccount;
    private Account merchantAccount;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(merchantSettlementService, "holdDays", 30);

        completedTx = Transaction.builder()
                .id(100L)
                .transactionRef(TX_REF)
                .sourceAccountId(1L)
                .destAccountId(0L)
                .amount(AMOUNT)
                .currency("VND")
                .type(TransactionType.PAYMENT)
                .status(TransactionStatus.COMPLETED)
                .merchantId(MERCHANT_ID)
                .description("Payment for order #ORD-100235")
                .createdAt(LocalDateTime.now().minusDays(31))
                .updatedAt(LocalDateTime.now().minusDays(31))
                .build();

        merchant = Merchant.builder()
                .userId(MERCHANT_USER_ID)
                .merchantName("FIFA World Cup Store")
                .merchantCode("WC2026")
                .apiKey("MC_KEY_WC2026")
                .webhookUrl("http://localhost:8080/api/webhook")
                .active(true)
                .status(MerchantStatus.ACTIVE)
                .build();
        merchant.setId(MERCHANT_ID);

        systemAccount = Account.builder()
                .id(99L)
                .accountNumber("ACC-SYS-001")
                .ownerId(0L)
                .ownerType(OwnerType.SYSTEM)
                .balance(new BigDecimal("10000000.00"))
                .currency("VND")
                .status(AccountStatus.ACTIVE)
                .build();

        merchantAccount = Account.builder()
                .id(50L)
                .accountNumber("ACC-MC-005")
                .ownerId(MERCHANT_ID)
                .ownerType(OwnerType.MERCHANT)
                .balance(new BigDecimal("1000000.00"))
                .currency("VND")
                .status(AccountStatus.ACTIVE)
                .build();
    }

    @Nested
    @DisplayName("Happy Path: Escrow Auto-Settlement after 30 days without refund")
    class HappyPathSettlement {

        @Test
        @DisplayName("processDueEscrowSettlements successfully settles eligible transactions")
        void processDueEscrowSettlements_Success() {
            when(transactionRepository.findPendingEscrowSettlementTransactions(any(), any()))
                    .thenReturn(new org.springframework.data.domain.PageImpl<>(List.of(completedTx)));
            when(merchantSettlementRepository.existsByOriginalTransactionRef(TX_REF)).thenReturn(false);
            when(refundRepository.sumRefundedAmountByOriginalTransactionRef(TX_REF)).thenReturn(BigDecimal.ZERO);
            when(merchantRepository.findById(MERCHANT_ID)).thenReturn(Optional.of(merchant));
            when(accountRepository.findByOwnerIdAndOwnerType(MERCHANT_ID, OwnerType.MERCHANT)).thenReturn(Optional.of(merchantAccount));
            when(accountRepository.findByOwnerIdAndOwnerType(0L, OwnerType.SYSTEM)).thenReturn(Optional.of(systemAccount));
            when(accountRepository.findById(systemAccount.getId())).thenReturn(Optional.of(systemAccount));
            when(accountRepository.findById(merchantAccount.getId())).thenReturn(Optional.of(merchantAccount));

            int count = merchantSettlementService.processDueEscrowSettlements();

            assertThat(count).isEqualTo(1);

            // Verify account balance updates: System -500k, Merchant +500k
            assertThat(systemAccount.getBalance()).isEqualByComparingTo("9500000.00");
            assertThat(merchantAccount.getBalance()).isEqualByComparingTo("1500000.00");
            verify(accountRepository).save(systemAccount);
            verify(accountRepository).save(merchantAccount);

            // Verify cache eviction
            verify(balanceCacheService).evictBalance(systemAccount.getId());
            verify(balanceCacheService).evictBalance(merchantAccount.getId());

            // Verify ledger entries (DEBIT System, CREDIT Merchant)
            ArgumentCaptor<LedgerEntry> ledgerCaptor = ArgumentCaptor.forClass(LedgerEntry.class);
            verify(ledgerEntryRepository, times(2)).save(ledgerCaptor.capture());
            List<LedgerEntry> entries = ledgerCaptor.getAllValues();
            assertThat(entries).hasSize(2);

            // Verify merchant settlement record saved
            ArgumentCaptor<MerchantSettlement> settlementCaptor = ArgumentCaptor.forClass(MerchantSettlement.class);
            verify(merchantSettlementRepository).save(settlementCaptor.capture());
            MerchantSettlement savedSettlement = settlementCaptor.getValue();
            assertThat(savedSettlement.getOriginalTransactionRef()).isEqualTo(TX_REF);
            assertThat(savedSettlement.getMerchantId()).isEqualTo(MERCHANT_ID);
            assertThat(savedSettlement.getAmount()).isEqualByComparingTo(AMOUNT);
            assertThat(savedSettlement.getStatus()).isEqualTo(SettlementStatus.COMPLETED);

            // Verify audit transaction record
            ArgumentCaptor<Transaction> txCaptor = ArgumentCaptor.forClass(Transaction.class);
            verify(transactionRepository).save(txCaptor.capture());
            Transaction savedTx = txCaptor.getValue();
            assertThat(savedTx.getType()).isEqualTo(TransactionType.SETTLEMENT);
            assertThat(savedTx.getStatus()).isEqualTo(TransactionStatus.COMPLETED);

            // Verify notification & event sent to merchant user
            verify(notificationService).createNotification(eq(MERCHANT_USER_ID), anyString(), anyString(), eq("SETTLEMENT"));
            verify(paymentEventPublisher).publishPaymentCompleted(any(PaymentCompletedEvent.class));
        }
    }

    @Nested
    @DisplayName("Branch 1: 100% Refunded Transactions — Skip Transfer")
    class RefundedTransactions {

        @Test
        @DisplayName("settleSingleTransaction skips balance transfer and marks CANCELLED_REFUNDED if fully refunded (100%)")
        void settleSingleTransaction_FullyRefunded_SkipTransfer() {
            when(merchantSettlementRepository.existsByOriginalTransactionRef(TX_REF)).thenReturn(false);
            when(refundRepository.sumRefundedAmountByOriginalTransactionRef(TX_REF)).thenReturn(AMOUNT);

            merchantSettlementService.settleSingleTransaction(completedTx);

            // Verify no accounts or transactions loaded or modified
            verify(accountRepository, never()).findByOwnerIdAndOwnerType(anyLong(), any());
            verify(accountRepository, never()).save(any());
            verify(ledgerEntryRepository, never()).save(any());
            verify(transactionRepository, never()).save(any());

            // Verify record saved with CANCELLED_REFUNDED and amount = 0
            ArgumentCaptor<MerchantSettlement> settlementCaptor = ArgumentCaptor.forClass(MerchantSettlement.class);
            verify(merchantSettlementRepository).save(settlementCaptor.capture());
            MerchantSettlement savedRecord = settlementCaptor.getValue();
            assertThat(savedRecord.getOriginalTransactionRef()).isEqualTo(TX_REF);
            assertThat(savedRecord.getAmount()).isEqualByComparingTo(BigDecimal.ZERO);
            assertThat(savedRecord.getStatus()).isEqualTo(SettlementStatus.CANCELLED_REFUNDED);
        }

        @Test
        @DisplayName("settleSingleTransaction successfully settles remaining Net Amount if partially refunded")
        void settleSingleTransaction_PartiallyRefunded_SettlesNetAmount() {
            // Total = 500,000 VND, Partial Refund = 200,000 VND -> Net Settlement = 300,000 VND
            BigDecimal partialRefund = new BigDecimal("200000.00");
            BigDecimal netAmount = new BigDecimal("300000.00");

            when(merchantSettlementRepository.existsByOriginalTransactionRef(TX_REF)).thenReturn(false);
            when(refundRepository.sumRefundedAmountByOriginalTransactionRef(TX_REF)).thenReturn(partialRefund);
            when(merchantRepository.findById(MERCHANT_ID)).thenReturn(Optional.of(merchant));
            when(accountRepository.findByOwnerIdAndOwnerType(MERCHANT_ID, OwnerType.MERCHANT)).thenReturn(Optional.of(merchantAccount));
            when(accountRepository.findByOwnerIdAndOwnerType(0L, OwnerType.SYSTEM)).thenReturn(Optional.of(systemAccount));
            when(accountRepository.findById(systemAccount.getId())).thenReturn(Optional.of(systemAccount));
            when(accountRepository.findById(merchantAccount.getId())).thenReturn(Optional.of(merchantAccount));

            merchantSettlementService.settleSingleTransaction(completedTx);

            // Verify balances updated by NET amount: System -300k, Merchant +300k
            assertThat(systemAccount.getBalance()).isEqualByComparingTo("9700000.00");
            assertThat(merchantAccount.getBalance()).isEqualByComparingTo("1300000.00");
            verify(accountRepository).save(systemAccount);
            verify(accountRepository).save(merchantAccount);

            // Verify ledger entries for net amount
            ArgumentCaptor<LedgerEntry> ledgerCaptor = ArgumentCaptor.forClass(LedgerEntry.class);
            verify(ledgerEntryRepository, times(2)).save(ledgerCaptor.capture());
            List<LedgerEntry> entries = ledgerCaptor.getAllValues();
            assertThat(entries.get(0).getAmount()).isEqualByComparingTo(netAmount);
            assertThat(entries.get(1).getAmount()).isEqualByComparingTo(netAmount);

            // Verify merchant settlement record saved with net amount and COMPLETED
            ArgumentCaptor<MerchantSettlement> settlementCaptor = ArgumentCaptor.forClass(MerchantSettlement.class);
            verify(merchantSettlementRepository).save(settlementCaptor.capture());
            MerchantSettlement savedSettlement = settlementCaptor.getValue();
            assertThat(savedSettlement.getAmount()).isEqualByComparingTo(netAmount);
            assertThat(savedSettlement.getStatus()).isEqualTo(SettlementStatus.COMPLETED);

            // Verify audit transaction record saved with net amount and formatted description
            ArgumentCaptor<Transaction> txCaptor = ArgumentCaptor.forClass(Transaction.class);
            verify(transactionRepository).save(txCaptor.capture());
            Transaction savedTx = txCaptor.getValue();
            assertThat(savedTx.getType()).isEqualTo(TransactionType.SETTLEMENT);
            assertThat(savedTx.getStatus()).isEqualTo(TransactionStatus.COMPLETED);
            assertThat(savedTx.getAmount()).isEqualByComparingTo(netAmount);
            assertThat(savedTx.getDescription())
                    .contains("Net after")
                    .contains("200,000")
                    .contains(TX_REF);

            // Verify notification sent with net breakdown
            verify(notificationService).createNotification(eq(MERCHANT_USER_ID), anyString(), anyString(), eq("SETTLEMENT"));

            // Verify RabbitMQ settlement event published with net amount
            ArgumentCaptor<PaymentCompletedEvent> eventCaptor = ArgumentCaptor.forClass(PaymentCompletedEvent.class);
            verify(paymentEventPublisher).publishPaymentCompleted(eventCaptor.capture());
            PaymentCompletedEvent publishedEvent = eventCaptor.getValue();
            assertThat(publishedEvent.amount()).isEqualByComparingTo(netAmount);
            assertThat(publishedEvent.merchantId()).isEqualTo(MERCHANT_ID);
            assertThat(publishedEvent.transactionType()).isEqualTo(TransactionType.SETTLEMENT);
            assertThat(publishedEvent.userId()).isEqualTo(MERCHANT_USER_ID);
        }
    }

    @Nested
    @DisplayName("Idempotency & Safety Guards")
    class IdempotencyAndSafety {

        @Test
        @DisplayName("settleSingleTransaction skips if already exists in merchant_settlements")
        void settleSingleTransaction_AlreadyExists_Skip() {
            when(merchantSettlementRepository.existsByOriginalTransactionRef(TX_REF)).thenReturn(true);

            merchantSettlementService.settleSingleTransaction(completedTx);

            verify(refundRepository, never()).sumRefundedAmountByOriginalTransactionRef(anyString());
            verify(accountRepository, never()).save(any());
        }

        @Test
        @DisplayName("Deadlock prevention: Locks accounts in ascending ID order (min first, then max)")
        void settleSingleTransaction_LocksAccountsInAscendingOrder() {
            // System account ID = 99, Merchant account ID = 50 -> Must lock 50 first, then 99
            when(merchantSettlementRepository.existsByOriginalTransactionRef(TX_REF)).thenReturn(false);
            when(refundRepository.sumRefundedAmountByOriginalTransactionRef(TX_REF)).thenReturn(BigDecimal.ZERO);
            when(merchantRepository.findById(MERCHANT_ID)).thenReturn(Optional.of(merchant));
            when(accountRepository.findByOwnerIdAndOwnerType(MERCHANT_ID, OwnerType.MERCHANT)).thenReturn(Optional.of(merchantAccount));
            when(accountRepository.findByOwnerIdAndOwnerType(0L, OwnerType.SYSTEM)).thenReturn(Optional.of(systemAccount));
            when(accountRepository.findById(50L)).thenReturn(Optional.of(merchantAccount));
            when(accountRepository.findById(99L)).thenReturn(Optional.of(systemAccount));

            merchantSettlementService.settleSingleTransaction(completedTx);

            // Verify lock order: 50 first, then 99
            var inOrder = org.mockito.Mockito.inOrder(accountRepository);
            inOrder.verify(accountRepository).findByIdForUpdate(50L);
            inOrder.verify(accountRepository).findByIdForUpdate(99L);
        }
    }
}
