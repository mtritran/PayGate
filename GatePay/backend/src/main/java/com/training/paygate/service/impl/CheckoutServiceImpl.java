package com.training.paygate.service.impl;

import com.training.paygate.config.VietQrProperties;
import com.training.paygate.dto.request.CheckoutCreateRequest;
import com.training.paygate.dto.response.CheckoutCreateResponse;
import com.training.paygate.dto.response.CheckoutInfoResponse;
import com.training.paygate.entity.CheckoutSession;
import com.training.paygate.entity.Merchant;
import com.training.paygate.enums.MerchantStatus;
import com.training.paygate.exception.BadRequestException;
import com.training.paygate.exception.ResourceNotFoundException;
import com.training.paygate.repository.CheckoutSessionRepository;
import com.training.paygate.repository.MerchantRepository;
import com.training.paygate.service.CheckoutService;
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
public class CheckoutServiceImpl implements CheckoutService {

    private static final String PAYMENT_METHOD_VIETQR = "VIETQR";
    private static final String PAYMENT_METHOD_PAYGATE = "PAYGATE";
    private static final String STATUS_PENDING = "PENDING";
    private static final String STATUS_EXPIRED = "EXPIRED";

    private final MerchantRepository merchantRepository;
    private final CheckoutSessionRepository checkoutSessionRepository;
    private final VietQrProperties vietQrProperties;

    @Value("${app.frontend.base-url:http://localhost:4200}")
    private String frontendBaseUrl;

    @Value("${app.checkout.session-ttl-minutes:15}")
    private int sessionTtlMinutes;

    @Override
    @Transactional
    public CheckoutCreateResponse createCheckoutSession(CheckoutCreateRequest request) {
        Merchant merchant = validateMerchant(request.apiKey());

        String token = "CHK_" + UUID.randomUUID().toString().replace("-", "").toUpperCase();
        LocalDateTime expiresAt = LocalDateTime.now().plusMinutes(sessionTtlMinutes);

        String paymentMethod = resolvePaymentMethod(request.paymentMethod());
        String description = resolveDescription(request);

        CheckoutSession session = CheckoutSession.builder()
                .token(token)
                .merchantId(merchant.getId())
                .merchantCode(merchant.getMerchantCode())
                .merchantName(merchant.getMerchantName())
                .orderId(request.orderId())
                .amount(request.amount())
                .description(description)
                .returnUrl(request.returnUrl())
                .cancelUrl(request.cancelUrl())
                .status(STATUS_PENDING)
                .expiresAt(expiresAt)
                .build();

        checkoutSessionRepository.save(session);
        log.info("CheckoutSession created [token={}, orderId={}, method={}]", token, request.orderId(), paymentMethod);

        if (PAYMENT_METHOD_VIETQR.equals(paymentMethod)) {
            return buildVietQrResponse(token, request, expiresAt);
        }

        return buildPayGateResponse(token, expiresAt);
    }

    @Override
    @Transactional
    public CheckoutInfoResponse getCheckoutInfo(String token) {
        CheckoutSession session = checkoutSessionRepository.findByToken(token)
                .orElseThrow(() -> new ResourceNotFoundException("Phiên thanh toán không tồn tại hoặc đã hết hạn"));

        if (STATUS_PENDING.equals(session.getStatus()) && LocalDateTime.now().isAfter(session.getExpiresAt())) {
            session.setStatus(STATUS_EXPIRED);
            checkoutSessionRepository.save(session);
        }

        return toInfoResponse(session);
    }

    // ─── Private helpers ─────────────────────────────────────────────────────────

    private Merchant validateMerchant(String apiKey) {
        Merchant merchant = merchantRepository.findByApiKey(apiKey)
                .orElseThrow(() -> new BadRequestException("API Key của Merchant không hợp lệ"));

        if (!merchant.isActive() || merchant.getStatus() != MerchantStatus.ACTIVE) {
            throw new BadRequestException("Tài khoản Merchant hiện đang bị khóa hoặc chưa được phê duyệt");
        }

        return merchant;
    }

    private String resolvePaymentMethod(String rawMethod) {
        if (rawMethod != null && rawMethod.equalsIgnoreCase(PAYMENT_METHOD_VIETQR)) {
            return PAYMENT_METHOD_VIETQR;
        }
        return PAYMENT_METHOD_PAYGATE;
    }

    private String resolveDescription(CheckoutCreateRequest request) {
        return (request.description() != null && !request.description().isBlank())
                ? request.description()
                : "Thanh toán đơn hàng " + request.orderId();
    }

    private CheckoutCreateResponse buildVietQrResponse(String token, CheckoutCreateRequest request, LocalDateTime expiresAt) {
        String transferContent = "PAYGATE " + request.orderId();
        String vietQrUrl = VietQrUtil.generateVietQrUrl(
                vietQrProperties.getBankBin(),
                vietQrProperties.getAccountNumber(),
                request.amount(),
                transferContent,
                vietQrProperties.getAccountName()
        );
        String qrCodePayload = VietQrUtil.generateEmvCoPayload(
                vietQrProperties.getBankBin(),
                vietQrProperties.getAccountNumber(),
                request.amount(),
                transferContent,
                vietQrProperties.getAccountName()
        );

        return new CheckoutCreateResponse(
                token,
                PAYMENT_METHOD_VIETQR,
                null,            // paymentUrl (unused for VIETQR)
                vietQrUrl,
                qrCodePayload,
                transferContent,
                vietQrProperties.getBankCode(),
                vietQrProperties.getAccountNumber(),
                vietQrProperties.getAccountName(),
                expiresAt
        );
    }

    private CheckoutCreateResponse buildPayGateResponse(String token, LocalDateTime expiresAt) {
        String paymentUrl = frontendBaseUrl + "/checkout?token=" + token;
        return new CheckoutCreateResponse(
                token,
                PAYMENT_METHOD_PAYGATE,
                paymentUrl,
                null, null, null, null, null, null,
                expiresAt
        );
    }

    private CheckoutInfoResponse toInfoResponse(CheckoutSession session) {
        return new CheckoutInfoResponse(
                session.getToken(),
                session.getMerchantName(),
                session.getMerchantCode(),
                session.getOrderId(),
                session.getAmount(),
                session.getDescription(),
                session.getReturnUrl(),
                session.getCancelUrl(),
                session.getStatus(),
                session.getCreatedAt(),
                session.getExpiresAt()
        );
    }
}
