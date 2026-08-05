package com.training.paygate.service;

import com.training.paygate.cache.BalanceCacheService;
import com.training.paygate.dto.request.RefundCreateRequest;
import com.training.paygate.dto.response.RefundResponse;
import com.training.paygate.entity.Account;
import com.training.paygate.entity.LedgerEntry;
import com.training.paygate.entity.Refund;
import com.training.paygate.entity.Transaction;
import com.training.paygate.entity.User;
import com.training.paygate.enums.EntryType;
import com.training.paygate.enums.OwnerType;
import com.training.paygate.enums.Role;
import com.training.paygate.enums.TransactionStatus;
import com.training.paygate.enums.TransactionType;
import com.training.paygate.exception.BadRequestException;
import com.training.paygate.exception.ResourceNotFoundException;
import com.training.paygate.messaging.event.PaymentCompletedEvent;
import com.training.paygate.messaging.publisher.PaymentEventPublisher;
import com.training.paygate.repository.AccountRepository;
import com.training.paygate.repository.LedgerEntryRepository;
import com.training.paygate.repository.RefundRepository;
import com.training.paygate.repository.TransactionRepository;
import com.training.paygate.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class RefundService {

    private static final String SOURCE_TYPE_NORMAL = "NORMAL";
    private static final String SOURCE_TYPE_BNPL = "BNPL";
    private static final String REFUND_STATUS_COMPLETED = "COMPLETED";
    private static final String DEFAULT_REFUND_REASON = "Customer refund request";
    private static final String NOTIF_TITLE_REFUND = "Transaction Refund";
    private static final String NOTIF_TYPE_REFUND = "REFUND";
    private static final int DEFAULT_BNPL_CANCELLED_COUNT = 3;

    private final RefundRepository refundRepository;
    private final TransactionRepository transactionRepository;
    private final AccountRepository accountRepository;
    private final UserRepository userRepository;
    private final LedgerEntryRepository ledgerEntryRepository;
    private final BalanceCacheService balanceCacheService;
    private final NotificationService notificationService;
    private final PaymentEventPublisher paymentEventPublisher;

    @Transactional
    public RefundResponse processRefund(RefundCreateRequest request, String currentUsername) {
        log.info("Processing refund request for orderId: {}, transactionRef: {}", request.orderId(), request.transactionRef());

        // 1. Check Authentication Context
        if (currentUsername == null || currentUsername.isBlank()) {
            throw new BadRequestException("Username cannot be empty for refund processing");
        }

        User user = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new ResourceNotFoundException("Authenticated user not found with username: " + currentUsername));

        if (!user.isActive()) {
            throw new BadRequestException("User account is currently inactive");
        }

        // 2. Validate Amount
        if (request.amount() == null || request.amount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BadRequestException("Refund amount must be a positive number greater than zero");
        }
        BigDecimal refundAmount = request.amount().setScale(2, RoundingMode.HALF_UP);

        // 3. Check Idempotency by orderId (Fast read before DB locks)
        Optional<Refund> existingRefundOpt = refundRepository.findByOrderId(request.orderId());
        if (existingRefundOpt.isPresent()) {
            Refund existing = existingRefundOpt.get();
            log.info("Idempotent refund request detected for orderId {}. Returning existing refundRef {}", request.orderId(), existing.getRefundRef());
            return mapToResponse(existing);
        }

        // 4. Validate and Lock Original Transaction (Prevents Concurrent Over-Refund Race Conditions)
        Transaction originalTx = transactionRepository.findByTransactionRefForUpdate(request.transactionRef())
                .orElseThrow(() -> new ResourceNotFoundException("Original transaction not found with ref: " + request.transactionRef()));

        if (originalTx.getStatus() != TransactionStatus.COMPLETED) {
            throw new BadRequestException("Original transaction status is " + originalTx.getStatus() + " and cannot be refunded");
        }

        Long merchantId = originalTx.getMerchantId();
        if (merchantId == null) {
            throw new BadRequestException("Original transaction is missing merchant reference and cannot be refunded");
        }

        // 5. Validate Transaction Ownership (IDOR Prevention)
        Account userAccount = accountRepository.findByOwnerIdAndOwnerType(user.getId(), OwnerType.USER)
                .orElseThrow(() -> new ResourceNotFoundException("Customer wallet account not found for user: " + currentUsername));

        if (user.getRole() != Role.ADMIN && !originalTx.getSourceAccountId().equals(userAccount.getId())) {
            throw new BadRequestException("Original transaction does not belong to the authenticated user");
        }

        // 6. Validate Cumulative Refund Amount (Prevent Concurrent / Partial Over-Refund)
        BigDecimal alreadyRefunded = refundRepository.sumRefundedAmountByOriginalTransactionRef(originalTx.getTransactionRef());
        BigDecimal totalRefundAttempt = alreadyRefunded.add(refundAmount);
        if (totalRefundAttempt.compareTo(originalTx.getAmount()) > 0) {
            throw new BadRequestException(String.format(
                    "Total refund amount (%,.0f VND) would exceed original transaction amount (%,.0f VND). Already refunded: %,.0f VND",
                    totalRefundAttempt, originalTx.getAmount(), alreadyRefunded));
        }

        // 7. Consistent Lock Ordering for Accounts (Prevents Deadlocks across concurrent operations)
        Account merchantAccount = accountRepository.findByOwnerIdAndOwnerType(merchantId, OwnerType.MERCHANT)
                .orElseThrow(() -> new ResourceNotFoundException("Merchant wallet account not found for merchantId: " + merchantId));

        Long firstLockId = Math.min(merchantAccount.getId(), userAccount.getId());
        Long secondLockId = Math.max(merchantAccount.getId(), userAccount.getId());

        Account firstLocked = accountRepository.findByIdForUpdate(firstLockId)
                .orElseThrow(() -> new ResourceNotFoundException("Account not found for locking id: " + firstLockId));
        Account secondLocked = accountRepository.findByIdForUpdate(secondLockId)
                .orElseThrow(() -> new ResourceNotFoundException("Account not found for locking id: " + secondLockId));

        if (merchantAccount.getId().equals(firstLocked.getId())) {
            merchantAccount = firstLocked;
            userAccount = secondLocked;
        } else {
            merchantAccount = secondLocked;
            userAccount = firstLocked;
        }

        // 8. Check Insufficient Merchant Balance
        if (merchantAccount.getBalance().compareTo(refundAmount) < 0) {
            throw new BadRequestException(String.format(
                    "Merchant wallet balance (%,.0f VND) is insufficient to process refund of %,.0f VND",
                    merchantAccount.getBalance(), refundAmount));
        }

        // 9. Determine Transaction Type (NORMAL vs BNPL)
        String sourceType = SOURCE_TYPE_NORMAL;
        int installmentsCancelled = 0;

        if (originalTx.getType() == TransactionType.LOAN_REPAYMENT ||
                (originalTx.getDescription() != null && originalTx.getDescription().toUpperCase().contains("BNPL"))) {
            sourceType = SOURCE_TYPE_BNPL;
            installmentsCancelled = DEFAULT_BNPL_CANCELLED_COUNT;
        }

        // 10. Deduct from Merchant Wallet and Credit Customer Wallet
        merchantAccount.setBalance(merchantAccount.getBalance().subtract(refundAmount).setScale(2, RoundingMode.HALF_UP));
        userAccount.setBalance(userAccount.getBalance().add(refundAmount).setScale(2, RoundingMode.HALF_UP));

        accountRepository.save(merchantAccount);
        accountRepository.save(userAccount);

        balanceCacheService.evictBalance(merchantAccount.getId());
        balanceCacheService.evictBalance(userAccount.getId());

        // 11. Record Ledger Entries (DEBIT for Merchant, CREDIT for Customer)
        LedgerEntry debitMerchant = LedgerEntry.builder()
                .transactionId(originalTx.getId())
                .accountId(merchantAccount.getId())
                .entryType(EntryType.DEBIT)
                .amount(refundAmount)
                .balanceAfter(merchantAccount.getBalance())
                .build();

        LedgerEntry creditCustomer = LedgerEntry.builder()
                .transactionId(originalTx.getId())
                .accountId(userAccount.getId())
                .entryType(EntryType.CREDIT)
                .amount(refundAmount)
                .balanceAfter(userAccount.getBalance())
                .build();

        ledgerEntryRepository.save(debitMerchant);
        ledgerEntryRepository.save(creditCustomer);

        // 12. Save Refund Entity with Concurrent Idempotency Guard (Catch Unique Constraint Violation)
        String refundRef = "RF-" + UUID.randomUUID().toString().replace("-", "").toUpperCase();
        Refund refund = Refund.builder()
                .refundRef(refundRef)
                .orderId(request.orderId())
                .originalTransactionRef(originalTx.getTransactionRef())
                .merchantId(merchantId)
                .userId(user.getId())
                .amount(refundAmount)
                .reason(request.reason() != null && !request.reason().isBlank() ? request.reason() : DEFAULT_REFUND_REASON)
                .sourceType(sourceType)
                .installmentsCancelled(installmentsCancelled)
                .status(REFUND_STATUS_COMPLETED)
                .build();

        try {
            refund = refundRepository.save(refund);
        } catch (DataIntegrityViolationException e) {
            log.warn("Concurrent duplicate refund detected for orderId {}. Fetching existing record.", request.orderId());
            Refund existing = refundRepository.findByOrderId(request.orderId())
                    .orElseThrow(() -> new BadRequestException("Duplicate refund request for orderId: " + request.orderId()));
            return mapToResponse(existing);
        }

        // 13. Publish Event & Dispatch Notifications
        try {
            paymentEventPublisher.publishPaymentCompleted(new PaymentCompletedEvent(
                    refundRef,
                    merchantId,
                    null,
                    refundAmount,
                    REFUND_STATUS_COMPLETED,
                    user.getEmail(),
                    user.getUsername(),
                    userAccount.getAccountNumber(),
                    "Refund for order #" + request.orderId(),
                    TransactionType.REFUND,
                    user.getId()
            ));
        } catch (Exception e) {
            log.warn("Could not publish Refund PaymentCompletedEvent to RabbitMQ: {}", e.getMessage());
        }

        try {
            String msg = String.format("Refund completed successfully +%,.0f VND for order #%s. Refund ref: %s.",
                    refundAmount, request.orderId(), refundRef);
            notificationService.createNotification(user.getId(), NOTIF_TITLE_REFUND, msg, NOTIF_TYPE_REFUND);
        } catch (Exception e) {
            log.warn("Could not create notification for refund: {}", e.getMessage());
        }

        log.info("Refund {} processed successfully for orderId {}", refundRef, request.orderId());
        return mapToResponse(refund);
    }

    private RefundResponse mapToResponse(Refund refund) {
        return new RefundResponse(
                refund.getRefundRef(),
                refund.getOriginalTransactionRef(),
                refund.getAmount(),
                refund.getSourceType(),
                refund.getInstallmentsCancelled() != null ? refund.getInstallmentsCancelled() : 0,
                refund.getStatus()
        );
    }
}
