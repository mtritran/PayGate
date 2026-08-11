package com.training.paygate.repository;

import com.training.paygate.entity.LoanSchedule;
import com.training.paygate.enums.LoanScheduleStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface LoanScheduleRepository extends JpaRepository<LoanSchedule, Long> {

    List<LoanSchedule> findByLoanIdOrderByPeriodNumberAsc(Long loanId);

    List<LoanSchedule> findByTransactionRef(String transactionRef);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM LoanSchedule s JOIN FETCH s.loan WHERE s.transactionRef = :transactionRef")
    List<LoanSchedule> findByTransactionRefForUpdate(@Param("transactionRef") String transactionRef);

    Optional<LoanSchedule> findFirstByLoanIdAndStatusOrderByPeriodNumberAsc(Long loanId, LoanScheduleStatus status);
}
