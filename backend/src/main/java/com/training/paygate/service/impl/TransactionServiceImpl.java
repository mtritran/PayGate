package com.training.paygate.service.impl;

import com.training.paygate.cache.BalanceCacheService;
import com.training.paygate.cache.IdempotencyCacheService;
import com.training.paygate.dto.request.PaymentRequest;
import com.training.paygate.dto.response.LedgerEntryResponse;
import com.training.paygate.dto.response.TransactionDetailResponse;
import com.training.paygate.dto.response.TransactionResponse;
import com.training.paygate.entity.Account;
import com.training.paygate.entity.LedgerEntry;
import com.training.paygate.entity.Merchant;
import com.training.paygate.entity.Transaction;
import com.training.paygate.entity.User;
import com.training.paygate.enums.EntryType;
import com.training.paygate.enums.OwnerType;
import com.training.paygate.enums.Role;
import com.training.paygate.enums.TransactionStatus;
import com.training.paygate.enums.TransactionType;
import com.training.paygate.exception.BadRequestException;
import com.training.paygate.exception.InsufficientBalanceException;
import com.training.paygate.exception.ResourceNotFoundException;
import com.training.paygate.exception.InvalidTransactionStateException;
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
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

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

    @Override
    @Transactional(readOnly = true)
    public TransactionDetailResponse getTransactionByRef(String ref, String currentUsername) {
        Transaction tx = transactionRepository.findByTransactionRef(ref)
                .orElseThrow(() -> new ResourceNotFoundException("Transaction not found with reference: " + ref));

        User user = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with username: " + currentUsername));

        if (user.getRole() != Role.ADMIN) {
            Account userAccount = accountRepository.findByOwnerIdAndOwnerType(user.getId(), OwnerType.USER)
                    .orElseThrow(() -> new ResourceNotFoundException("User account not found"));
            if (!tx.getSourceAccountId().equals(userAccount.getId()) && !tx.getDestAccountId().equals(userAccount.getId())) {
                throw new AccessDeniedException("You do not have permission to view this transaction");
            }
        }

        List<LedgerEntryResponse> ledgerEntries = ledgerEntryRepository.findByTransactionId(tx.getId())
                .stream()
                .map(le -> new LedgerEntryResponse(
                        le.getId(),
                        le.getTransactionId(),
                        le.getAccountId(),
                        le.getEntryType().name(),
                        le.getAmount(),
                        le.getBalanceAfter(),
                        le.getCreatedAt()
                ))
                .collect(Collectors.toList());

        return new TransactionDetailResponse(
                tx.getTransactionRef(),
                tx.getStatus().name(),
                tx.getAmount(),
                tx.getSourceAccountId(),
                tx.getDestAccountId(),
                tx.getType().name(),
                tx.getDescription(),
                tx.getCreatedAt(),
                ledgerEntries
        );
    }

    @Override
    @Transactional(readOnly = true)
    public Page<TransactionResponse> getTransactions(
            Long ownerAccountId,
            TransactionType type,
            TransactionStatus status,
            Long sourceAccountId,
            Long destAccountId,
            Long merchantId,
            Pageable pageable
    ) {
        return transactionRepository.findAllWithFiltersAndOwner(
                ownerAccountId, type, status, sourceAccountId, destAccountId, merchantId, pageable
        ).map(this::mapToResponse);
    }

    @Override
    @Transactional(isolation = Isolation.SERIALIZABLE)
    public TransactionResponse refund(String originalRef, String currentUsername) {
        Transaction originalTx = transactionRepository.findByTransactionRef(originalRef)
                .orElseThrow(() -> new ResourceNotFoundException("Original transaction not found with reference: " + originalRef));

        if (originalTx.getType() != TransactionType.PAYMENT || originalTx.getStatus() != TransactionStatus.COMPLETED) {
            throw new InvalidTransactionStateException("Transaction " + originalRef + " is not in COMPLETED state");
        }

        if (transactionRepository.existsByDescription("Refund for: " + originalRef)) {
            throw new InvalidTransactionStateException("Transaction " + originalRef + " has already been refunded");
        }

        User user = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with username: " + currentUsername));

        if (user.getRole() != Role.ADMIN) {
            throw new AccessDeniedException("Only an ADMIN can request a refund");
        }

        // Lock accounts in ascending ID order to prevent deadlock
        // Note: For refund, source is original destination (Merchant), destination is original source (User)
        Long firstId = Math.min(originalTx.getSourceAccountId(), originalTx.getDestAccountId());
        Long secondId = Math.max(originalTx.getSourceAccountId(), originalTx.getDestAccountId());

        Account firstLocked = accountRepository.findByIdForUpdate(firstId)
                .orElseThrow(() -> new ResourceNotFoundException("Account", firstId));
        Account secondLocked = accountRepository.findByIdForUpdate(secondId)
                .orElseThrow(() -> new ResourceNotFoundException("Account", secondId));

        // Original source account gets money back (dest of refund)
        Account lockedUser = firstLocked.getId().equals(originalTx.getSourceAccountId()) ? firstLocked : secondLocked;
        // Original dest account pays money back (source of refund)
        Account lockedMerchant = firstLocked.getId().equals(originalTx.getDestAccountId()) ? firstLocked : secondLocked;

        if (lockedMerchant.getBalance().compareTo(originalTx.getAmount()) < 0) {
            throw new InsufficientBalanceException("Insufficient balance in merchant account to perform refund: " + lockedMerchant.getAccountNumber());
        }

        // Update balances
        lockedMerchant.setBalance(lockedMerchant.getBalance().subtract(originalTx.getAmount()));
        lockedUser.setBalance(lockedUser.getBalance().add(originalTx.getAmount()));

        accountRepository.save(lockedMerchant);
        accountRepository.save(lockedUser);

        // Save refund Transaction
        Transaction refundTx = Transaction.builder()
                .transactionRef("TXN-REFUND-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase())
                .sourceAccountId(lockedMerchant.getId())
                .destAccountId(lockedUser.getId())
                .amount(originalTx.getAmount())
                .currency(originalTx.getCurrency())
                .type(TransactionType.REFUND)
                .status(TransactionStatus.COMPLETED)
                .merchantId(originalTx.getMerchantId())
                .description("Refund for: " + originalRef)
                .build();
        refundTx = transactionRepository.save(refundTx);

        // Save Ledger Entries
        LedgerEntry debitEntry = LedgerEntry.builder()
                .transactionId(refundTx.getId())
                .accountId(lockedMerchant.getId())
                .entryType(EntryType.DEBIT)
                .amount(originalTx.getAmount())
                .balanceAfter(lockedMerchant.getBalance())
                .build();

        LedgerEntry creditEntry = LedgerEntry.builder()
                .transactionId(refundTx.getId())
                .accountId(lockedUser.getId())
                .entryType(EntryType.CREDIT)
                .amount(originalTx.getAmount())
                .balanceAfter(lockedUser.getBalance())
                .build();

        ledgerEntryRepository.save(debitEntry);
        ledgerEntryRepository.save(creditEntry);

        // Evict balances from cache after commit
        final Long sourceIdToEvict = lockedMerchant.getId();
        final Long destIdToEvict = lockedUser.getId();
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

        // Publish refund completed event to RabbitMQ
        String merchantWebhookUrl = null;
        if (originalTx.getMerchantId() != null) {
            Merchant merchant = merchantRepository.findById(originalTx.getMerchantId()).orElse(null);
            if (merchant != null) {
                merchantWebhookUrl = merchant.getWebhookUrl();
            }
        }
        PaymentCompletedEvent event = new PaymentCompletedEvent(
                refundTx.getTransactionRef(),
                refundTx.getMerchantId(),
                merchantWebhookUrl,
                refundTx.getAmount(),
                refundTx.getStatus().name()
        );
        try {
            amqpTemplate.convertAndSend("payment.exchange", "payment.completed", event);
        } catch (Exception e) {
            log.warn("Could not publish Refund PaymentCompletedEvent to RabbitMQ: {}", e.getMessage());
        }

        return mapToResponse(refundTx);
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
