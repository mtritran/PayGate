package com.training.cic.repository;

import com.training.cic.entity.CreditProfile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CreditProfileRepository extends JpaRepository<CreditProfile, Long> {

    Optional<CreditProfile> findByCustomerId(Long customerId);
}
