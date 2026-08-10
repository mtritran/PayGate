package com.training.paygate.repository;

import com.training.paygate.entity.CheckoutSession;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CheckoutSessionRepository extends JpaRepository<CheckoutSession, Long> {
    Optional<CheckoutSession> findByToken(String token);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM CheckoutSession s WHERE s.token = :token")
    Optional<CheckoutSession> findByTokenForUpdate(@Param("token") String token);

    Optional<CheckoutSession> findByTransactionRef(String transactionRef);
    Optional<CheckoutSession> findFirstByMerchantIdAndMerchantCustomerRefAndCustomerIdIsNotNullOrderByCreatedAtDesc(
            Long merchantId,
            String merchantCustomerRef
    );
    Optional<CheckoutSession> findFirstByOrderIdOrderByCreatedAtDesc(String orderId);
    Optional<CheckoutSession> findFirstByOrderIdAndStatusOrderByCreatedAtDesc(String orderId, String status);
    List<CheckoutSession> findAllByOrderIdOrderByCreatedAtDesc(String orderId);
}
