package com.training.paygate.dto.response;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record CheckoutInfoResponse(
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
) {}
