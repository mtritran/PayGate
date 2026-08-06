package com.training.paygate.service;

import com.training.paygate.entity.WebhookLog;

public interface WebhookRetryService {
    void processPendingRetries();
    void retryWebhook(WebhookLog webhookLog);
}
