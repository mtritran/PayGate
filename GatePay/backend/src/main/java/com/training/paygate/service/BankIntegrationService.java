package com.training.paygate.service;

import com.training.paygate.dto.request.BankWebhookRequest;
import com.training.paygate.dto.response.TransactionResponse;

public interface BankIntegrationService {
    TransactionResponse processBankWebhook(BankWebhookRequest request);
}
