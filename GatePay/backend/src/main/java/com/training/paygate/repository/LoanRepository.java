package com.training.paygate.repository;

import com.training.paygate.entity.Loan;
import com.training.paygate.enums.LoanStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface LoanRepository extends JpaRepository<Loan, Long> {

    Optional<Loan> findByLoanRef(String loanRef);

    boolean existsByUserIdAndStatusIn(Long userId, List<LoanStatus> statuses);

    Page<Loan> findByUserId(Long userId, Pageable pageable);

    Page<Loan> findByStatus(LoanStatus status, Pageable pageable);
}
