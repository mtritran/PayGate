package com.training.paygate.dto.response;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Unified response for both PAYGATE and VIETQR checkout session creation.
 */
public record CheckoutCreateResponse(
        String token,
        String paymentMethod,     // "PAYGATE" or "VIETQR"

        // -- PAYGATE fields (only populated when paymentMethod = "PAYGATE") --
        String paymentUrl,

        // -- VIETQR fields (only populated when paymentMethod = "VIETQR") --
        String vietQrUrl,
        String qrCodePayload,
        String transferContent,
        String bankCode,
        String accountNumber,
        String accountName,

        LocalDateTime expiresAt
) {}
