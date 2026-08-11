package com.training.tpbank.repository;

import com.training.tpbank.entity.Borrower;
import com.training.tpbank.enums.BorrowerStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface BorrowerRepository extends JpaRepository<Borrower, Long> {

    Optional<Borrower> findByCustomerIdAndStatus(Long customerId, BorrowerStatus status);
}
