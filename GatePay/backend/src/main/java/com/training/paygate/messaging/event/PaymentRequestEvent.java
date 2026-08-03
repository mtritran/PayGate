package com.training.paygate.messaging.event;

import java.math.BigDecimal;

public record PaymentRequestEvent(
        String idempotencyKey,
        Long merchantId,
        BigDecimal amount,
        String orderInfo
) {}
