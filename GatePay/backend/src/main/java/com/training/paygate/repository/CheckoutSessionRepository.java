package com.training.paygate.repository;

import com.training.paygate.entity.CheckoutSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CheckoutSessionRepository extends JpaRepository<CheckoutSession, Long> {
    Optional<CheckoutSession> findByToken(String token);
    Optional<CheckoutSession> findByTransactionRef(String transactionRef);
    Optional<CheckoutSession> findByOrderId(String orderId);
}
