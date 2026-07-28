package com.training.paygate.service;

import com.training.paygate.messaging.event.PaymentCompletedEvent;

public interface LoyaltyService {
    void handlePaymentCompleted(PaymentCompletedEvent event);
}
