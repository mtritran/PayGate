package com.training.paygate.messaging.event;

import java.math.BigDecimal;

public record PaymentCompletedEvent(
        String transactionRef,
        Long merchantId,
        String webhookUrl,
        BigDecimal amount,
        String status,
        String userEmail,
        String senderUsername,
        String recipientAccountNo,
        String description
) {
    public PaymentCompletedEvent(
            String transactionRef,
            Long merchantId,
            String webhookUrl,
            BigDecimal amount,
            String status
    ) {
        this(transactionRef, merchantId, webhookUrl, amount, status, null, null, null, null);
    }
}
