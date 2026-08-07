package com.training.paygate.repository;

import com.training.paygate.entity.MerchantSettlement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface MerchantSettlementRepository extends JpaRepository<MerchantSettlement, Long> {

    Optional<MerchantSettlement> findByOriginalTransactionRef(String originalTransactionRef);

    boolean existsByOriginalTransactionRef(String originalTransactionRef);

    Optional<MerchantSettlement> findBySettlementRef(String settlementRef);
}
