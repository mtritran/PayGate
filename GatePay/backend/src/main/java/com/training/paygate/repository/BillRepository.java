package com.training.paygate.repository;

import com.training.paygate.entity.Bill;
import com.training.paygate.enums.BillStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BillRepository extends JpaRepository<Bill, Long> {

    Optional<Bill> findFirstByProviderIdAndCustomerCodeAndStatusOrderByIdDesc(Long providerId, String customerCode, BillStatus status);

    List<Bill> findByProviderIdAndCustomerCodeOrderByCreatedAtDesc(Long providerId, String customerCode);
}
