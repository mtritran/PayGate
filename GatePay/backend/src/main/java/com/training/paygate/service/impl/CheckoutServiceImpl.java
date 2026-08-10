package com.training.paygate.service.impl;

import com.training.paygate.service.CheckoutService;
import com.training.paygate.service.OtpService;
import com.training.paygate.service.TransactionService;
import com.training.paygate.config.VietQrProperties;
import com.training.paygate.dto.request.CheckoutCreateRequest;
import com.training.paygate.dto.request.CheckoutProcessRequest;
import com.training.paygate.dto.request.PaymentRequest;
import com.training.paygate.dto.response.CheckoutCreateResponse;
import com.training.paygate.dto.response.CheckoutInfoResponse;
import com.training.paygate.dto.response.CheckoutProcessResponse;
import com.training.paygate.dto.response.TransactionResponse;
import com.training.paygate.entity.Account;
import com.training.paygate.entity.CheckoutSession;
import com.training.paygate.entity.Merchant;
import com.training.paygate.enums.MerchantStatus;
import com.training.paygate.enums.OwnerType;
import com.training.paygate.enums.PaymentMethod;
import com.training.paygate.exception.BadRequestException;
import com.training.paygate.exception.ResourceNotFoundException;
import com.training.paygate.mapper.CheckoutMapper;
import com.training.paygate.messaging.event.CheckoutCancelledEvent;
import com.training.paygate.messaging.publisher.PaymentEventPublisher;
import com.training.paygate.repository.AccountRepository;
import com.training.paygate.repository.CheckoutSessionRepository;
import com.training.paygate.repository.MerchantRepository;
import com.training.paygate.util.VietQrUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class CheckoutServiceImpl implements CheckoutService {

    private static final String STATUS_PENDING = "PENDING";
    private static final String STATUS_PROCESSING = "PROCESSING";
    private static final String STATUS_EXPIRED = "EXPIRED";
    private static final String STATUS_CANCELLED = "CANCELLED";

    private final MerchantRepository merchantRepository;
    private final CheckoutSessionRepository checkoutSessionRepository;
    private final AccountRepository accountRepository;
    private final TransactionService transactionService;
    private final OtpService otpService;
    private final VietQrProperties vietQrProperties;
    private final CheckoutMapper checkoutMapper;
    private final PaymentEventPublisher paymentEventPublisher;

    @Value("${app.frontend.base-url}")
    private String frontendBaseUrl;

    @Value("${app.checkout.session-ttl-minutes}")
    private int sessionTtlMinutes;

    @Transactional
    public CheckoutCreateResponse createCheckoutSession(CheckoutCreateRequest request) {
        return createCheckoutSession(request, request.apiKey());
    }

    @Transactional
    public CheckoutCreateResponse createCheckoutSession(CheckoutCreateRequest request, String merchantCode) {
        if (merchantCode == null || merchantCode.isBlank()) {
            // Fallback to apiKey if merchantCode is not provided by header
            Merchant m = merchantRepository.findByApiKey(request.apiKey()).orElse(null);
            if (m != null) merchantCode = m.getMerchantCode();
        }

        if (merchantCode == null || merchantCode.isBlank()) {
            throw new BadRequestException("Merchant Code is missing (Not authenticated by Filter)");
        }

        validateCheckoutAmounts(request);

        Merchant merchant = merchantRepository.findByMerchantCode(merchantCode)
                .orElseThrow(() -> new BadRequestException("Invalid Merchant Code"));

        if (!merchant.isActive() || merchant.getStatus() != MerchantStatus.ACTIVE) {
            throw new BadRequestException("Merchant account is inactive or not approved");
        }

        String token = "CHK_" + UUID.randomUUID().toString().replace("-", "").toUpperCase();
        LocalDateTime expiresAt = LocalDateTime.now().plusMinutes(sessionTtlMinutes);

        CheckoutSession session = checkoutMapper.toEntity(request, merchant, token, expiresAt);
        session.setMethod(request.method());
        session.setUpfrontAmount(request.upfrontAmount());
        session.setFinanceAmount(request.financeAmount());
        session.setMerchantCustomerRef(normalizeRef(request.merchantCustomerRef()));
        session.setCustomerName(request.customerName());
        
        checkoutSessionRepository.save(session);

        PaymentMethod paymentMethod = request.paymentMethod() != null ? request.paymentMethod() : PaymentMethod.PAYGATE;
        log.info("CheckoutSession created [token={}, orderId={}, method={}]", token, request.orderId(), paymentMethod);

        if (PaymentMethod.VIETQR == paymentMethod) {
            Account sysAccount = accountRepository.findByOwnerIdAndOwnerType(0L, OwnerType.SYSTEM)
                    .orElseThrow(() -> new ResourceNotFoundException("System escrow account not found"));

            String transferContent = "PAYGATE " + request.orderId();
            String accountNumber = sysAccount.getAccountNumber();
            String bankBin = vietQrProperties.getBankBin();
            String accountName = vietQrProperties.getAccountName();
            String bankCode = vietQrProperties.getBankCode();

            String vietQrUrl = VietQrUtil.generateVietQrUrl(
                    bankBin,
                    accountNumber,
                    request.amount(),
                    transferContent,
                    accountName);
            String qrCodePayload = VietQrUtil.generateEmvCoPayload(
                    bankBin,
                    accountNumber,
                    request.amount(),
                    transferContent,
                    accountName);

            return new CheckoutCreateResponse(
                    token,
                    PaymentMethod.VIETQR,
                    null,
                    vietQrUrl,
                    qrCodePayload,
                    transferContent,
                    bankCode,
                    accountNumber,
                    accountName,
                    expiresAt);
        }

        String paymentUrl = frontendBaseUrl + "/checkout?token=" + token;
        return new CheckoutCreateResponse(
                token,
                PaymentMethod.PAYGATE,
                paymentUrl,
                null, null, null, null, null, null,
                expiresAt);
    }

    private void validateCheckoutAmounts(CheckoutCreateRequest request) {
        String method = request.method();
        if (method == null || method.isBlank()) {
            return;
        }
        if (!"BNPL".equalsIgnoreCase(method)) {
            return;
        }
        if (request.merchantCustomerRef() == null || request.merchantCustomerRef().isBlank()) {
            throw new BadRequestException("merchantCustomerRef is required for BNPL checkout");
        }

        BigDecimal upfrontAmount = request.upfrontAmount() != null ? request.upfrontAmount() : BigDecimal.ZERO;
        BigDecimal financeAmount = request.financeAmount() != null ? request.financeAmount() : request.amount();
        if (financeAmount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BadRequestException("financeAmount must be greater than 0 for BNPL");
        }
        if (financeAmount.compareTo(request.amount()) > 0) {
            throw new BadRequestException("financeAmount cannot exceed amount");
        }
        if (upfrontAmount.add(financeAmount).compareTo(request.amount()) != 0) {
            throw new BadRequestException("upfrontAmount + financeAmount must equal amount");
        }
    }

    private String normalizeEmail(String email) {
        return email != null ? email.trim().toLowerCase() : null;
    }

    private String normalizeRef(String ref) {
        return ref != null ? ref.trim() : null;
    }

    @Transactional
    public CheckoutInfoResponse getCheckoutInfo(String token) {
        CheckoutSession session = checkoutSessionRepository.findByToken(token)
                .orElseThrow(() -> new ResourceNotFoundException("Checkout session not found or expired"));

        if (STATUS_PENDING.equals(session.getStatus()) && LocalDateTime.now().isAfter(session.getExpiresAt())) {
            session.setStatus(STATUS_EXPIRED);
            checkoutSessionRepository.save(session);
        }

        return checkoutMapper.toInfoResponse(session);
    }

    @Transactional(readOnly = true)
    public CheckoutInfoResponse getCheckoutInfoByTxnRef(String transactionRef) {
        CheckoutSession session = checkoutSessionRepository.findByTransactionRef(transactionRef)
                .orElseThrow(() -> new ResourceNotFoundException("Checkout session not found"));

        return checkoutMapper.toInfoResponse(session);
    }

    @Transactional
    public CheckoutProcessResponse processCheckout(String username, CheckoutProcessRequest request, String clientIp) {
        CheckoutSession session = checkoutSessionRepository.findByToken(request.token())
                .orElseThrow(() -> new ResourceNotFoundException("Checkout session not found"));

        if (!STATUS_PENDING.equals(session.getStatus())) {
            throw new BadRequestException(
                    "Checkout session is already " + session.getStatus().toLowerCase() + " or invalid");
        }

        if (LocalDateTime.now().isAfter(session.getExpiresAt())) {
            session.setStatus(STATUS_EXPIRED);
            checkoutSessionRepository.save(session);
            throw new BadRequestException("Checkout session has expired");
        }

        boolean otpValid = otpService.verifyOtp(username, "Order payment", request.otpCode());
        if (!otpValid) {
            throw new BadRequestException("Invalid or expired OTP code");
        }

        Account systemAccount = accountRepository
                .findByOwnerIdAndOwnerType(0L, OwnerType.SYSTEM)
                .orElseThrow(() -> new ResourceNotFoundException("System escrow wallet account not found"));

        // Idempotency key phải deterministic — gắn với session token (stable, unique per checkout)
        // Không được dùng UUID.randomUUID() vì mỗi lần gọi sẽ tạo key khác → double-charge
        PaymentRequest paymentRequest = new PaymentRequest(
                "CHK_IDEM_" + request.token(),
                systemAccount.getId(),
                session.getAmount(),
                "Payment for order #" + session.getOrderId() + " to " + session.getMerchantName(),
                session.getMerchantId(),
                null);

        TransactionResponse tx = transactionService.processPayment(paymentRequest, username, clientIp);

        session.setStatus(STATUS_PROCESSING);
        session.setTransactionRef(tx.transactionRef());
        checkoutSessionRepository.save(session);

        String redirectUrl = session.getReturnUrl() + (session.getReturnUrl().contains("?") ? "&" : "?")
                + "status=PROCESSING&orderId=" + session.getOrderId() + "&transactionRef=" + tx.transactionRef();

        log.info("CheckoutSession processed successfully [token={}, orderId={}, txRef={}]",
                session.getToken(), session.getOrderId(), tx.transactionRef());

        return new CheckoutProcessResponse(tx.transactionRef(), redirectUrl);
    }

    /**
     * Cancel a checkout session and notify the merchant via webhook.
     * Called when the customer clicks "Cancel" on the PayGate checkout page.
     */
    @Transactional
    public void cancelCheckout(String token) {
        CheckoutSession session = checkoutSessionRepository.findByToken(token)
                .orElseThrow(() -> new ResourceNotFoundException("Checkout session not found"));

        // Only cancel sessions that are still pending
        if (!STATUS_PENDING.equals(session.getStatus())) {
            log.info("Checkout {} is already {} — cancel is a no-op", token, session.getStatus());
            return;
        }

        session.setStatus(STATUS_CANCELLED);
        checkoutSessionRepository.save(session);
        log.info("Checkout session {} cancelled for order {}", token, session.getOrderId());

        // Build and publish cancel webhook AFTER DB commit to avoid the race condition where
        // WebhookConsumer receives the event before the session is visible in DB.
        String webhookUrl = null;
        if (session.getMerchantId() != null) {
            webhookUrl = merchantRepository.findById(session.getMerchantId())
                    .map(Merchant::getWebhookUrl).orElse(null);
        }

        final String finalWebhookUrl = webhookUrl;
        final CheckoutCancelledEvent cancelEvent = new CheckoutCancelledEvent(
                token,
                session.getOrderId(),
                session.getMerchantId(),
                finalWebhookUrl,
                session.getAmount());

        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                paymentEventPublisher.publishCheckoutCancelled(cancelEvent);
            }
        });
    }
}
