package com.training.paygate.repository;

import com.training.paygate.entity.Transaction;
import com.training.paygate.enums.TransactionStatus;
import com.training.paygate.enums.TransactionType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface TransactionRepository extends JpaRepository<Transaction, Long> {

    Optional<Transaction> findByTransactionRef(String transactionRef);

    Optional<Transaction> findByIdempotencyKey(String idempotencyKey);

    boolean existsByIdempotencyKey(String idempotencyKey);

    boolean existsByDescription(String description);

    @Query("SELECT t FROM Transaction t WHERE " +
           "(:ownerAccountId IS NULL OR t.sourceAccountId = :ownerAccountId OR t.destAccountId = :ownerAccountId) AND " +
           "(:type IS NULL OR t.type = :type) AND " +
           "(:status IS NULL OR t.status = :status) AND " +
           "(:sourceAccountId IS NULL OR t.sourceAccountId = :sourceAccountId) AND " +
           "(:destAccountId IS NULL OR t.destAccountId = :destAccountId) AND " +
           "(:merchantId IS NULL OR t.merchantId = :merchantId)")
    Page<Transaction> findAllWithFiltersAndOwner(
            @Param("ownerAccountId") Long ownerAccountId,
            @Param("type") TransactionType type,
            @Param("status") TransactionStatus status,
            @Param("sourceAccountId") Long sourceAccountId,
            @Param("destAccountId") Long destAccountId,
            @Param("merchantId") Long merchantId,
            Pageable pageable
    );
}
