package com.training.paygate.messaging.event;

import java.math.BigDecimal;

public record CheckoutCancelledEvent(
        String token,
        String orderId,
        Long merchantId,
        String webhookUrl,
        BigDecimal amount
) {}
