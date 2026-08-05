package com.training.paygate.dto.response;

import java.time.LocalDateTime;

public record CheckoutCreateResponse(
        String token,
        String paymentUrl,
        LocalDateTime expiresAt
) {}
