package com.training.paygate.messaging.consumer;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.training.paygate.entity.Merchant;
import com.training.paygate.entity.Transaction;
import com.training.paygate.entity.WebhookLog;
import com.training.paygate.enums.WebhookStatus;
import com.training.paygate.messaging.config.RabbitMQConfig;
import com.training.paygate.messaging.event.PaymentCompletedEvent;
import com.training.paygate.repository.MerchantRepository;
import com.training.paygate.repository.TransactionRepository;
import com.training.paygate.repository.WebhookLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@Component
@RequiredArgsConstructor
@Slf4j
public class WebhookConsumer {

    private final RestTemplate restTemplate;
    private final WebhookLogRepository webhookLogRepository;
    private final TransactionRepository transactionRepository;
    private final MerchantRepository merchantRepository;
    private final ObjectMapper objectMapper;

    @RabbitListener(queues = RabbitMQConfig.WEBHOOK_QUEUE)
    public void consumePaymentCompleted(PaymentCompletedEvent event) {
        log.info("Received PaymentCompletedEvent for webhook dispatching: {}", event.transactionRef());

        // 1. Determine target URL
        String targetUrl = event.webhookUrl();
        if (targetUrl == null || targetUrl.isBlank()) {
            if (event.merchantId() != null) {
                Optional<Merchant> merchantOpt = merchantRepository.findById(event.merchantId());
                if (merchantOpt.isPresent()) {
                    targetUrl = merchantOpt.get().getWebhookUrl();
                }
            }
        }

        if (targetUrl == null || targetUrl.isBlank()) {
            log.warn("Skipping webhook for transaction {}: No valid webhook URL found for merchant ID {}",
                    event.transactionRef(), event.merchantId());
            return;
        }

        // 2. Lookup Transaction ID
        Long transactionId = transactionRepository.findByTransactionRef(event.transactionRef())
                .map(Transaction::getId)
                .orElse(0L);

        Long merchantId = event.merchantId() != null ? event.merchantId() : 0L;

        // 3. Build Webhook Payload JSON
        String payloadJson;
        try {
            Map<String, Object> payloadMap = new HashMap<>();
            payloadMap.put("event", "PAYMENT_COMPLETED");
            payloadMap.put("transactionRef", event.transactionRef());
            payloadMap.put("merchantId", event.merchantId());
            payloadMap.put("amount", event.amount());
            payloadMap.put("status", event.status());
            payloadJson = objectMapper.writeValueAsString(payloadMap);
        } catch (Exception e) {
            log.error("Failed to serialize webhook payload for transaction {}: {}", event.transactionRef(), e.getMessage());
            payloadJson = "{\"transactionRef\":\"" + event.transactionRef() + "\"}";
        }

        // 4. Send HTTP POST request
        Integer responseStatus = null;
        String responseBody = null;
        WebhookStatus webhookStatus;

        try {
            log.info("Dispatching webhook POST request to {} for transaction {}", targetUrl, event.transactionRef());
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<String> entity = new HttpEntity<>(payloadJson, headers);

            ResponseEntity<String> response = restTemplate.postForEntity(targetUrl, entity, String.class);
            responseStatus = response.getStatusCode().value();
            responseBody = response.getBody();
            webhookStatus = WebhookStatus.SUCCESS;
            log.info("Webhook delivered successfully to {} for transaction {}. Status: {}", targetUrl, event.transactionRef(), responseStatus);
        } catch (HttpStatusCodeException ex) {
            responseStatus = ex.getStatusCode().value();
            responseBody = ex.getResponseBodyAsString();
            webhookStatus = WebhookStatus.FAILED;
            log.error("Webhook delivery failed with HTTP status {} to {} for transaction {}: {}", responseStatus, targetUrl, event.transactionRef(), ex.getMessage());
        } catch (Exception ex) {
            responseStatus = 500;
            responseBody = ex.getMessage();
            webhookStatus = WebhookStatus.FAILED;
            log.error("Webhook delivery failed to {} for transaction {}: {}", targetUrl, event.transactionRef(), ex.getMessage());
        }

        // 5. Log execution result
        WebhookLog webhookLog = WebhookLog.builder()
                .transactionId(transactionId)
                .merchantId(merchantId)
                .url(targetUrl)
                .payload(payloadJson)
                .responseStatus(responseStatus)
                .responseBody(responseBody)
                .attempt(1)
                .status(webhookStatus)
                .build();

        webhookLogRepository.save(webhookLog);
        log.info("Saved WebhookLog entry with ID: {}, status: {}", webhookLog.getId(), webhookStatus);
    }
}
