package com.training.paygate.repository;

import com.training.paygate.entity.RecurringPayment;
import com.training.paygate.enums.RecurringStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface RecurringPaymentRepository extends JpaRepository<RecurringPayment, Long> {

    List<RecurringPayment> findByUserIdOrderByCreatedAtDesc(Long userId);

    Page<RecurringPayment> findByUserId(Long userId, Pageable pageable);

    @Query("SELECT r FROM RecurringPayment r WHERE r.status = :status AND r.nextRunAt <= :now")
    List<RecurringPayment> findDuePayments(RecurringStatus status, LocalDateTime now);
}
