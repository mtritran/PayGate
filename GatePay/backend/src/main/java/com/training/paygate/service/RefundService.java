package com.training.paygate.service;

import com.training.paygate.cache.BalanceCacheService;
import com.training.paygate.dto.request.RefundCreateRequest;
import com.training.paygate.dto.response.RefundResponse;
import com.training.paygate.entity.Account;
import com.training.paygate.entity.LedgerEntry;
import com.training.paygate.entity.Merchant;
import com.training.paygate.entity.Refund;
import com.training.paygate.entity.Transaction;
import com.training.paygate.entity.User;
import com.training.paygate.enums.EntryType;
import com.training.paygate.enums.MerchantStatus;
import com.training.paygate.enums.OwnerType;
import com.training.paygate.enums.RefundStatus;
import com.training.paygate.enums.TransactionStatus;
import com.training.paygate.enums.TransactionType;
import com.training.paygate.exception.BadRequestException;
import com.training.paygate.exception.ResourceNotFoundException;
import com.training.paygate.messaging.event.PaymentCompletedEvent;
import com.training.paygate.messaging.publisher.PaymentEventPublisher;
import com.training.paygate.repository.AccountRepository;
import com.training.paygate.repository.LedgerEntryRepository;
import com.training.paygate.repository.MerchantRepository;
import com.training.paygate.repository.RefundRepository;
import com.training.paygate.repository.TransactionRepository;
import com.training.paygate.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.DigestUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class RefundService {

    private static final String SOURCE_TYPE_NORMAL = "NORMAL";
    private static final String SOURCE_TYPE_BNPL = "BNPL";
    private static final String DEFAULT_REFUND_REASON = "Merchant refund request";
    private static final String NOTIF_TITLE_REFUND = "Transaction Refund";
    private static final String NOTIF_TYPE_REFUND = "REFUND";

    private final RefundRepository refundRepository;
    private final TransactionRepository transactionRepository;
    private final AccountRepository accountRepository;
    private final UserRepository userRepository;
    private final MerchantRepository merchantRepository;
    private final LedgerEntryRepository ledgerEntryRepository;
    private final BalanceCacheService balanceCacheService;
    private final NotificationService notificationService;
    private final PaymentEventPublisher paymentEventPublisher;

    @Transactional
    public RefundResponse processRefund(RefundCreateRequest request) {
        log.info("Processing refund request for orderId: {}, transactionRef: {}", request.orderId(), request.transactionRef());

        // 1. Authenticate Merchant by API Key
        if (request.apiKey() == null || request.apiKey().isBlank()) {
            throw new BadRequestException("Merchant API Key must not be empty for refund processing");
        }

        Merchant merchant = merchantRepository.findByApiKey(request.apiKey())
                .orElseThrow(() -> new BadRequestException("Invalid Merchant API Key"));

        if (!merchant.isActive() || merchant.getStatus() != MerchantStatus.ACTIVE) {
            throw new BadRequestException("Merchant account is currently inactive or pending approval");
        }

        // 2. Validate Amount
        if (request.amount() == null || request.amount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BadRequestException("Refund amount must be a positive number greater than zero");
        }
        BigDecimal refundAmount = request.amount().setScale(2, RoundingMode.HALF_UP);

        // 3. Generate Idempotency Key (transactionRef + orderId + amount)
        String rawKey = request.transactionRef() + "_" + request.orderId() + "_" + refundAmount.toPlainString();
        String idempotencyKey = DigestUtils.md5DigestAsHex(rawKey.getBytes(StandardCharsets.UTF_8));

        // 4. Check Idempotency by generated key (Fast read before DB locks)
        Optional<Refund> existingRefundOpt = refundRepository.findByIdempotencyKey(idempotencyKey);
        if (existingRefundOpt.isPresent()) {
            Refund existing = existingRefundOpt.get();
            log.info("Idempotent refund request detected for orderId {}. Returning existing refundRef {}", request.orderId(), existing.getRefundRef());
            return mapToResponse(existing);
        }

        // 5. Validate and Lock Original Transaction (Prevents Concurrent Over-Refund Race Conditions)
        Transaction originalTx = transactionRepository.findByTransactionRefForUpdate(request.transactionRef())
                .orElseThrow(() -> new ResourceNotFoundException("Original transaction not found with ref: " + request.transactionRef()));

        if (originalTx.getStatus() != TransactionStatus.COMPLETED) {
            throw new BadRequestException("Original transaction status is " + originalTx.getStatus() + " and cannot be refunded");
        }

        Long merchantId = originalTx.getMerchantId();
        if (merchantId == null) {
            throw new BadRequestException("Original transaction is missing merchant reference and cannot be refunded");
        }

        // Validate Transaction Ownership against authenticated Merchant
        if (!merchantId.equals(merchant.getId())) {
            throw new BadRequestException("Original transaction does not belong to the authenticated Merchant");
        }

        // 6. Retrieve Customer Account from Transaction Source Account
        Account userAccount = accountRepository.findById(originalTx.getSourceAccountId())
                .orElseThrow(() -> new ResourceNotFoundException("Customer wallet account not found for transaction: " + request.transactionRef()));
        Long refundTargetUserId = userAccount.getOwnerId();

        // 7. Validate Cumulative Refund Amount (Prevent Concurrent / Partial Over-Refund)
        BigDecimal alreadyRefunded = refundRepository.sumRefundedAmountByOriginalTransactionRef(originalTx.getTransactionRef());
        BigDecimal totalRefundAttempt = alreadyRefunded.add(refundAmount);
        if (totalRefundAttempt.compareTo(originalTx.getAmount()) > 0) {
            throw new BadRequestException(String.format(
                    "Total refund amount (%,.0f VND) would exceed original transaction amount (%,.0f VND). Already refunded: %,.0f VND",
                    totalRefundAttempt, originalTx.getAmount(), alreadyRefunded));
        }

        // 8. Consistent Lock Ordering for Accounts (Prevents Deadlocks across concurrent operations)
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

        // 9. Check Insufficient Merchant Balance
        if (merchantAccount.getBalance().compareTo(refundAmount) < 0) {
            throw new BadRequestException(String.format(
                    "Merchant wallet balance (%,.0f VND) is insufficient to process refund of %,.0f VND",
                    merchantAccount.getBalance(), refundAmount));
        }

        // 10. Determine Source Type (NORMAL vs BNPL)
        String sourceType = SOURCE_TYPE_NORMAL;
        if (originalTx.getType() == TransactionType.LOAN_REPAYMENT
                || originalTx.getType() == TransactionType.LOAN_DISBURSEMENT
                || isBnplByDescription(originalTx.getDescription())) {
            sourceType = SOURCE_TYPE_BNPL;
        }

        // 11. Deduct from Merchant Wallet and Credit Customer Wallet
        merchantAccount.setBalance(merchantAccount.getBalance().subtract(refundAmount).setScale(2, RoundingMode.HALF_UP));
        userAccount.setBalance(userAccount.getBalance().add(refundAmount).setScale(2, RoundingMode.HALF_UP));

        accountRepository.save(merchantAccount);
        accountRepository.save(userAccount);

        balanceCacheService.evictBalance(merchantAccount.getId());
        balanceCacheService.evictBalance(userAccount.getId());

        // 12. Generate Refund Reference
        String refundRef = "RF-" + UUID.randomUUID().toString().replace("-", "").toUpperCase();

        // 13. Record Ledger Entries (DEBIT for Merchant, CREDIT for Customer)
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

        // 14. Save Refund Entity with Concurrent Idempotency Guard
        String finalSourceType = sourceType;
        final Account finalUserAccount = userAccount;

        Refund refund = saveRefundWithIdempotencyGuard(
                refundRef, idempotencyKey, request, originalTx, merchantId, refundTargetUserId, refundAmount, finalSourceType);

        // 15. Publish Event & Dispatch Notifications to Target Customer
        User customerUser = userRepository.findById(refundTargetUserId).orElse(null);
        String customerEmail = customerUser != null ? customerUser.getEmail() : null;
        String customerUsername = customerUser != null ? customerUser.getUsername() : "User_" + refundTargetUserId;

        try {
            paymentEventPublisher.publishPaymentCompleted(new PaymentCompletedEvent(
                    refundRef,
                    merchantId,
                    null,
                    refundAmount,
                    RefundStatus.COMPLETED.name(),
                    customerEmail,
                    customerUsername,
                    finalUserAccount.getAccountNumber(),
                    "Refund for order #" + request.orderId(),
                    TransactionType.REFUND,
                    refundTargetUserId
            ));
        } catch (Exception e) {
            log.warn("Could not publish Refund PaymentCompletedEvent to RabbitMQ: {}", e.getMessage());
        }

        try {
            String msg = String.format("Refund completed successfully +%,.0f VND for order #%s. Refund ref: %s.",
                    refundAmount, request.orderId(), refundRef);
            notificationService.createNotification(refundTargetUserId, NOTIF_TITLE_REFUND, msg, NOTIF_TYPE_REFUND);
        } catch (Exception e) {
            log.warn("Could not create notification for refund: {}", e.getMessage());
        }

        log.info("Refund {} processed successfully for orderId {}", refundRef, request.orderId());
        return mapToResponse(refund);
    }

    /**
     * Save Refund in an independent transaction (REQUIRES_NEW).
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public Refund saveRefundWithIdempotencyGuard(
            String refundRef,
            String idempotencyKey,
            RefundCreateRequest request,
            Transaction originalTx,
            Long merchantId,
            Long refundTargetUserId,
            BigDecimal refundAmount,
            String sourceType) {

        Refund refund = Refund.builder()
                .refundRef(refundRef)
                .orderId(request.orderId())
                .idempotencyKey(idempotencyKey)
                .originalTransactionRef(originalTx.getTransactionRef())
                .merchantId(merchantId)
                .userId(refundTargetUserId)
                .amount(refundAmount)
                .reason(DEFAULT_REFUND_REASON)
                .sourceType(sourceType)
                .status(RefundStatus.COMPLETED)
                .build();

        try {
            return refundRepository.save(refund);
        } catch (DataIntegrityViolationException e) {
            log.warn("Concurrent duplicate refund detected for idempotencyKey {}. Fetching existing record.", idempotencyKey);
            return refundRepository.findByIdempotencyKey(idempotencyKey)
                    .orElseThrow(() -> new BadRequestException("Duplicate refund request for orderId: " + request.orderId()));
        }
    }

    /**
     * Detect BNPL via description when TransactionType provides insufficient details.
     */
    private boolean isBnplByDescription(String description) {
        return description != null && description.toUpperCase().contains("BNPL");
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
