package com.training.paygate.messaging.consumer;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.training.paygate.entity.Merchant;
import com.training.paygate.entity.Transaction;
import com.training.paygate.entity.WebhookLog;
import com.training.paygate.enums.WebhookStatus;
import com.training.paygate.messaging.config.RabbitMQConfig;
import com.training.paygate.messaging.event.CheckoutCancelledEvent;
import com.training.paygate.messaging.event.PaymentCompletedEvent;
import com.training.paygate.repository.MerchantRepository;
import com.training.paygate.repository.TransactionRepository;
import com.training.paygate.repository.WebhookLogRepository;
import com.training.paygate.repository.CheckoutSessionRepository;
import com.training.paygate.entity.CheckoutSession;
import com.training.paygate.util.HmacUtils;
import com.training.paygate.util.SsrfValidator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitHandler;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@Component
@RabbitListener(queues = RabbitMQConfig.WEBHOOK_QUEUE)
@RequiredArgsConstructor
@Slf4j
public class WebhookConsumer {

    private final RestTemplate restTemplate;
    private final WebhookLogRepository webhookLogRepository;
    private final TransactionRepository transactionRepository;
    private final MerchantRepository merchantRepository;
    private final CheckoutSessionRepository checkoutSessionRepository;
    private final ObjectMapper objectMapper;
    private final SsrfValidator ssrfValidator;

    @RabbitHandler
    public void consumePaymentCompleted(PaymentCompletedEvent event) {
        log.info("Received PaymentCompletedEvent for webhook dispatching: {}", event.transactionRef());

        String targetUrl = resolveWebhookUrl(event.webhookUrl(), event.merchantId());
        if (targetUrl == null || targetUrl.isBlank()) {
            log.warn("Skipping webhook for transaction {}: No valid webhook URL found for merchant ID {}",
                    event.transactionRef(), event.merchantId());
            return;
        }

        Long transactionId = transactionRepository.findByTransactionRef(event.transactionRef())
                .map(Transaction::getId)
                .orElse(null);

        Long merchantId = event.merchantId() != null ? event.merchantId() : 0L;

        String orderId = null;
        String token = null;
        try {
            Optional<CheckoutSession> sessionOpt = checkoutSessionRepository.findByTransactionRef(event.transactionRef());
            if (sessionOpt.isPresent()) {
                orderId = sessionOpt.get().getOrderId();
                token = sessionOpt.get().getToken();
            }
        } catch (Exception e) {
            log.error("Failed to lookup checkout session for transactionRef {}: {}", event.transactionRef(), e.getMessage());
        }

        if (orderId == null || orderId.isBlank()) {
            log.warn("Skipping webhook for transaction {} — no orderId found in checkout session.", event.transactionRef());
            return;
        }

        String payloadJson;
        try {
            Map<String, Object> payloadMap = new HashMap<>();
            payloadMap.put("event", "PAYMENT_COMPLETED");
            payloadMap.put("transactionRef", event.transactionRef());
            payloadMap.put("merchantId", merchantId);
            payloadMap.put("amount", event.amount());
            payloadMap.put("status", event.status());
            payloadMap.put("orderId", orderId);
            payloadMap.put("token", token != null ? token : "");
            payloadJson = objectMapper.writeValueAsString(payloadMap);
        } catch (Exception e) {
            log.error("Failed to serialize webhook payload for transaction {}: {}", event.transactionRef(), e.getMessage());
            payloadJson = "{\"transactionRef\":\"" + event.transactionRef() + "\"}";
        }

        sendWebhook(targetUrl, payloadJson, merchantId, transactionId, event.transactionRef());
    }

