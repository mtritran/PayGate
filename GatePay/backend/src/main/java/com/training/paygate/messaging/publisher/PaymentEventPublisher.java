package com.training.paygate.messaging.publisher;

import com.training.paygate.messaging.config.RabbitMQConfig;
import com.training.paygate.messaging.event.PaymentCompletedEvent;
import com.training.paygate.messaging.event.PaymentRequestEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class PaymentEventPublisher {

    private final RabbitTemplate rabbitTemplate;

    public void publishPaymentCompleted(PaymentCompletedEvent event) {
        log.info("Publishing PaymentCompletedEvent for transactionRef: {}", event.transactionRef());
        rabbitTemplate.convertAndSend(
                RabbitMQConfig.PAYMENT_EXCHANGE,
                RabbitMQConfig.ROUTING_PAYMENT_COMPLETED,
                event
        );
    }

    public void publishPaymentRequest(PaymentRequestEvent event) {
        log.info("Publishing PaymentRequestEvent for idempotencyKey: {}", event.idempotencyKey());
        rabbitTemplate.convertAndSend(
                RabbitMQConfig.PAYMENT_EXCHANGE,
                RabbitMQConfig.ROUTING_PAYMENT_REQUEST,
                event
        );
    }
}
