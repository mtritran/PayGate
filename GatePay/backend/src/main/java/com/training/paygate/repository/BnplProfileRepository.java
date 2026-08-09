package com.training.paygate.repository;

import com.training.paygate.entity.BnplProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface BnplProfileRepository extends JpaRepository<BnplProfile, Long> {
    Optional<BnplProfile> findByUserId(Long userId);
}
