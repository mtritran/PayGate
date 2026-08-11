package com.training.tpbank.repository;

import com.training.tpbank.entity.Loan;
import com.training.tpbank.enums.LoanStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface LoanRepository extends JpaRepository<Loan, Long> {

    List<Loan> findByBorrowerIdAndStatusIn(Long borrowerId, Collection<LoanStatus> statuses);
}
