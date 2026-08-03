package com.training.paygate.service.impl;

import com.training.paygate.entity.PointTransaction;
import com.training.paygate.entity.User;
import com.training.paygate.enums.PointTransactionType;
import com.training.paygate.enums.TransactionType;
import com.training.paygate.messaging.event.PaymentCompletedEvent;
import com.training.paygate.repository.PointTransactionRepository;
import com.training.paygate.repository.UserRepository;
import com.training.paygate.service.LoyaltyService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;

@Service
@RequiredArgsConstructor
@Slf4j
public class LoyaltyServiceImpl implements LoyaltyService {

    private final PointTransactionRepository pointTransactionRepository;
    private final UserRepository userRepository;

    @Override
    @RabbitListener(queues = "${rabbitmq.queue.notification:notification.queue}")
    @Transactional
    public void handlePaymentCompleted(PaymentCompletedEvent event) {
        if (event == null) {
            log.info("[LOYALTY] Ignored null payment event");
            return;
        }

        log.info("[LOYALTY] Received PaymentCompletedEvent for ref: {}", event.transactionRef());

        if (!"COMPLETED".equalsIgnoreCase(event.status())) {
            log.info("[LOYALTY] Ignored non-completed event for ref: {}", event.transactionRef());
            return;
        }

        TransactionType type = event.transactionType() != null ? event.transactionType() : TransactionType.PAYMENT;
        earnPoints(event.userId(), event.amount(), event.transactionRef(), type);
    }

    @Override
    @Transactional
    public void earnPoints(Long userId, BigDecimal amount, String transactionRef) {
        earnPoints(userId, amount, transactionRef, TransactionType.PAYMENT);
    }

    private void earnPoints(Long userId, BigDecimal amount, String transactionRef, TransactionType type) {
        if (userId == null) {
            log.warn("[LOYALTY] Missing userId, skipping points calculation for ref: {}", transactionRef);
            return;
        }

        if (transactionRef != null && pointTransactionRepository.existsByTransactionRef(transactionRef)) {
            log.info("[LOYALTY] Points already earned for transactionRef: {}, skipping.", transactionRef);
            return;
        }

        int points = calculatePoints(type, amount);

        if (points <= 0) {
            log.info("[LOYALTY] Calculated points <= 0 for amount: {} and type: {}", amount, type);
            return;
        }

        User user = userRepository.findById(userId).orElse(null);
        if (user == null) {
            log.warn("[LOYALTY] User not found with id: {}, skipping points.", userId);
            return;
        }

        PointTransaction pointTransaction = PointTransaction.builder()
                .user(user)
                .points(points)
                .type(PointTransactionType.EARN)
                .description("Tich diem tu giao dich " + (transactionRef != null ? transactionRef : ""))
                .transactionRef(transactionRef)
                .build();

        pointTransactionRepository.save(pointTransaction);
        log.info("[LOYALTY] Earned {} points for user: {} on transactionRef: {}", points, user.getId(), transactionRef);
    }

    private int calculatePoints(TransactionType type, BigDecimal amount) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            return 0;
        }

        switch (type) {
            case PAYMENT:
            case BILL_PAYMENT:
                // 10,000 VND = 1 point
                return amount.divide(new BigDecimal("10000"), 0, RoundingMode.DOWN).intValue();
            case LOAN_REPAYMENT:
                // 10,000 VND = 2 points
                return amount.divide(new BigDecimal("10000"), 0, RoundingMode.DOWN).multiply(new BigDecimal("2")).intValue();
            case VAULT_DEPOSIT:
                // 20,000 VND = 1 point
                return amount.divide(new BigDecimal("20000"), 0, RoundingMode.DOWN).intValue();
            default:
                return 0;
        }
    }
}
