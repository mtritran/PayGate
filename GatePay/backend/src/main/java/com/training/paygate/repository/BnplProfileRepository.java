package com.training.paygate.repository;

import com.training.paygate.entity.BnplProfile;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface BnplProfileRepository extends JpaRepository<BnplProfile, Long> {
    Optional<BnplProfile> findByUserId(Long userId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM BnplProfile p WHERE p.userId = :userId")
    Optional<BnplProfile> findByUserIdForUpdate(@Param("userId") Long userId);
}
