package com.training.tpbank.repository;

import com.training.tpbank.entity.Payment;
import com.training.tpbank.enums.PaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PaymentRepository extends JpaRepository<Payment, Long> {

    long countByLoanBorrowerIdAndStatus(Long borrowerId, PaymentStatus status);
}
