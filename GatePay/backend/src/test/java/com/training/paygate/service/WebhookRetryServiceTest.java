package com.training.paygate.service;

import com.training.paygate.entity.WebhookLog;
import com.training.paygate.enums.WebhookStatus;
import com.training.paygate.repository.WebhookLogRepository;
import com.training.paygate.service.impl.WebhookRetryServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WebhookRetryServiceTest {

    @Mock
    private WebhookLogRepository webhookLogRepository;

    @Mock
    private RestTemplate restTemplate;

    @InjectMocks
    private WebhookRetryServiceImpl webhookRetryService;

    private WebhookLog sampleLog;

    @BeforeEach
    void setUp() {
        sampleLog = WebhookLog.builder()
                .id(100L)
                .transactionId(1L)
                .merchantId(2L)
                .url("https://merchant.example.com/webhook")
                .payload("{\"event\":\"PAYMENT_COMPLETED\"}")
                .attempt(1)
                .status(WebhookStatus.RETRYING)
                .nextRetryAt(LocalDateTime.now().minusMinutes(1))
                .build();
    }

    @Test
    void retryWebhook_successResponse_updatesToSuccess() {
        // Given
        when(restTemplate.postForEntity(eq("https://merchant.example.com/webhook"), any(HttpEntity.class), eq(String.class)))
                .thenReturn(new ResponseEntity<>("{\"status\":\"ok\"}", HttpStatus.OK));

        // When
        webhookRetryService.retryWebhook(sampleLog);

        // Then
        ArgumentCaptor<WebhookLog> logCaptor = ArgumentCaptor.forClass(WebhookLog.class);
        verify(webhookLogRepository).save(logCaptor.capture());

        WebhookLog savedLog = logCaptor.getValue();
        assertThat(savedLog.getStatus()).isEqualTo(WebhookStatus.SUCCESS);
        assertThat(savedLog.getAttempt()).isEqualTo(2);
        assertThat(savedLog.getNextRetryAt()).isNull();
        assertThat(savedLog.getResponseStatus()).isEqualTo(200);
    }

    @Test
    void retryWebhook_attempt2Failed_updatesToRetryingWithNextRetryAt() {
        // Given
        when(restTemplate.postForEntity(eq("https://merchant.example.com/webhook"), any(HttpEntity.class), eq(String.class)))
                .thenThrow(new HttpClientErrorException(HttpStatus.INTERNAL_SERVER_ERROR, "Server Error"));

        // When
        webhookRetryService.retryWebhook(sampleLog);

        // Then
        ArgumentCaptor<WebhookLog> logCaptor = ArgumentCaptor.forClass(WebhookLog.class);
        verify(webhookLogRepository).save(logCaptor.capture());

        WebhookLog savedLog = logCaptor.getValue();
        assertThat(savedLog.getStatus()).isEqualTo(WebhookStatus.RETRYING);
        assertThat(savedLog.getAttempt()).isEqualTo(2);
        assertThat(savedLog.getNextRetryAt()).isNotNull();
        assertThat(savedLog.getResponseStatus()).isEqualTo(500);
    }

    @Test
    void retryWebhook_attempt4Failed_reachesMaxAttempts_updatesToFailed() {
        // Given
        sampleLog.setAttempt(4); // Attempt 4 failing means 5th attempt total
        when(restTemplate.postForEntity(eq("https://merchant.example.com/webhook"), any(HttpEntity.class), eq(String.class)))
                .thenThrow(new HttpClientErrorException(HttpStatus.BAD_REQUEST, "Bad Request"));

        // When
        webhookRetryService.retryWebhook(sampleLog);

        // Then
        ArgumentCaptor<WebhookLog> logCaptor = ArgumentCaptor.forClass(WebhookLog.class);
        verify(webhookLogRepository).save(logCaptor.capture());

        WebhookLog savedLog = logCaptor.getValue();
        assertThat(savedLog.getStatus()).isEqualTo(WebhookStatus.FAILED);
        assertThat(savedLog.getAttempt()).isEqualTo(5);
        assertThat(savedLog.getNextRetryAt()).isNull();
        assertThat(savedLog.getResponseStatus()).isEqualTo(400);
    }

    @Test
    void processPendingRetries_findsPendingLogs_executesRetry() {
        // Given
        when(webhookLogRepository.findByStatusInAndNextRetryAtLessThanEqualAndAttemptLessThan(any(), any(), eq(5)))
                .thenReturn(List.of(sampleLog));
        when(restTemplate.postForEntity(eq("https://merchant.example.com/webhook"), any(HttpEntity.class), eq(String.class)))
                .thenReturn(new ResponseEntity<>("OK", HttpStatus.OK));

        // When
        webhookRetryService.processPendingRetries();

        // Then
        verify(webhookLogRepository).save(any(WebhookLog.class));
    }
}