    @RabbitHandler
    public void consumeCheckoutCancelled(CheckoutCancelledEvent event) {
        log.info("Received CheckoutCancelledEvent for webhook dispatching: token={}, orderId={}", event.token(), event.orderId());

        String targetUrl = resolveWebhookUrl(event.webhookUrl(), event.merchantId());
        if (targetUrl == null || targetUrl.isBlank()) {
            log.warn("Skipping cancel webhook for token {}: No valid webhook URL found for merchant ID {}",
                    event.token(), event.merchantId());
            return;
        }

        Long merchantId = event.merchantId() != null ? event.merchantId() : 0L;

        String payloadJson;
        try {
            Map<String, Object> payloadMap = new HashMap<>();
            payloadMap.put("event", "PAYMENT_CANCELLED");
            payloadMap.put("transactionRef", "CANCEL_" + event.token());
            payloadMap.put("merchantId", merchantId);
            payloadMap.put("amount", event.amount());
            payloadMap.put("status", "CANCELLED");
            payloadMap.put("orderId", event.orderId());
            payloadMap.put("token", event.token());
            payloadJson = objectMapper.writeValueAsString(payloadMap);
        } catch (Exception e) {
            log.error("Failed to serialize webhook payload for cancelled token {}: {}", event.token(), e.getMessage());
            return;
        }

        sendWebhook(targetUrl, payloadJson, merchantId, null, event.token());
    }

    private String resolveWebhookUrl(String providedUrl, Long merchantId) {
        if (providedUrl != null && !providedUrl.isBlank()) {
            return providedUrl;
        }
        if (merchantId != null && merchantId > 0) {
            return merchantRepository.findById(merchantId)
                    .map(Merchant::getWebhookUrl)
                    .orElse(null);
        }
        return null;
    }

    private void sendWebhook(String targetUrl, String payloadJson, Long merchantId, Long transactionId, String logRef) {
        Integer responseStatus = null;
        String responseBody = null;
        WebhookStatus webhookStatus;
        LocalDateTime nextRetryAt = null;

        try {
            log.info("Dispatching webhook POST request to {} for {}", targetUrl, logRef);
            
            if (!ssrfValidator.isSafeUrl(targetUrl)) {
                throw new SecurityException("SSRF blocked: URL resolves to internal or restricted network");
            }
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            
            if (merchantId != null && merchantId > 0) {
                Optional<Merchant> opt = merchantRepository.findById(merchantId);
                if (opt.isPresent()) {
                    String apiKey = opt.get().getApiKey();
                    if (apiKey != null && !apiKey.isBlank()) {
                    String signature = HmacUtils.generateSignature(payloadJson, apiKey);
                        headers.set("X-PayGate-Signature", signature);
                    }
                }
            }

            HttpEntity<String> entity = new HttpEntity<>(payloadJson, headers);
            ResponseEntity<String> response = restTemplate.postForEntity(targetUrl, entity, String.class);
            responseStatus = response.getStatusCode().value();
            responseBody = response.getBody();
            webhookStatus = WebhookStatus.SUCCESS;
            log.info("Webhook delivered successfully to {} for {}. Status: {}", targetUrl, logRef, responseStatus);
        } catch (HttpStatusCodeException ex) {
            responseStatus = ex.getStatusCode().value();
            responseBody = ex.getResponseBodyAsString();
            webhookStatus = WebhookStatus.RETRYING;
            nextRetryAt = LocalDateTime.now().plusMinutes(1);
            log.error("Webhook delivery failed with HTTP status {} to {} for {}. Scheduled retry at: {}", responseStatus, targetUrl, logRef, nextRetryAt);
        } catch (SecurityException ex) {
            responseStatus = 403;
            responseBody = ex.getMessage();
            webhookStatus = WebhookStatus.FAILED;
            log.error("Webhook blocked (SSRF) to {} for {}", targetUrl, logRef);
        } catch (Exception ex) {
            responseStatus = 500;
            responseBody = ex.getMessage();
            webhookStatus = WebhookStatus.RETRYING;
            nextRetryAt = LocalDateTime.now().plusMinutes(1);
            log.error("Webhook delivery failed to {} for {}. Scheduled retry at: {}", targetUrl, logRef, nextRetryAt);
        }

        WebhookLog webhookLog = WebhookLog.builder()
                .transactionId(transactionId)
                .merchantId(merchantId)
                .url(targetUrl)
                .payload(payloadJson)
                .responseStatus(responseStatus)
                .responseBody(responseBody)
                .attempt(1)
                .status(webhookStatus)
                .nextRetryAt(nextRetryAt)
                .build();

        webhookLogRepository.save(webhookLog);
        log.info("Saved WebhookLog entry with ID: {}, status: {}", webhookLog.getId(), webhookStatus);
    }
}
