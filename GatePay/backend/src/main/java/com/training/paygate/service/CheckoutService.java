package com.training.paygate.service;

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
import com.training.paygate.repository.AccountRepository;
import com.training.paygate.repository.CheckoutSessionRepository;
import com.training.paygate.repository.MerchantRepository;
import com.training.paygate.util.VietQrUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class CheckoutService {

    private static final String STATUS_PENDING = "PENDING";
    private static final String STATUS_PROCESSING = "PROCESSING";
    private static final String STATUS_EXPIRED = "EXPIRED";

    private final MerchantRepository merchantRepository;
    private final CheckoutSessionRepository checkoutSessionRepository;
    private final AccountRepository accountRepository;
    private final TransactionService transactionService;
    private final OtpService otpService;
    private final VietQrProperties vietQrProperties;
    private final CheckoutMapper checkoutMapper;

    @Value("${app.frontend.base-url}")
    private String frontendBaseUrl;

    @Value("${app.checkout.session-ttl-minutes}")
    private int sessionTtlMinutes;

    @Transactional
    public CheckoutCreateResponse createCheckoutSession(CheckoutCreateRequest request) {
        Merchant merchant = merchantRepository.findByApiKey(request.apiKey())
                .orElseThrow(() -> new BadRequestException("Invalid merchant API key"));

        if (!merchant.isActive() || merchant.getStatus() != MerchantStatus.ACTIVE) {
            throw new BadRequestException("Merchant account is inactive or not approved");
        }

        String token = "CHK_" + UUID.randomUUID().toString().replace("-", "").toUpperCase();
        LocalDateTime expiresAt = LocalDateTime.now().plusMinutes(sessionTtlMinutes);

        CheckoutSession session = checkoutMapper.toEntity(request, merchant, token, expiresAt);
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

        boolean otpValid = otpService.verifyOtp(username, "Checkout payment OTP verification", request.otpCode());
        if (!otpValid) {
            throw new BadRequestException("Invalid or expired OTP code");
        }

        Account systemAccount = accountRepository
                .findByOwnerIdAndOwnerType(0L, OwnerType.SYSTEM)
                .orElseThrow(() -> new ResourceNotFoundException("System escrow wallet account not found"));

        PaymentRequest paymentRequest = new PaymentRequest(
                "CHK_IDEM_" + UUID.randomUUID().toString(),
                systemAccount.getId(),
                session.getAmount(),
                "Payment for order #" + session.getOrderId() + " to " + session.getMerchantName(),
                session.getMerchantId());

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
}
