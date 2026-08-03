package com.training.paygate.repository;

import com.training.paygate.entity.LinkedBank;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface LinkedBankRepository extends JpaRepository<LinkedBank, Long> {
    List<LinkedBank> findByUserIdAndStatus(Long userId, String status);
    Optional<LinkedBank> findByIdAndUserId(Long id, Long userId);
}
