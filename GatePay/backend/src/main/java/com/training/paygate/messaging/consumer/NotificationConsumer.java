package com.training.paygate.messaging.consumer;

import com.training.paygate.messaging.config.RabbitMQConfig;
import com.training.paygate.messaging.event.PaymentCompletedEvent;
import com.training.paygate.service.EmailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class NotificationConsumer {

    private final EmailService emailService;

    @RabbitListener(queues = RabbitMQConfig.NOTIFICATION_QUEUE)
    public void handlePaymentCompletedNotification(PaymentCompletedEvent event) {
        log.info("[RABBITMQ CONSUMER] Received PaymentCompletedEvent from queue '{}' for transaction: {}",
                RabbitMQConfig.NOTIFICATION_QUEUE, event.transactionRef());

        if (event.userEmail() != null && !event.userEmail().isBlank()) {
            emailService.sendPaymentSuccessEmail(
                    event.userEmail(),
                    event.senderUsername() != null ? event.senderUsername() : "User",
                    event.transactionRef(),
                    event.amount(),
                    event.recipientAccountNo() != null ? event.recipientAccountNo() : "N/A",
                    event.description() != null ? event.description() : "Direct Transfer"
            );
            log.info("[RABBITMQ CONSUMER SUCCESS] Email notification queued & dispatched via RabbitMQ for {}", event.userEmail());
        } else {
            log.info("[RABBITMQ CONSUMER NOTICE] PaymentCompletedEvent processed for transaction {}, no user email attached.", event.transactionRef());
        }
    }
}
