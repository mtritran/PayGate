package com.training.paygate.messaging.event;

import java.math.BigDecimal;

public record PaymentCompletedEvent(
        String transactionRef,
        Long merchantId,
        String webhookUrl,
        BigDecimal amount,
        String status
) {}
