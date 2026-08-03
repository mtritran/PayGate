package com.training.paygate.repository;

import com.training.paygate.entity.SavedBill;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SavedBillRepository extends JpaRepository<SavedBill, Long> {

    List<SavedBill> findByUserIdOrderByCreatedAtDesc(Long userId);

    long countByUserId(Long userId);

    boolean existsByUserIdAndProviderIdAndCustomerCode(Long userId, Long providerId, String customerCode);
}
