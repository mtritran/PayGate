package com.training.paygate.service.impl;

import com.training.paygate.cache.BalanceCacheService;
import com.training.paygate.entity.Account;
import com.training.paygate.entity.LedgerEntry;
import com.training.paygate.entity.Merchant;
import com.training.paygate.entity.Transaction;
import com.training.paygate.entity.User;
import com.training.paygate.enums.AccountStatus;
import com.training.paygate.enums.EntryType;
import com.training.paygate.enums.OwnerType;
import com.training.paygate.enums.TransactionStatus;
import com.training.paygate.enums.TransactionType;
import com.training.paygate.exception.InsufficientBalanceException;
import com.training.paygate.exception.ResourceNotFoundException;
import com.training.paygate.messaging.event.PaymentCompletedEvent;
import com.training.paygate.repository.AccountRepository;
import com.training.paygate.repository.LedgerEntryRepository;
import com.training.paygate.repository.MerchantRepository;
import com.training.paygate.repository.TransactionRepository;
import com.training.paygate.repository.UserRepository;
import com.training.paygate.repository.CheckoutSessionRepository;
import com.training.paygate.entity.CheckoutSession;
import com.training.paygate.service.LoyaltyService;
import com.training.paygate.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.core.AmqpTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.concurrent.CompletableFuture;

@Service
@RequiredArgsConstructor
@Slf4j
public class AsyncSettlementService {

    private final TransactionRepository transactionRepository;
    private final AccountRepository accountRepository;
    private final LedgerEntryRepository ledgerEntryRepository;
    private final BalanceCacheService balanceCacheService;
    private final MerchantRepository merchantRepository;
    private final UserRepository userRepository;
    private final AmqpTemplate amqpTemplate;
    private final LoyaltyService loyaltyService;
    private final NotificationService notificationService;
    private final CheckoutSessionRepository checkoutSessionRepository;

