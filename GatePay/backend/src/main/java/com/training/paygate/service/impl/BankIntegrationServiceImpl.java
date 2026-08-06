package com.training.paygate.service.impl;

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
import com.training.paygate.enums.TransactionStatus;
import com.training.paygate.enums.TransactionType;
import com.training.paygate.enums.WebhookStatus;
import com.training.paygate.exception.BadRequestException;
import com.training.paygate.exception.ResourceNotFoundException;
import com.training.paygate.repository.AccountRepository;
import com.training.paygate.repository.CheckoutSessionRepository;
import com.training.paygate.repository.LedgerEntryRepository;
import com.training.paygate.repository.MerchantRepository;
import com.training.paygate.repository.TransactionRepository;
import com.training.paygate.repository.WebhookLogRepository;
import com.training.paygate.service.BankIntegrationService;
import com.training.paygate.service.WebhookRetryService;
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
public class BankIntegrationServiceImpl implements BankIntegrationService {

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

    @Override
    @Transactional
    public TransactionResponse processBankWebhook(BankWebhookRequest request) {
        log.info("Processing Bank Webhook settlement for transferContent: {}, amount: {}", request.transferContent(), request.amount());

        if (request.transferContent() == null || request.transferContent().isBlank()) {
            throw new BadRequestException("Transfer content cannot be blank");
        }

        // 1. Extract orderId from transferContent
        String orderId = extractOrderId(request.transferContent());
        if (orderId == null || orderId.isBlank()) {
            throw new BadRequestException("Could not extract valid orderId from transfer content: " + request.transferContent());
        }

        // 2. Find pending CheckoutSession
        CheckoutSession session = checkoutSessionRepository.findAll().stream()
                .filter(s -> orderId.equalsIgnoreCase(s.getOrderId()))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("No checkout session found matching orderId: " + orderId));

        if ("COMPLETED".equalsIgnoreCase(session.getStatus())) {
            log.info("Bank Webhook duplicate: CheckoutSession for orderId {} is already COMPLETED", orderId);
            Transaction tx = transactionRepository.findByTransactionRef(session.getTransactionRef())
                    .orElse(null);
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

        // 3. Find System Account & Merchant Account
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

        Account merchantAccount = accountRepository.findByOwnerIdAndOwnerType(session.getMerchantId(), OwnerType.MERCHANT)
                .orElseThrow(() -> new ResourceNotFoundException("Merchant wallet account not found for merchantId: " + session.getMerchantId()));

        // Lock accounts to prevent race conditions
        Long firstLockId = Math.min(sysAccount.getId(), merchantAccount.getId());
        Long secondLockId = Math.max(sysAccount.getId(), merchantAccount.getId());

        Account firstLocked = accountRepository.findByIdForUpdate(firstLockId).orElse(null);
        Account secondLocked = accountRepository.findByIdForUpdate(secondLockId).orElse(null);

        if (firstLocked != null && merchantAccount.getId().equals(firstLocked.getId())) {
            merchantAccount = firstLocked;
        } else if (secondLocked != null && merchantAccount.getId().equals(secondLocked.getId())) {
            merchantAccount = secondLocked;
        }

        // 4. Update balances: Credit Merchant account
        merchantAccount.setBalance(merchantAccount.getBalance().add(amount).setScale(2, RoundingMode.HALF_UP));
        accountRepository.save(merchantAccount);
        balanceCacheService.evictBalance(merchantAccount.getId());

        // 5. Create Transaction record
        String txRef = "TXN_BANK_" + UUID.randomUUID().toString().replace("-", "").toUpperCase();
        Transaction tx = Transaction.builder()
                .transactionRef(txRef)
                .sourceAccountId(sysAccount.getId())
                .destAccountId(merchantAccount.getId())
                .merchantId(session.getMerchantId())
                .amount(amount)
                .type(TransactionType.PAYMENT)
                .status(TransactionStatus.COMPLETED)
                .description("VietQR Bank Settlement for Order #" + session.getOrderId())
                .build();

        tx = transactionRepository.save(tx);

        // 6. Record Ledger Entries (DEBIT System, CREDIT Merchant)
        LedgerEntry debitSys = LedgerEntry.builder()
                .transactionId(tx.getId())
                .accountId(sysAccount.getId())
                .entryType(EntryType.DEBIT)
                .amount(amount)
                .balanceAfter(sysAccount.getBalance())
                .build();

        LedgerEntry creditMerchant = LedgerEntry.builder()
                .transactionId(tx.getId())
                .accountId(merchantAccount.getId())
                .entryType(EntryType.CREDIT)
                .amount(amount)
                .balanceAfter(merchantAccount.getBalance())
                .build();

        ledgerEntryRepository.save(debitSys);
        ledgerEntryRepository.save(creditMerchant);

        // 7. Complete CheckoutSession
        session.setStatus("COMPLETED");
        session.setTransactionRef(txRef);
        checkoutSessionRepository.save(session);

        // 8. Dispatch Webhook to Merchant / Marketplace
        dispatchMerchantWebhook(session, txRef, amount);

        log.info("Bank Webhook settlement completed for orderId {}. Ref: {}", orderId, txRef);

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

    private void dispatchMerchantWebhook(CheckoutSession session, String txRef, BigDecimal amount) {
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
                    "paymentMethod", "VIETQR",
                    "paidAt", LocalDateTime.now().toString()
            );

            String jsonPayload = objectMapper.writeValueAsString(payloadMap);

            WebhookLog logRecord = WebhookLog.builder()
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
