package com.training.paygate.messaging.consumer;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.training.paygate.entity.Merchant;
import com.training.paygate.entity.Transaction;
import com.training.paygate.entity.WebhookLog;
import com.training.paygate.enums.WebhookStatus;
import com.training.paygate.messaging.event.PaymentCompletedEvent;
import com.training.paygate.repository.MerchantRepository;
import com.training.paygate.repository.TransactionRepository;
import com.training.paygate.repository.WebhookLogRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WebhookConsumerTest {

    @Mock
    private RestTemplate restTemplate;

    @Mock
    private WebhookLogRepository webhookLogRepository;

    @Mock
    private TransactionRepository transactionRepository;

    @Mock
    private MerchantRepository merchantRepository;

    @Spy
    private ObjectMapper objectMapper = new ObjectMapper();

    @InjectMocks
    private WebhookConsumer webhookConsumer;

    private PaymentCompletedEvent testEvent;

    @BeforeEach
    void setUp() {
        testEvent = new PaymentCompletedEvent(
                "TXN-12345",
                1L,
                "https://merchant.com/webhook",
                new BigDecimal("50000.00"),
                "COMPLETED"
        );
    }

    @Test
    void consumePaymentCompleted_successResponse_savesSuccessLog() {
        // Given
        Transaction tx = Transaction.builder().id(10L).transactionRef("TXN-12345").build();
        when(transactionRepository.findByTransactionRef("TXN-12345")).thenReturn(Optional.of(tx));
        when(restTemplate.postForEntity(eq("https://merchant.com/webhook"), any(HttpEntity.class), eq(String.class)))
                .thenReturn(new ResponseEntity<>("{\"status\":\"ok\"}", HttpStatus.OK));

        // When
        webhookConsumer.consumePaymentCompleted(testEvent);

        // Then
        ArgumentCaptor<WebhookLog> logCaptor = ArgumentCaptor.forClass(WebhookLog.class);
        verify(webhookLogRepository).save(logCaptor.capture());

        WebhookLog savedLog = logCaptor.getValue();
        assertThat(savedLog.getStatus()).isEqualTo(WebhookStatus.SUCCESS);
        assertThat(savedLog.getResponseStatus()).isEqualTo(200);
        assertThat(savedLog.getTransactionId()).isEqualTo(10L);
        assertThat(savedLog.getMerchantId()).isEqualTo(1L);
        assertThat(savedLog.getUrl()).isEqualTo("https://merchant.com/webhook");
    }

    @Test
    void consumePaymentCompleted_httpError_savesFailedLog() {
        // Given
        Transaction tx = Transaction.builder().id(10L).transactionRef("TXN-12345").build();
        when(transactionRepository.findByTransactionRef("TXN-12345")).thenReturn(Optional.of(tx));
        when(restTemplate.postForEntity(eq("https://merchant.com/webhook"), any(HttpEntity.class), eq(String.class)))
                .thenThrow(new HttpClientErrorException(HttpStatus.BAD_REQUEST, "Bad Request"));

        // When
        webhookConsumer.consumePaymentCompleted(testEvent);

        // Then
        ArgumentCaptor<WebhookLog> logCaptor = ArgumentCaptor.forClass(WebhookLog.class);
        verify(webhookLogRepository).save(logCaptor.capture());

        WebhookLog savedLog = logCaptor.getValue();
        assertThat(savedLog.getStatus()).isEqualTo(WebhookStatus.RETRYING);
        assertThat(savedLog.getNextRetryAt()).isNotNull();
        assertThat(savedLog.getResponseStatus()).isEqualTo(400);
    }

    @Test
    void consumePaymentCompleted_missingUrl_skipsDispatching() {
        // Given
        PaymentCompletedEvent noUrlEvent = new PaymentCompletedEvent(
                "TXN-12345",
                99L,
                null,
                new BigDecimal("50000.00"),
                "COMPLETED"
        );
        when(merchantRepository.findById(99L)).thenReturn(Optional.empty());

        // When
        webhookConsumer.consumePaymentCompleted(noUrlEvent);

        // Then
        verify(restTemplate, never()).postForEntity(any(), any(), any());
        verify(webhookLogRepository, never()).save(any());
    }
}