    @Async("settlementTaskExecutor")
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public CompletableFuture<Void> settlePaymentAsync(Long transactionId) {
        Transaction transaction = transactionRepository.findById(transactionId).orElse(null);
        if (transaction == null) {
            log.warn("Settlement skipped because transaction {} was not found", transactionId);
            return CompletableFuture.completedFuture(null);
        }

        if (transaction.getStatus() != TransactionStatus.PENDING) {
            log.info("Settlement skipped for transaction {} because status is {}", transaction.getTransactionRef(), transaction.getStatus());
            return CompletableFuture.completedFuture(null);
        }

        transaction.setStatus(TransactionStatus.PROCESSING);
        transactionRepository.save(transaction);

        try {
            log.info("[ASYNC SETTLEMENT] Simulating processing delay of 3s for txRef {}", transaction.getTransactionRef());
            Thread.sleep(3000);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }

        Account sourceAccount = accountRepository.findById(transaction.getSourceAccountId()).orElse(null);
        Account destAccount = accountRepository.findById(transaction.getDestAccountId()).orElse(null);
        if (sourceAccount == null || destAccount == null) {
            failTransaction(transaction, "Source or destination account not found");
            return CompletableFuture.completedFuture(null);
        }

        Long firstId = Math.min(sourceAccount.getId(), destAccount.getId());
        Long secondId = Math.max(sourceAccount.getId(), destAccount.getId());

        Account firstLocked = accountRepository.findByIdForUpdate(firstId)
                .orElseThrow(() -> new ResourceNotFoundException("Account", firstId));
        Account secondLocked = accountRepository.findByIdForUpdate(secondId)
                .orElseThrow(() -> new ResourceNotFoundException("Account", secondId));

        Account lockedSource = firstLocked.getId().equals(sourceAccount.getId()) ? firstLocked : secondLocked;
        Account lockedDest = firstLocked.getId().equals(destAccount.getId()) ? firstLocked : secondLocked;

        if (lockedSource.getStatus() != AccountStatus.ACTIVE) {
            failTransaction(transaction, "Source account is not active");
            return CompletableFuture.completedFuture(null);
        }
        if (lockedDest.getStatus() != AccountStatus.ACTIVE) {
            failTransaction(transaction, "Destination account is not active");
            return CompletableFuture.completedFuture(null);
        }
        if (lockedSource.getBalance().compareTo(transaction.getAmount()) < 0) {
            failTransaction(transaction, "Insufficient balance");
            return CompletableFuture.completedFuture(null);
        }

        lockedSource.setBalance(lockedSource.getBalance().subtract(transaction.getAmount()));
        lockedDest.setBalance(lockedDest.getBalance().add(transaction.getAmount()));
        accountRepository.save(lockedSource);
        accountRepository.save(lockedDest);

        transaction.setStatus(TransactionStatus.COMPLETED);
        transactionRepository.save(transaction);

        try {
            checkoutSessionRepository.findByTransactionRef(transaction.getTransactionRef()).ifPresent(session -> {
                session.setStatus("SUCCESS");
                checkoutSessionRepository.save(session);
                log.info("[ASYNC SETTLEMENT] Updated CheckoutSession {} to SUCCESS", session.getToken());
            });
        } catch (Exception e) {
            log.error("Failed to update checkout session status to SUCCESS: {}", e.getMessage());
        }

        LedgerEntry debitEntry = LedgerEntry.builder()
                .transactionId(transaction.getId())
                .accountId(lockedSource.getId())
                .entryType(EntryType.DEBIT)
                .amount(transaction.getAmount())
                .balanceAfter(lockedSource.getBalance())
                .build();

        LedgerEntry creditEntry = LedgerEntry.builder()
                .transactionId(transaction.getId())
                .accountId(lockedDest.getId())
                .entryType(EntryType.CREDIT)
                .amount(transaction.getAmount())
                .balanceAfter(lockedDest.getBalance())
                .build();

        ledgerEntryRepository.save(debitEntry);
        ledgerEntryRepository.save(creditEntry);

        final Long sourceIdToEvict = lockedSource.getId();
        final Long destIdToEvict = lockedDest.getId();
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    balanceCacheService.evictBalance(sourceIdToEvict);
                    balanceCacheService.evictBalance(destIdToEvict);
                }
            });
        } else {
            balanceCacheService.evictBalance(sourceIdToEvict);
            balanceCacheService.evictBalance(destIdToEvict);
        }

        User payer = userRepository.findById(lockedSource.getOwnerId()).orElse(null);
        if (lockedSource.getOwnerType() == OwnerType.USER && lockedDest.getOwnerType() == OwnerType.MERCHANT) {
            if (payer != null) {
                loyaltyService.earnPoints(payer.getId(), transaction.getAmount(), transaction.getTransactionRef());
            }
        }

        String merchantWebhookUrl = null;
        if (transaction.getMerchantId() != null) {
            Merchant merchant = merchantRepository.findById(transaction.getMerchantId()).orElse(null);
            if (merchant != null) {
                merchantWebhookUrl = merchant.getWebhookUrl();
            }
        }

        PaymentCompletedEvent event = new PaymentCompletedEvent(
                transaction.getTransactionRef(),
                transaction.getMerchantId(),
                merchantWebhookUrl,
                transaction.getAmount(),
                transaction.getStatus().name(),
                payer != null ? payer.getEmail() : null,
                payer != null ? payer.getUsername() : null,
                lockedDest.getAccountNumber(),
                transaction.getDescription(),
                transaction.getType(),
                payer != null ? payer.getId() : null);
        try {
            amqpTemplate.convertAndSend("payment.exchange", "payment.completed", event);
            log.info("[ASYNC SETTLEMENT] Published PaymentCompletedEvent for txRef {}", transaction.getTransactionRef());
        } catch (Exception e) {
            log.warn("Could not publish PaymentCompletedEvent for async settlement: {}", e.getMessage());
        }

        try {
            if (payer != null) {
                String senderMsg = String.format("Tài khoản của bạn đã bị trừ -%,.0f VND. Giao dịch: %s. Nội dung: %s",
                        transaction.getAmount().doubleValue(), transaction.getTransactionRef(),
                        transaction.getDescription() != null ? transaction.getDescription() : "");
                notificationService.createNotification(payer.getId(), "Giao dịch chuyển tiền", senderMsg, "PAYMENT_SENT");
            }

            if (lockedDest.getOwnerType() == OwnerType.USER) {
                User recipient = userRepository.findById(lockedDest.getOwnerId()).orElse(null);
                if (recipient != null) {
                    String recipientMsg = String.format("Tài khoản của bạn đã được cộng +%,.0f VND từ %s. Giao dịch: %s. Nội dung: %s",
                            transaction.getAmount().doubleValue(), payer != null ? payer.getUsername() : "system",
                            transaction.getTransactionRef(),
                            transaction.getDescription() != null ? transaction.getDescription() : "");
                    notificationService.createNotification(recipient.getId(), "Nhận được tiền", recipientMsg, "PAYMENT_RECEIVED");
                }
            }
        } catch (Exception e) {
            log.error("Failed to create real-time notification for async settlement: {}", e.getMessage());
        }

        return CompletableFuture.completedFuture(null);
    }

    private void failTransaction(Transaction transaction, String reason) {
        transaction.setStatus(TransactionStatus.FAILED);
        transactionRepository.save(transaction);
        log.warn("Payment settlement failed for transaction {}: {}", transaction.getTransactionRef(), reason);

        try {
            checkoutSessionRepository.findByTransactionRef(transaction.getTransactionRef()).ifPresent(session -> {
                session.setStatus("FAILED");
                checkoutSessionRepository.save(session);
                log.info("[ASYNC SETTLEMENT] Updated CheckoutSession {} to FAILED", session.getToken());
            });
        } catch (Exception e) {
            log.error("Failed to update checkout session status to FAILED: {}", e.getMessage());
        }

        String merchantWebhookUrl = null;
        if (transaction.getMerchantId() != null) {
            Merchant merchant = merchantRepository.findById(transaction.getMerchantId()).orElse(null);
            if (merchant != null) {
                merchantWebhookUrl = merchant.getWebhookUrl();
            }
        }

        PaymentCompletedEvent event = new PaymentCompletedEvent(
                transaction.getTransactionRef(),
                transaction.getMerchantId(),
                merchantWebhookUrl,
                transaction.getAmount(),
                "FAILED",
                null,
                null,
                null,
                transaction.getDescription(),
                transaction.getType(),
                null);
        try {
            amqpTemplate.convertAndSend("payment.exchange", "payment.completed", event);
            log.info("[ASYNC SETTLEMENT] Published PaymentCompletedEvent (FAILED) for txRef {}", transaction.getTransactionRef());
        } catch (Exception e) {
            log.warn("Could not publish PaymentCompletedEvent for failed async settlement: {}", e.getMessage());
        }
    }
}
