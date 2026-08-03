package com.training.paygate.repository;

import com.training.paygate.entity.FraudLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FraudLogRepository extends JpaRepository<FraudLog, Long> {

    List<FraudLog> findTop20ByOrderByCreatedAtDesc();

    Page<FraudLog> findByUsernameContainingIgnoreCase(String username, Pageable pageable);

    Page<FraudLog> findByRiskLevel(String riskLevel, Pageable pageable);
}
