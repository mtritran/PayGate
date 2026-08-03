package com.training.paygate.service;

import com.training.paygate.messaging.event.PaymentCompletedEvent;

import java.math.BigDecimal;

public interface LoyaltyService {
    void handlePaymentCompleted(PaymentCompletedEvent event);

    void earnPoints(Long userId, BigDecimal amount, String transactionRef);
}
