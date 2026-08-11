package com.training.paygate.credit;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CreditScoreRepository extends JpaRepository<CreditScore, Long> {

    Optional<CreditScore> findByUserId(Long userId);

    Optional<CreditScore> findByUsername(String username);

    boolean existsByUserId(Long userId);
}