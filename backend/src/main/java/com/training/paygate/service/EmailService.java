package com.training.paygate.service;

import java.math.BigDecimal;

public interface EmailService {

    /**
     * Send email notification to user upon successful payment / money transfer.
     */
    void sendPaymentSuccessEmail(
            String recipientEmail,
            String senderUsername,
            String transactionRef,
            BigDecimal amount,
            String recipientAccountNo,
            String description
    );

    /**
     * Send email notification to user when Admin approves or rejects their Merchant application.
     */
    void sendMerchantApprovalEmail(
            String recipientEmail,
            String merchantName,
            String merchantCode,
            boolean isApproved
    );
}
