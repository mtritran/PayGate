package com.training.paygate.service;

import com.training.paygate.entity.WebhookLog;
import com.training.paygate.enums.WebhookStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface WebhookLogService {
    Page<WebhookLog> getLogs(WebhookStatus status, Pageable pageable);
}
