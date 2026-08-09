package com.training.providermock.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;

@RestController
@RequestMapping("/provider-api/v1/bank")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Bank Simulation (Provider Mock)", description = "APIs giả lập Ngân hàng đối tác thực hiện chuyển khoản thành công qua VietQR")
public class BankSimulateController {

    private static final String PAYGATE_BANK_WEBHOOK_URL = "http://localhost:8081/api/v1/integration/bank-webhook";
    private final RestTemplate restTemplate = new RestTemplate();

    public record BankSimulateRequest(String orderId, BigDecimal amount) {}

    @PostMapping("/simulate-transfer")
    @Operation(summary = "Giả lập Ngân hàng chuyển khoản thành công và gửi Webhook sang PayGate Backend")
    public ResponseEntity<Map<String, Object>> simulateTransfer(@RequestBody BankSimulateRequest request) {
        String transferContent = "PAYGATE " + (request.orderId() != null ? request.orderId() : "ORD-100234");
        BigDecimal amount = (request.amount() != null) ? request.amount() : new BigDecimal("500000.00");

        Map<String, Object> bankWebhookPayload = Map.of(
                "bankCode", "MB",
                "bankTransactionNo", "FT" + System.currentTimeMillis(),
                "accountNumber", "099988887777",
                "amount", amount,
                "transferContent", transferContent,
                "transactionTime", LocalDateTime.now().toString()
        );

        log.info("[BANK MOCK] Simulating transfer for orderId: {}, amount: {} VND to PayGate Backend", request.orderId(), amount);

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(bankWebhookPayload, headers);

            ResponseEntity<String> response = restTemplate.postForEntity(PAYGATE_BANK_WEBHOOK_URL, entity, String.class);
            
            return ResponseEntity.ok(Map.of(
                    "status", "SUCCESS",
                    "message", "Đã gửi Webhook ngân hàng thành công tới PayGate Backend",
                    "paygateResponseStatus", response.getStatusCode().value(),
                    "payloadSent", bankWebhookPayload
            ));
        } catch (Exception e) {
            log.error("[BANK MOCK] Error sending bank webhook to PayGate: {}", e.getMessage());
            return ResponseEntity.internalServerError().body(Map.of(
                    "status", "FAILED",
                    "message", "Không thể gửi Webhook tới PayGate Backend: " + e.getMessage(),
                    "payloadSent", bankWebhookPayload
            ));
        }
    }
}
