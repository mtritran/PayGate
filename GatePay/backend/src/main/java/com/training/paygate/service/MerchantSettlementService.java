package com.training.paygate.service;

import com.training.paygate.cache.BalanceCacheService;
import com.training.paygate.entity.Account;
import com.training.paygate.entity.LedgerEntry;
import com.training.paygate.entity.Merchant;
import com.training.paygate.entity.MerchantSettlement;
import com.training.paygate.entity.Transaction;
import com.training.paygate.enums.EntryType;
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
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class MerchantSettlementService {

    private final TransactionRepository transactionRepository;
    private final MerchantSettlementRepository merchantSettlementRepository;
    private final RefundRepository refundRepository;
    private final AccountRepository accountRepository;
    private final LedgerEntryRepository ledgerEntryRepository;
    private final MerchantRepository merchantRepository;
    private final BalanceCacheService balanceCacheService;
    private final NotificationService notificationService;
    private final PaymentEventPublisher paymentEventPublisher;

    @Value("${app.settlement.hold-days:30}")
    private int holdDays = 30;

    public int processDueEscrowSettlements() {
        LocalDateTime cutoffDate = LocalDateTime.now().minusDays(holdDays);
        log.info("Scanning for due escrow settlements completed before cutoff date: {} (holdDays={})", cutoffDate,
                holdDays);

        List<Transaction> pendingTxs = transactionRepository.findPendingEscrowSettlementTransactions(cutoffDate);
        log.info("Found {} pending transaction(s) eligible for escrow settlement", pendingTxs.size());

        int processedCount = 0;
        for (Transaction tx : pendingTxs) {
            try {
                settleSingleTransaction(tx);
                processedCount++;
            } catch (Exception e) {
                log.error("Failed to process escrow settlement for transactionRef {}: {}", tx.getTransactionRef(),
                        e.getMessage(), e);
            }
        }

        log.info("Finished escrow settlements. Successfully processed {}/{} transactions", processedCount,
                pendingTxs.size());
        return processedCount;
    }

    @Transactional
    public void settleSingleTransaction(Transaction originalTx) {
        String origTxRef = originalTx.getTransactionRef();

        // 1. Idempotency Check: Skip if already settled or processed
        if (merchantSettlementRepository.existsByOriginalTransactionRef(origTxRef)) {
            log.info("Transaction {} is already settled. Skipping.", origTxRef);
            return;
        }

        // 2. Check Refund: Has this order been refunded (100% full refund)?
        BigDecimal refundedAmount = refundRepository.sumRefundedAmountByOriginalTransactionRef(origTxRef);
        if (refundedAmount != null && refundedAmount.compareTo(BigDecimal.ZERO) > 0) {
            log.info(
                    "Transaction {} has been refunded (amount: {} VND). Marking settlement as CANCELLED_REFUNDED and skipping transfer.",
                    origTxRef, refundedAmount);

            MerchantSettlement cancelledRecord = MerchantSettlement.builder()
                    .settlementRef(
                            "STL-REF-" + UUID.randomUUID().toString().replace("-", "").substring(0, 16).toUpperCase())
                    .originalTransactionRef(origTxRef)
                    .merchantId(originalTx.getMerchantId())
                    .amount(originalTx.getAmount())
                    .status(SettlementStatus.CANCELLED_REFUNDED)
                    .build();
            merchantSettlementRepository.save(cancelledRecord);
            return;
        }

        // 3. Retrieve Merchant and Merchant Account
        Long merchantId = originalTx.getMerchantId();
        Merchant merchant = merchantRepository.findById(merchantId).orElse(null);
        if (merchant == null) {
            log.error("Merchant with ID {} not found for transaction {}. Aborting settlement.", merchantId, origTxRef);
            return;
        }

        Account merchantAccount = accountRepository.findByOwnerIdAndOwnerType(merchant.getId(), OwnerType.MERCHANT)
                .orElse(null);
        if (merchantAccount == null) {
            log.error("Merchant Account for merchantId {} not found. Aborting settlement for tx {}.", merchantId,
                    origTxRef);
            return;
        }

        Account systemAccount = accountRepository.findByOwnerIdAndOwnerType(0L, OwnerType.SYSTEM)
                .orElse(null);
        if (systemAccount == null) {
            log.error("System Escrow Account not found. Aborting settlement for tx {}.", origTxRef);
            return;
        }

        // 4. Deadlock Prevention: Lock both accounts by ascending ID order
        Long firstLockId = Math.min(systemAccount.getId(), merchantAccount.getId());
        Long secondLockId = Math.max(systemAccount.getId(), merchantAccount.getId());
        accountRepository.findByIdForUpdate(firstLockId);
        accountRepository.findByIdForUpdate(secondLockId);

        systemAccount = accountRepository.findById(systemAccount.getId()).orElseThrow();
        merchantAccount = accountRepository.findById(merchantAccount.getId()).orElseThrow();

        BigDecimal amount = originalTx.getAmount();

        // 5. Balance Validation
        if (systemAccount.getBalance().compareTo(amount) < 0) {
            log.error("Insufficient balance in System Escrow Account ({}) for settlement amount {} on tx {}.",
                    systemAccount.getBalance(), amount, origTxRef);
            return;
        }

        // 6. Transfer Balance: Deduct 100% System Escrow, Credit 100% Merchant Wallet
        systemAccount.setBalance(systemAccount.getBalance().subtract(amount));
        merchantAccount.setBalance(merchantAccount.getBalance().add(amount));

        accountRepository.save(systemAccount);
        accountRepository.save(merchantAccount);

        balanceCacheService.evictBalance(systemAccount.getId());
        balanceCacheService.evictBalance(merchantAccount.getId());

        // 7. Record Ledger Entries (DEBIT System Escrow, CREDIT Merchant Wallet)
        LedgerEntry debitSystem = LedgerEntry.builder()
                .transactionId(originalTx.getId())
                .accountId(systemAccount.getId())
                .entryType(EntryType.DEBIT)
                .amount(amount)
                .balanceAfter(systemAccount.getBalance())
                .build();

        LedgerEntry creditMerchant = LedgerEntry.builder()
                .transactionId(originalTx.getId())
                .accountId(merchantAccount.getId())
                .entryType(EntryType.CREDIT)
                .amount(amount)
                .balanceAfter(merchantAccount.getBalance())
                .build();

        ledgerEntryRepository.save(debitSystem);
        ledgerEntryRepository.save(creditMerchant);

        // 8. Save Merchant Settlement Record
        String settlementRef = "STL-" + UUID.randomUUID().toString().replace("-", "").toUpperCase();
        MerchantSettlement settlement = MerchantSettlement.builder()
                .settlementRef(settlementRef)
                .originalTransactionRef(origTxRef)
                .merchantId(merchantId)
                .amount(amount)
                .status(SettlementStatus.COMPLETED)
                .build();
        merchantSettlementRepository.save(settlement);

        // 9. Save Audit Transaction Record (Type: SETTLEMENT)
        String stlTxRef = "TX-STL-" + UUID.randomUUID().toString().replace("-", "").substring(0, 16).toUpperCase();
        Transaction settlementTx = Transaction.builder()
                .transactionRef(stlTxRef)
                .sourceAccountId(systemAccount.getId())
                .destAccountId(merchantAccount.getId())
                .amount(amount)
                .currency(originalTx.getCurrency() != null ? originalTx.getCurrency() : "VND")
                .type(TransactionType.SETTLEMENT)
                .status(TransactionStatus.COMPLETED)
                .merchantId(merchantId)
                .description("30-Day Escrow Settlement for Order Tx #" + origTxRef)
                .build();
        transactionRepository.save(settlementTx);

        // 10. Dispatch Notification & RabbitMQ Event to Merchant User
        try {
            String msg = String.format(
                    "Auto-settlement completed: +%,.0f VND from order transaction #%s has been transferred to your merchant wallet.",
                    amount, origTxRef);
            notificationService.createNotification(merchant.getUserId(), "Merchant Settlement Received", msg,
                    "SETTLEMENT");
        } catch (Exception e) {
            log.warn("Could not create in-app notification for merchant settlement: {}", e.getMessage());
        }

        try {
            paymentEventPublisher.publishPaymentCompleted(new PaymentCompletedEvent(
                    settlementRef,
                    merchantId,
                    merchant.getWebhookUrl(),
                    amount,
                    "SETTLED",
                    null,
                    "SYSTEM",
                    merchantAccount.getAccountNumber(),
                    "30-Day Escrow Settlement for Order Tx #" + origTxRef,
                    TransactionType.SETTLEMENT,
                    merchant.getUserId()));
        } catch (Exception e) {
            log.warn("Could not publish settlement event to RabbitMQ: {}", e.getMessage());
        }

        log.info("Escrow settlement {} completed for original txRef {}: +{} VND to merchantId {}",
                settlementRef, origTxRef, amount, merchantId);
    }
}
