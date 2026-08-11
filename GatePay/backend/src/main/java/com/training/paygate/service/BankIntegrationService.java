package com.training.paygate.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.training.paygate.cache.BalanceCacheService;
import com.training.paygate.dto.request.BankWebhookRequest;
import com.training.paygate.dto.response.TransactionResponse;
import com.training.paygate.entity.Account;
import com.training.paygate.entity.CheckoutSession;
import com.training.paygate.entity.LedgerEntry;
import com.training.paygate.entity.Merchant;
import com.training.paygate.entity.Transaction;
import com.training.paygate.entity.WebhookLog;
import com.training.paygate.enums.AccountStatus;
import com.training.paygate.enums.EntryType;
import com.training.paygate.enums.OwnerType;
import com.training.paygate.enums.PaymentMethod;
import com.training.paygate.enums.TransactionStatus;
import com.training.paygate.enums.TransactionType;
import com.training.paygate.enums.WebhookStatus;
import com.training.paygate.exception.AmountMismatchException;
import com.training.paygate.exception.BadRequestException;
import com.training.paygate.exception.ResourceNotFoundException;
import com.training.paygate.repository.AccountRepository;
import com.training.paygate.repository.CheckoutSessionRepository;
import com.training.paygate.repository.LedgerEntryRepository;
import com.training.paygate.repository.MerchantRepository;
import com.training.paygate.repository.TransactionRepository;
import com.training.paygate.repository.WebhookLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j
public class BankIntegrationService {

    private static final Pattern ORDER_ID_PATTERN = Pattern.compile("PAYGATE[\\s_]+([A-Za-z0-9_-]+)", Pattern.CASE_INSENSITIVE);

    private final CheckoutSessionRepository checkoutSessionRepository;
    private final MerchantRepository merchantRepository;
    private final AccountRepository accountRepository;
    private final TransactionRepository transactionRepository;
    private final LedgerEntryRepository ledgerEntryRepository;
    private final WebhookLogRepository webhookLogRepository;
    private final BalanceCacheService balanceCacheService;
    private final WebhookRetryService webhookRetryService;
    private final ObjectMapper objectMapper;

