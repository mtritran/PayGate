package com.training.paygate.repository;

import com.training.paygate.entity.Beneficiary;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BeneficiaryRepository extends JpaRepository<Beneficiary, Long> {

    List<Beneficiary> findByUserIdOrderByUpdatedAtDesc(Long userId);

    Optional<Beneficiary> findByUserIdAndAccountNumber(Long userId, String accountNumber);

    boolean existsByUserIdAndAccountNumber(Long userId, String accountNumber);
}
