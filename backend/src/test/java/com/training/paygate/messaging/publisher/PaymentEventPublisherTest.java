package com.training.paygate.messaging.publisher;

import com.training.paygate.messaging.config.RabbitMQConfig;
import com.training.paygate.messaging.event.PaymentCompletedEvent;
import com.training.paygate.messaging.event.PaymentRequestEvent;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.amqp.rabbit.core.RabbitTemplate;

import java.math.BigDecimal;

import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class PaymentEventPublisherTest {

    @Mock
    private RabbitTemplate rabbitTemplate;

    @InjectMocks
    private PaymentEventPublisher paymentEventPublisher;

    @Test
    void publishPaymentCompleted_callsRabbitTemplate() {
        // Given
        var event = new PaymentCompletedEvent("TX123", 1L, "https://webhook.com", BigDecimal.TEN, "SUCCESS");

        // When
        paymentEventPublisher.publishPaymentCompleted(event);

        // Then
        verify(rabbitTemplate).convertAndSend(
                RabbitMQConfig.PAYMENT_EXCHANGE,
                RabbitMQConfig.ROUTING_PAYMENT_COMPLETED,
                event
        );
    }

    @Test
    void publishPaymentRequest_callsRabbitTemplate() {
        // Given
        var event = new PaymentRequestEvent("IDEM123", 1L, BigDecimal.TEN, "Order Info");

        // When
        paymentEventPublisher.publishPaymentRequest(event);

        // Then
        verify(rabbitTemplate).convertAndSend(
                RabbitMQConfig.PAYMENT_EXCHANGE,
                RabbitMQConfig.ROUTING_PAYMENT_REQUEST,
                event
        );
    }
}
