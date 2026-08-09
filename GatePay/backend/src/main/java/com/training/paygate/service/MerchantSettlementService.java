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

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

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
        log.info("Scanning for due escrow settlements completed before cutoff date: {} (holdDays={})", cutoffDate, holdDays);

        int processedCount = 0;
        int pageSize = 100;
        int pageNumber = 0;
        boolean hasMore = true;

        while (hasMore) {
            Pageable pageable = PageRequest.of(pageNumber, pageSize);
            Page<Transaction> transactionPage = transactionRepository.findPendingEscrowSettlementTransactions(cutoffDate, pageable);
            
            List<Transaction> pendingTxs = transactionPage.getContent();
            log.info("Found {} pending transaction(s) on page {}", pendingTxs.size(), pageNumber);

            for (Transaction tx : pendingTxs) {
                try {
                    settleSingleTransaction(tx);
                    processedCount++;
                } catch (Exception e) {
                    log.error("Failed to process escrow settlement for transactionRef {}: {}", tx.getTransactionRef(), e.getMessage(), e);
                }
            }
            
            // If we didn't get a full page, or the query results change (since settleSingleTransaction creates settlements, 
            // the offset changes), it's actually safer to just keep requesting page 0 until it's empty!
            // Wait, if settleSingleTransaction successfully saves MerchantSettlement, the NOT EXISTS clause will exclude it from the next query.
            // If it fails, it stays in the list. To avoid infinite loops on failed records, we should advance the pageNumber.
            // However, advancing pageNumber when records drop out of the result set causes us to skip records.
            // Let's just break if it's empty, or keep fetching page 0 and limit the max iterations to prevent infinite loop.
            if (!transactionPage.hasNext()) {
                hasMore = false;
            } else {
                pageNumber++;
            }
        }

        log.info("Finished escrow settlements. Successfully processed {} transactions.", processedCount);
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

        // 2. Check Refund & Calculate Net Settlement Amount
        BigDecimal totalAmount = originalTx.getAmount();
        BigDecimal refundedAmount = refundRepository.sumRefundedAmountByOriginalTransactionRef(origTxRef);
        if (refundedAmount == null) {
            refundedAmount = BigDecimal.ZERO;
        }

        // Case A: 100% Full Refund (or refundedAmount >= totalAmount) -> Skip transfer
        if (refundedAmount.compareTo(totalAmount) >= 0) {
            log.info(
                    "Transaction {} has been fully refunded (refunded: {} VND >= total: {} VND). Marking settlement as CANCELLED_REFUNDED and skipping transfer.",
                    origTxRef, refundedAmount, totalAmount);

            MerchantSettlement cancelledRecord = MerchantSettlement.builder()
                    .settlementRef(
                            "STL-REF-" + UUID.randomUUID().toString().replace("-", "").substring(0, 16).toUpperCase())
                    .originalTransactionRef(origTxRef)
                    .merchantId(originalTx.getMerchantId())
                    .amount(BigDecimal.ZERO)
                    .status(SettlementStatus.CANCELLED_REFUNDED)
                    .build();
            merchantSettlementRepository.save(cancelledRecord);
            return;
        }

        // Case B: Partial Refund (0 < refundedAmount < totalAmount) OR No Refund (refundedAmount == 0)
        // Net amount transferred to Merchant = totalAmount - refundedAmount
        BigDecimal netSettlementAmount = totalAmount.subtract(refundedAmount);
        log.info("Settling transaction {}: total={} VND, refunded={} VND -> netSettlementAmount={} VND to merchantId {}",
                origTxRef, totalAmount, refundedAmount, netSettlementAmount, originalTx.getMerchantId());

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

        // 5. Balance Validation
        if (systemAccount.getBalance().compareTo(netSettlementAmount) < 0) {
            log.error("Insufficient balance in System Escrow Account ({}) for settlement net amount {} on tx {}.",
                    systemAccount.getBalance(), netSettlementAmount, origTxRef);
            return;
        }

        // 6. Transfer Balance: Deduct Net System Escrow, Credit Net Merchant Wallet
        systemAccount.setBalance(systemAccount.getBalance().subtract(netSettlementAmount));
        merchantAccount.setBalance(merchantAccount.getBalance().add(netSettlementAmount));

        accountRepository.save(systemAccount);
        accountRepository.save(merchantAccount);

        balanceCacheService.evictBalance(systemAccount.getId());
        balanceCacheService.evictBalance(merchantAccount.getId());

        // 7. Record Ledger Entries (DEBIT System Escrow, CREDIT Merchant Wallet)
        LedgerEntry debitSystem = LedgerEntry.builder()
                .transactionId(originalTx.getId())
                .accountId(systemAccount.getId())
                .entryType(EntryType.DEBIT)
                .amount(netSettlementAmount)
                .balanceAfter(systemAccount.getBalance())
                .build();

        LedgerEntry creditMerchant = LedgerEntry.builder()
                .transactionId(originalTx.getId())
                .accountId(merchantAccount.getId())
                .entryType(EntryType.CREDIT)
                .amount(netSettlementAmount)
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
                .amount(netSettlementAmount)
                .status(SettlementStatus.COMPLETED)
                .build();
        merchantSettlementRepository.save(settlement);

        // 9. Save Audit Transaction Record (Type: SETTLEMENT)
        String stlTxRef = "TX-STL-" + UUID.randomUUID().toString().replace("-", "").substring(0, 16).toUpperCase();
        Transaction settlementTx = Transaction.builder()
                .transactionRef(stlTxRef)
                .sourceAccountId(systemAccount.getId())
                .destAccountId(merchantAccount.getId())
                .amount(netSettlementAmount)
                .currency(originalTx.getCurrency() != null ? originalTx.getCurrency() : "VND")
                .type(TransactionType.SETTLEMENT)
                .status(TransactionStatus.COMPLETED)
                .merchantId(merchantId)
                .description(refundedAmount.compareTo(BigDecimal.ZERO) > 0
                        ? String.format("30-Day Escrow Settlement (Net after %,.0f VND refund) for Order Tx #%s", refundedAmount, origTxRef)
                        : "30-Day Escrow Settlement for Order Tx #" + origTxRef)
                .build();
        transactionRepository.save(settlementTx);

        // 10. Dispatch Notification & RabbitMQ Event to Merchant User
        try {
            String msg;
            if (refundedAmount.compareTo(BigDecimal.ZERO) > 0) {
                msg = String.format(
                        "Auto-settlement completed: +%,.0f VND (Net after %,.0f VND refund from order transaction #%s) has been transferred to your merchant wallet.",
                        netSettlementAmount, refundedAmount, origTxRef);
            } else {
                msg = String.format(
                        "Auto-settlement completed: +%,.0f VND from order transaction #%s has been transferred to your merchant wallet.",
                        netSettlementAmount, origTxRef);
            }
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
                    netSettlementAmount,
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

        log.info("Escrow settlement {} completed for original txRef {}: +{} VND (net) to merchantId {}",
                settlementRef, origTxRef, netSettlementAmount, merchantId);
    }
}
