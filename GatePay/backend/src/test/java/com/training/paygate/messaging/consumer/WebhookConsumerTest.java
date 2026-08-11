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
import com.training.paygate.util.HmacUtils;
import com.training.paygate.util.SsrfValidator;
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
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.training.paygate.repository.CheckoutSessionRepository;
import com.training.paygate.entity.CheckoutSession;

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

    @Mock
    private CheckoutSessionRepository checkoutSessionRepository;

    @Mock
    private SsrfValidator ssrfValidator;

    @Spy
    private ObjectMapper objectMapper = new ObjectMapper();

    @InjectMocks
    private WebhookConsumer webhookConsumer;

    private PaymentCompletedEvent testEvent;

    @BeforeEach
    void setUp() {
        lenient().when(ssrfValidator.isSafeUrl(any(String.class))).thenReturn(true);
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
        Transaction tx = Transaction.builder().id(10L).transactionRef("TXN-12345").build();
        CheckoutSession session = CheckoutSession.builder().orderId("ORD-99").token("CHK_TOK_1").build();
        Merchant merchant = Merchant.builder().apiKey("merchant-webhook-secret").build();
        merchant.setId(1L);
        when(transactionRepository.findByTransactionRef("TXN-12345")).thenReturn(Optional.of(tx));
        when(checkoutSessionRepository.findByTransactionRef("TXN-12345")).thenReturn(Optional.of(session));
        when(merchantRepository.findById(1L)).thenReturn(Optional.of(merchant));
        when(restTemplate.postForEntity(eq("https://merchant.com/webhook"), any(HttpEntity.class), eq(String.class)))
                .thenReturn(new ResponseEntity<>("{\"status\":\"ok\"}", HttpStatus.OK));

        webhookConsumer.consumePaymentCompleted(testEvent);

        ArgumentCaptor<WebhookLog> logCaptor = ArgumentCaptor.forClass(WebhookLog.class);
        verify(webhookLogRepository).save(logCaptor.capture());

        WebhookLog savedLog = logCaptor.getValue();
        assertThat(savedLog.getStatus()).isEqualTo(WebhookStatus.SUCCESS);
        assertThat(savedLog.getResponseStatus()).isEqualTo(200);
        assertThat(savedLog.getTransactionId()).isEqualTo(10L);
        assertThat(savedLog.getMerchantId()).isEqualTo(1L);
        assertThat(savedLog.getUrl()).isEqualTo("https://merchant.com/webhook");

        assertThat(savedLog.getPayload()).contains("event");
        assertThat(savedLog.getPayload()).contains("transactionRef");
        assertThat(savedLog.getPayload()).contains("merchantId");
        assertThat(savedLog.getPayload()).contains("amount");
        assertThat(savedLog.getPayload()).contains("status");
        assertThat(savedLog.getPayload()).contains("orderId");
        assertThat(savedLog.getPayload()).contains("token");

        ArgumentCaptor<HttpEntity<String>> requestCaptor = ArgumentCaptor.forClass(HttpEntity.class);
        verify(restTemplate).postForEntity(
                eq("https://merchant.com/webhook"), requestCaptor.capture(), eq(String.class));
        HttpEntity<String> webhookRequest = requestCaptor.getValue();
        assertThat(webhookRequest.getHeaders().getFirst("X-PayGate-Signature"))
                .isEqualTo(HmacUtils.generateSignature(webhookRequest.getBody(), "merchant-webhook-secret"));
    }

    @Test
    void consumePaymentCompleted_httpError_savesFailedLog() {
        Transaction tx = Transaction.builder().id(10L).transactionRef("TXN-12345").build();
        CheckoutSession session = CheckoutSession.builder().orderId("ORD-99").token("CHK_TOK_1").build();
        when(transactionRepository.findByTransactionRef("TXN-12345")).thenReturn(Optional.of(tx));
        when(checkoutSessionRepository.findByTransactionRef("TXN-12345")).thenReturn(Optional.of(session));
        when(restTemplate.postForEntity(eq("https://merchant.com/webhook"), any(HttpEntity.class), eq(String.class)))
                .thenThrow(new HttpClientErrorException(HttpStatus.BAD_REQUEST, "Bad Request"));

        webhookConsumer.consumePaymentCompleted(testEvent);

        ArgumentCaptor<WebhookLog> logCaptor = ArgumentCaptor.forClass(WebhookLog.class);
        verify(webhookLogRepository).save(logCaptor.capture());

        WebhookLog savedLog = logCaptor.getValue();
        assertThat(savedLog.getStatus()).isEqualTo(WebhookStatus.RETRYING);
        assertThat(savedLog.getNextRetryAt()).isNotNull();
        assertThat(savedLog.getResponseStatus()).isEqualTo(400);
    }

    @Test
    void consumePaymentCompleted_missingUrl_skipsDispatching() {
        PaymentCompletedEvent noUrlEvent = new PaymentCompletedEvent(
                "TXN-12345",
                99L,
                null,
                new BigDecimal("50000.00"),
                "COMPLETED"
        );
        when(merchantRepository.findById(99L)).thenReturn(Optional.empty());

        webhookConsumer.consumePaymentCompleted(noUrlEvent);

        verify(restTemplate, never()).postForEntity(any(), any(), any());
        verify(webhookLogRepository, never()).save(any());
    }
}
