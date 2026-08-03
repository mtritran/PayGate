package com.training.paygate.repository;

import com.training.paygate.entity.BillSubscription;
import com.training.paygate.enums.BillSubscriptionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface BillSubscriptionRepository extends JpaRepository<BillSubscription, Long> {

    List<BillSubscription> findByUserIdOrderByCreatedAtDesc(Long userId);

    List<BillSubscription> findByUserIdAndProviderIdAndStatus(
            Long userId, Long providerId, BillSubscriptionStatus status);

    boolean existsByUserIdAndProviderIdAndCustomerCode(Long userId, Long providerId, String customerCode);

    @Query("SELECT s FROM BillSubscription s WHERE s.status = :status AND s.nextBillAt <= :now")
    List<BillSubscription> findDueSubscriptions(BillSubscriptionStatus status, LocalDateTime now);
}
