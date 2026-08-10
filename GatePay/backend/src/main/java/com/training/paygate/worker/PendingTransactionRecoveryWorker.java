package com.training.paygate.worker;

import com.training.paygate.entity.Transaction;
import com.training.paygate.enums.TransactionStatus;
import com.training.paygate.repository.TransactionRepository;
import com.training.paygate.service.impl.AsyncSettlementService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class PendingTransactionRecoveryWorker {

    private final TransactionRepository transactionRepository;
    private final AsyncSettlementService asyncSettlementService;

    // Run every minute
    @Scheduled(fixedDelay = 60000)
    public void recoverPendingTransactions() {
        log.info("[PENDING_RECOVERY] Starting recovery job for stuck PENDING transactions");
        
        // Find transactions stuck in PENDING for more than 5 minutes
        LocalDateTime cutoff = LocalDateTime.now().minusMinutes(5);
        List<Transaction> stuckTransactions = transactionRepository.findByStatusAndCreatedAtBefore(TransactionStatus.PENDING, cutoff);
        
        if (stuckTransactions.isEmpty()) {
            log.info("[PENDING_RECOVERY] No stuck transactions found.");
            return;
        }

        log.info("[PENDING_RECOVERY] Found {} stuck transactions. Attempting recovery...", stuckTransactions.size());

        for (Transaction tx : stuckTransactions) {
            try {
                log.info("[PENDING_RECOVERY] Retrying settlement for tx: {}", tx.getTransactionRef());
                // Call the async method
                asyncSettlementService.settlePaymentAsync(tx.getId());
            } catch (Exception e) {
                log.error("[PENDING_RECOVERY] Error recovering tx: {}", tx.getTransactionRef(), e);
            }
        }
        
        log.info("[PENDING_RECOVERY] Recovery job finished.");
    }
}
