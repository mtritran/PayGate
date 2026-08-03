package com.training.paygate.repository;

import com.training.paygate.entity.LoanSchedule;
import com.training.paygate.enums.LoanScheduleStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface LoanScheduleRepository extends JpaRepository<LoanSchedule, Long> {

    List<LoanSchedule> findByLoanIdOrderByPeriodNumberAsc(Long loanId);

    Optional<LoanSchedule> findFirstByLoanIdAndStatusOrderByPeriodNumberAsc(Long loanId, LoanScheduleStatus status);
}
