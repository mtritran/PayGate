package com.training.paygate.messaging.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    public static final String PAYMENT_EXCHANGE = "payment.exchange";
    public static final String VALIDATE_QUEUE = "payment.validate.queue";
    public static final String SETTLEMENT_QUEUE = "settlement.queue";
    public static final String WEBHOOK_QUEUE = "webhook.queue";
    public static final String NOTIFICATION_QUEUE = "notification.queue";

    public static final String ROUTING_PAYMENT_REQUEST = "payment.request";
    public static final String ROUTING_PAYMENT_COMPLETED = "payment.completed";
    public static final String ROUTING_PAYMENT_WILDCARD = "payment.#";

    @Bean
    public TopicExchange paymentExchange() {
        return new TopicExchange(PAYMENT_EXCHANGE);
    }

    @Bean
    public Queue validateQueue() {
        return new Queue(VALIDATE_QUEUE, true);
    }

    @Bean
    public Queue settlementQueue() {
        return new Queue(SETTLEMENT_QUEUE, true);
    }

    @Bean
    public Queue webhookQueue() {
        return new Queue(WEBHOOK_QUEUE, true);
    }

    @Bean
    public Queue notificationQueue() {
        return new Queue(NOTIFICATION_QUEUE, true);
    }

    @Bean
    public Binding validateBinding(Queue validateQueue, TopicExchange paymentExchange) {
        return BindingBuilder.bind(validateQueue).to(paymentExchange).with(ROUTING_PAYMENT_REQUEST);
    }

    @Bean
    public Binding settlementBinding(Queue settlementQueue, TopicExchange paymentExchange) {
        return BindingBuilder.bind(settlementQueue).to(paymentExchange).with(ROUTING_PAYMENT_COMPLETED);
    }

    @Bean
    public Binding webhookBinding(Queue webhookQueue, TopicExchange paymentExchange) {
        return BindingBuilder.bind(webhookQueue).to(paymentExchange).with(ROUTING_PAYMENT_COMPLETED);
    }

    @Bean
    public Binding notificationBinding(Queue notificationQueue, TopicExchange paymentExchange) {
        return BindingBuilder.bind(notificationQueue).to(paymentExchange).with(ROUTING_PAYMENT_WILDCARD);
    }

    @Bean
    public Jackson2JsonMessageConverter messageConverter(ObjectMapper objectMapper) {
        return new Jackson2JsonMessageConverter(objectMapper);
    }
}
