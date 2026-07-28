package com.training.paygate.repository;

import com.training.paygate.entity.PointTransaction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PointTransactionRepository extends JpaRepository<PointTransaction, Long> {

    Page<PointTransaction> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    @Query("SELECT COALESCE(SUM(pt.points), 0) FROM PointTransaction pt WHERE pt.user.id = :userId")
    Integer getTotalPointsByUserId(@Param("userId") Long userId);
}
