package com.training.paygate.service.impl;

import com.training.paygate.entity.WebhookLog;
import com.training.paygate.enums.WebhookStatus;
import com.training.paygate.repository.WebhookLogRepository;
import com.training.paygate.service.WebhookRetryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class WebhookRetryServiceImpl implements WebhookRetryService {

    private final WebhookLogRepository webhookLogRepository;
    private final RestTemplate restTemplate;

    @Override
    @Scheduled(fixedDelay = 30000)
    @Transactional
    public void processPendingRetries() {
        LocalDateTime now = LocalDateTime.now();
        List<WebhookStatus> retryStatuses = List.of(WebhookStatus.RETRYING, WebhookStatus.PENDING);

        List<WebhookLog> pendingLogs = webhookLogRepository
                .findByStatusInAndNextRetryAtLessThanEqualAndAttemptLessThan(retryStatuses, now, 5);

        if (pendingLogs.isEmpty()) {
            return;
        }

        log.info("Found {} webhook logs pending retry...", pendingLogs.size());

        for (WebhookLog webhookLog : pendingLogs) {
            retryWebhook(webhookLog);
        }
    }

    public void retryWebhook(WebhookLog webhookLog) {
        int currentAttempt = webhookLog.getAttempt() + 1;
        log.info("Retrying webhook ID {} (Attempt {} of 5) to URL: {}", webhookLog.getId(), currentAttempt, webhookLog.getUrl());

        Integer responseStatus = null;
        String responseBody = null;
        boolean isSuccess = false;

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<String> entity = new HttpEntity<>(webhookLog.getPayload(), headers);

            ResponseEntity<String> response = restTemplate.postForEntity(webhookLog.getUrl(), entity, String.class);
            responseStatus = response.getStatusCode().value();
            responseBody = response.getBody();
            isSuccess = true;
            log.info("Webhook ID {} retry succeeded with status: {}", webhookLog.getId(), responseStatus);
        } catch (HttpStatusCodeException ex) {
            responseStatus = ex.getStatusCode().value();
            responseBody = ex.getResponseBodyAsString();
            log.error("Webhook ID {} retry failed with HTTP status {}: {}", webhookLog.getId(), responseStatus, ex.getMessage());
        } catch (Exception ex) {
            responseStatus = 500;
            responseBody = ex.getMessage();
            log.error("Webhook ID {} retry failed with exception: {}", webhookLog.getId(), ex.getMessage());
        }

        webhookLog.setAttempt(currentAttempt);
        webhookLog.setResponseStatus(responseStatus);
        webhookLog.setResponseBody(responseBody);

        if (isSuccess) {
            webhookLog.setStatus(WebhookStatus.SUCCESS);
            webhookLog.setNextRetryAt(null);
        } else {
            if (currentAttempt >= 5) {
                webhookLog.setStatus(WebhookStatus.FAILED);
                webhookLog.setNextRetryAt(null);
                log.error("Webhook ID {} reached maximum retry attempts (5). Marked as FAILED.", webhookLog.getId());
            } else {
                webhookLog.setStatus(WebhookStatus.RETRYING);
                LocalDateTime nextRetry = calculateNextRetry(currentAttempt);
                webhookLog.setNextRetryAt(nextRetry);
                log.info("Webhook ID {} scheduled for next retry (Attempt {}) at {}", webhookLog.getId(), currentAttempt + 1, nextRetry);
            }
        }

        webhookLogRepository.save(webhookLog);
    }

    public LocalDateTime calculateNextRetry(int currentAttempt) {
        LocalDateTime now = LocalDateTime.now();
        return switch (currentAttempt) {
            case 1 -> now.plusMinutes(1);
            case 2 -> now.plusMinutes(5);
            case 3 -> now.plusMinutes(30);
            case 4 -> now.plusHours(2);
            default -> null;
        };
    }
}
