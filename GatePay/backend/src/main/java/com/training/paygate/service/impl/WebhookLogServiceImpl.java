package com.training.paygate.service.impl;

import com.training.paygate.entity.WebhookLog;
import com.training.paygate.enums.WebhookStatus;
import com.training.paygate.repository.WebhookLogRepository;
import com.training.paygate.service.WebhookLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class WebhookLogServiceImpl implements WebhookLogService {

    private final WebhookLogRepository webhookLogRepository;

    @Override
    public Page<WebhookLog> getLogs(WebhookStatus status, Pageable pageable) {
        if (status != null) {
            return webhookLogRepository.findByStatus(status, pageable);
        }
        return webhookLogRepository.findAll(pageable);
    }
}
