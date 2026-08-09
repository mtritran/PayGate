package com.training.paygate.dto.response;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record CheckoutInfoResponse(
        String token,
        String merchantName,
        String merchantCode,
        String orderId,
        BigDecimal amount,
        String method,
        BigDecimal upfrontAmount,
        BigDecimal financeAmount,
        String merchantCustomerRef,
        String customerName,
        String description,
        String returnUrl,
        String cancelUrl,
        String status,
        LocalDateTime createdAt,
        LocalDateTime expiresAt
) {
    public CheckoutInfoResponse(
            String token,
            String merchantName,
            String merchantCode,
            String orderId,
            BigDecimal amount,
            String description,
            String returnUrl,
            String cancelUrl,
            String status,
            LocalDateTime createdAt,
            LocalDateTime expiresAt
    ) {
        this(token, merchantName, merchantCode, orderId, amount, null, null, null,
                null, null, description, returnUrl, cancelUrl, status, createdAt, expiresAt);
    }
}
