package com.training.paygate.repository;

import com.training.paygate.entity.RecurringPaymentLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RecurringPaymentLogRepository extends JpaRepository<RecurringPaymentLog, Long> {

    List<RecurringPaymentLog> findByRecurringPaymentIdOrderByExecutedAtDesc(Long recurringPaymentId);
}
