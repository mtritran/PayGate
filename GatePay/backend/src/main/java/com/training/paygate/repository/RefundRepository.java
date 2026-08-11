package com.training.paygate.repository;

import com.training.paygate.entity.Refund;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.Optional;

@Repository
public interface RefundRepository extends JpaRepository<Refund, Long> {
    Optional<Refund> findByIdempotencyKey(String idempotencyKey);

    Optional<Refund> findByRefundRef(String refundRef);

    @Query("SELECT COALESCE(SUM(r.amount), 0) FROM Refund r WHERE r.originalTransactionRef = :originalTxRef AND r.status = com.training.paygate.enums.RefundStatus.COMPLETED")
    BigDecimal sumRefundedAmountByOriginalTransactionRef(@Param("originalTxRef") String originalTxRef);
}
