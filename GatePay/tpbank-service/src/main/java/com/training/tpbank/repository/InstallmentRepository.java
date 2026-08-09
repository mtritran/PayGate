package com.training.tpbank.repository;

import com.training.tpbank.entity.Installment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface InstallmentRepository extends JpaRepository<Installment, Long> {

    @Query("""
            select count(i)
            from Installment i
            where i.loan.borrower.id = :borrowerId
              and i.status = com.training.tpbank.enums.InstallmentStatus.PAID
              and i.daysPastDue = 0
            """)
    long countOnTimePayments(@Param("borrowerId") Long borrowerId);

    @Query("""
            select count(i)
            from Installment i
            where i.loan.borrower.id = :borrowerId
              and (
                i.status in (
                  com.training.tpbank.enums.InstallmentStatus.OVERDUE,
                  com.training.tpbank.enums.InstallmentStatus.PARTIALLY_PAID
                )
                or (
                  i.status = com.training.tpbank.enums.InstallmentStatus.PAID
                  and i.daysPastDue > 0
                )
              )
            """)
    long countMissedPayments(@Param("borrowerId") Long borrowerId);

    @Query("""
            select coalesce(max(i.daysPastDue), 0)
            from Installment i
            where i.loan.borrower.id = :borrowerId
            """)
    int maxDaysPastDue(@Param("borrowerId") Long borrowerId);
}