    @Transactional
    public TransactionResponse processBankWebhook(BankWebhookRequest request) {
        log.info("Processing Bank Webhook settlement [transferContent={}, amount={}]", request.transferContent(), request.amount());

        if (request.transferContent() == null || request.transferContent().isBlank()) {
            throw new BadRequestException("Transfer content cannot be blank");
        }

        String orderId = extractOrderId(request.transferContent());
        if (orderId == null || orderId.isBlank()) {
            throw new BadRequestException("Could not extract valid orderId from transfer content: " + request.transferContent());
        }

        String altOrderId = orderId.startsWith("ORD-") ? orderId.substring(4) : "ORD-" + orderId;
        CheckoutSession session = checkoutSessionRepository
                .findFirstByOrderIdAndStatusOrderByCreatedAtDesc(orderId, "PENDING")
                .or(() -> checkoutSessionRepository.findFirstByOrderIdAndStatusOrderByCreatedAtDesc(altOrderId, "PENDING"))
                .or(() -> checkoutSessionRepository.findFirstByOrderIdOrderByCreatedAtDesc(orderId))
                .or(() -> checkoutSessionRepository.findFirstByOrderIdOrderByCreatedAtDesc(altOrderId))
                .orElseThrow(() -> new ResourceNotFoundException("No checkout session found matching orderId: " + orderId));

        if ("COMPLETED".equalsIgnoreCase(session.getStatus())) {
            log.info("Bank Webhook duplicate: CheckoutSession for orderId {} is already COMPLETED", orderId);
            Transaction tx = transactionRepository.findByTransactionRef(session.getTransactionRef()).orElse(null);
            if (tx != null) {
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

        BigDecimal amount = request.amount().setScale(2, RoundingMode.HALF_UP);
        BigDecimal expectedAmount = session.getAmount().setScale(2, RoundingMode.HALF_UP);

        if (amount.compareTo(expectedAmount) != 0) {
            log.error("Amount mismatch for orderId {}: expected {}, got {}", orderId, expectedAmount, amount);
            throw new AmountMismatchException("Amount mismatch: expected " + expectedAmount + ", got " + amount);
        }

        Account sysAccount = accountRepository.findByOwnerIdAndOwnerType(0L, OwnerType.SYSTEM)
                .orElseGet(() -> {
                    Account newSys = Account.builder()
                            .ownerId(0L)
                            .ownerType(OwnerType.SYSTEM)
                            .accountNumber("SYS0000000000000001")
                            .balance(new BigDecimal("99000000000.00"))
                            .currency("VND")
                            .status(AccountStatus.ACTIVE)
                            .build();
                    return accountRepository.save(newSys);
                });

        Account lockedSysAccount = accountRepository.findByIdForUpdate(sysAccount.getId())
                .orElse(sysAccount);

        // Inflow from bank: credit SYSTEM Escrow account.
        // Merchant will receive net amount after 30-day hold via MerchantSettlementService cron job.
        lockedSysAccount.setBalance(lockedSysAccount.getBalance().add(amount).setScale(2, RoundingMode.HALF_UP));
        accountRepository.save(lockedSysAccount);
        balanceCacheService.evictBalance(lockedSysAccount.getId());

        String txRef = "TXN_BANK_" + UUID.randomUUID().toString().replace("-", "").toUpperCase();
        Transaction tx = Transaction.builder()
                .transactionRef(txRef)
                .sourceAccountId(lockedSysAccount.getId())
                .destAccountId(lockedSysAccount.getId())
                .merchantId(session.getMerchantId())
                .amount(amount)
                .type(TransactionType.PAYMENT)
                .status(TransactionStatus.COMPLETED)
                .description("VietQR Bank Settlement for Order #" + session.getOrderId())
                .build();

        tx = transactionRepository.save(tx);

        // Single CREDIT entry for SYSTEM Escrow — the matching DEBIT entry will be
        // created by MerchantSettlementService when the 30-day hold expires.
        LedgerEntry creditSys = LedgerEntry.builder()
                .transactionId(tx.getId())
                .accountId(lockedSysAccount.getId())
                .entryType(EntryType.CREDIT)
                .amount(amount)
                .balanceAfter(lockedSysAccount.getBalance())
                .build();

        ledgerEntryRepository.save(creditSys);

        session.setStatus("COMPLETED");
        session.setTransactionRef(txRef);
        checkoutSessionRepository.save(session);

        dispatchMerchantWebhook(session, txRef, amount, tx.getId());

        log.info("Bank Webhook settlement completed [orderId={}, txRef={}]", orderId, txRef);

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

    private String extractOrderId(String content) {
        if (content == null) return null;
        Matcher matcher = ORDER_ID_PATTERN.matcher(content);
        if (matcher.find()) {
            return matcher.group(1).trim();
        }
        return content.trim();
    }

    private void dispatchMerchantWebhook(CheckoutSession session, String txRef, BigDecimal amount, Long transactionId) {
        try {
            Merchant merchant = merchantRepository.findById(session.getMerchantId()).orElse(null);
            if (merchant == null || merchant.getWebhookUrl() == null || merchant.getWebhookUrl().isBlank()) {
                log.info("No webhookUrl configured for merchant {}. Skipping webhook notification.", session.getMerchantId());
                return;
            }

            Map<String, Object> payloadMap = Map.of(
                    "event", "PAYMENT_COMPLETED",
                    "orderId", session.getOrderId(),
                    "transactionRef", txRef,
                    "status", "COMPLETED",
                    "amount", amount,
                    "paymentMethod", PaymentMethod.VIETQR.name(),
                    "paidAt", LocalDateTime.now().toString()
            );

            String jsonPayload = objectMapper.writeValueAsString(payloadMap);

            WebhookLog logRecord = WebhookLog.builder()
                    .transactionId(transactionId)
                    .merchantId(merchant.getId())
                    .url(merchant.getWebhookUrl())
                    .payload(jsonPayload)
                    .status(WebhookStatus.PENDING)
                    .attempt(0)
                    .build();

            logRecord = webhookLogRepository.save(logRecord);
            webhookRetryService.retryWebhook(logRecord);
        } catch (Exception e) {
            log.warn("Error dispatching merchant webhook for session {}: {}", session.getOrderId(), e.getMessage());
        }
    }
}
