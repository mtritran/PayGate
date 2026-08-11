package com.training.paygate.repository;

import com.training.paygate.entity.BnplProposal;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.Optional;

public interface BnplProposalRepository extends JpaRepository<BnplProposal, Long> {

    Optional<BnplProposal> findByProposalRef(String proposalRef);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM BnplProposal p WHERE p.proposalRef = :proposalRef")
    Optional<BnplProposal> findByProposalRefForUpdate(@Param("proposalRef") String proposalRef);

    boolean existsByCheckoutToken(String checkoutToken);

    @Query("""
            SELECT COALESCE(SUM(p.financedAmount), 0)
            FROM BnplProposal p
            WHERE p.userId = :userId
              AND p.status = 'PENDING_CONFIRMATION'
            """)
    BigDecimal sumPendingFinancedAmountByUserId(@Param("userId") Long userId);
}
