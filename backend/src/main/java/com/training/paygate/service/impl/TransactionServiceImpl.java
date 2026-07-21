package com.training.paygate.service.impl;

import com.training.paygate.cache.BalanceCacheService;
import com.training.paygate.cache.IdempotencyCacheService;
import com.training.paygate.dto.request.PaymentRequest;
import com.training.paygate.dto.response.TransactionResponse;
import com.training.paygate.entity.Account;
import com.training.paygate.entity.LedgerEntry;
import com.training.paygate.entity.Merchant;
import com.training.paygate.entity.Transaction;
import com.training.paygate.entity.User;
import com.training.paygate.enums.EntryType;
import com.training.paygate.enums.OwnerType;
import com.training.paygate.enums.TransactionStatus;
import com.training.paygate.enums.TransactionType;
import com.training.paygate.exception.BadRequestException;
import com.training.paygate.exception.InsufficientBalanceException;
import com.training.paygate.exception.ResourceNotFoundException;
import com.training.paygate.messaging.event.PaymentCompletedEvent;
import com.training.paygate.repository.AccountRepository;
import com.training.paygate.repository.LedgerEntryRepository;
import com.training.paygate.repository.MerchantRepository;
import com.training.paygate.repository.TransactionRepository;
import com.training.paygate.repository.UserRepository;
import com.training.paygate.service.TransactionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.core.AmqpTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class TransactionServiceImpl implements TransactionService {

    private final AccountRepository accountRepository;
    private final UserRepository userRepository;
    private final MerchantRepository merchantRepository;
    private final TransactionRepository transactionRepository;
    private final LedgerEntryRepository ledgerEntryRepository;
    private final BalanceCacheService balanceCacheService;
    private final IdempotencyCacheService idempotencyCacheService;
    private final AmqpTemplate amqpTemplate;

    @Override
    @Transactional(isolation = Isolation.SERIALIZABLE)
    public TransactionResponse processPayment(PaymentRequest request, String currentUsername) {
        // 1. Check idempotency key in Redis / DB
        String cachedRef = idempotencyCacheService.get(request.idempotencyKey());
        if (cachedRef != null) {
            Transaction tx = transactionRepository.findByTransactionRef(cachedRef).orElse(null);
            if (tx != null) {
                return mapToResponse(tx);
            }
        }

        Transaction existingTx = transactionRepository.findByIdempotencyKey(request.idempotencyKey()).orElse(null);
        if (existingTx != null) {
            idempotencyCacheService.set(request.idempotencyKey(), existingTx.getTransactionRef());
            return mapToResponse(existingTx);
        }

        // 2. Look up user and source account
        User user = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with username: " + currentUsername));
        Account sourceAccount = accountRepository.findByOwnerIdAndOwnerType(user.getId(), OwnerType.USER)
                .orElseThrow(() -> new ResourceNotFoundException("Source account not found for user: " + currentUsername));

        // 3. Look up destination account
        Account destAccount = accountRepository.findById(request.destAccountId())
                .orElseThrow(() -> new ResourceNotFoundException("Destination account not found with ID: " + request.destAccountId()));

        if (sourceAccount.getId().equals(destAccount.getId())) {
            throw new BadRequestException("Source and destination accounts must be different");
        }

        // 4. Verify merchant active status if merchantId is provided
        String merchantWebhookUrl = null;
        if (request.merchantId() != null) {
            Merchant merchant = merchantRepository.findById(request.merchantId())
                    .orElseThrow(() -> new ResourceNotFoundException("Merchant", request.merchantId()));
            if (!merchant.isActive()) {
                throw new BadRequestException("Merchant is inactive");
            }
            merchantWebhookUrl = merchant.getWebhookUrl();
        }

        // 5. Lock accounts in ascending ID order to prevent deadlock
        Long firstId = Math.min(sourceAccount.getId(), destAccount.getId());
        Long secondId = Math.max(sourceAccount.getId(), destAccount.getId());

        Account firstLocked = accountRepository.findByIdForUpdate(firstId)
                .orElseThrow(() -> new ResourceNotFoundException("Account", firstId));
        Account secondLocked = accountRepository.findByIdForUpdate(secondId)
                .orElseThrow(() -> new ResourceNotFoundException("Account", secondId));

        Account lockedSource = firstLocked.getId().equals(sourceAccount.getId()) ? firstLocked : secondLocked;
        Account lockedDest = firstLocked.getId().equals(destAccount.getId()) ? firstLocked : secondLocked;

        // 6. Validate balance
        if (lockedSource.getBalance().compareTo(request.amount()) < 0) {
            throw new InsufficientBalanceException("Insufficient balance in account: " + lockedSource.getAccountNumber());
        }

        // 7. Update balances
        lockedSource.setBalance(lockedSource.getBalance().subtract(request.amount()));
        lockedDest.setBalance(lockedDest.getBalance().add(request.amount()));

        accountRepository.save(lockedSource);
        accountRepository.save(lockedDest);

        // 8. Save Transaction
        Transaction transaction = Transaction.builder()
                .transactionRef("TXN-PAY-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase())
                .idempotencyKey(request.idempotencyKey())
                .sourceAccountId(lockedSource.getId())
                .destAccountId(lockedDest.getId())
                .amount(request.amount())
                .currency("VND")
                .type(TransactionType.PAYMENT)
                .status(TransactionStatus.COMPLETED)
                .merchantId(request.merchantId())
                .description(request.description())
                .build();
        transaction = transactionRepository.save(transaction);

        // 9. Save Ledger Entries
        LedgerEntry debitEntry = LedgerEntry.builder()
                .transactionId(transaction.getId())
                .accountId(lockedSource.getId())
                .entryType(EntryType.DEBIT)
                .amount(request.amount())
                .balanceAfter(lockedSource.getBalance())
                .build();

        LedgerEntry creditEntry = LedgerEntry.builder()
                .transactionId(transaction.getId())
                .accountId(lockedDest.getId())
                .entryType(EntryType.CREDIT)
                .amount(request.amount())
                .balanceAfter(lockedDest.getBalance())
                .build();

        ledgerEntryRepository.save(debitEntry);
        ledgerEntryRepository.save(creditEntry);

        // 10. Write to Idempotency Cache
        idempotencyCacheService.set(request.idempotencyKey(), transaction.getTransactionRef());

        // 11. Evict balances from cache AFTER successful transaction commit
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

        // 12. Publish Completed Event to RabbitMQ
        PaymentCompletedEvent event = new PaymentCompletedEvent(
                transaction.getTransactionRef(),
                request.merchantId(),
                merchantWebhookUrl,
                transaction.getAmount(),
                transaction.getStatus().name()
        );
        try {
            amqpTemplate.convertAndSend("payment.exchange", "payment.completed", event);
        } catch (Exception e) {
            log.warn("Could not publish PaymentCompletedEvent to RabbitMQ (this is expected if exchange 'payment.exchange' is not yet configured): {}", e.getMessage());
        }

        return mapToResponse(transaction);
    }

    private TransactionResponse mapToResponse(Transaction tx) {
        return new TransactionResponse(
                tx.getTransactionRef(),
                tx.getStatus().name(),
                tx.getAmount(),
                tx.getSourceAccountId(),
                tx.getDestAccountId(),
                tx.getType().name(),
                tx.getDescription(),
                tx.getCreatedAt()
        );
    }
}
