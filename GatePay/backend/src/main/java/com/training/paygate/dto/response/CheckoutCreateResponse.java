package com.training.paygate.dto.response;

import com.training.paygate.enums.PaymentMethod;

import java.time.LocalDateTime;

public record CheckoutCreateResponse(
        String token,
        PaymentMethod paymentMethod,
        String paymentUrl,
        String vietQrUrl,
        String qrCodePayload,
        String transferContent,
        String bankCode,
        String accountNumber,
        String accountName,
        LocalDateTime expiresAt
) {}
