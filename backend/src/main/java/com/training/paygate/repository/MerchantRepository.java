package com.training.paygate.repository;

import com.training.paygate.entity.Merchant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface MerchantRepository extends JpaRepository<Merchant, Long> {
    Optional<Merchant> findByMerchantCode(String merchantCode);
    Optional<Merchant> findByUserId(Long userId);
    boolean existsByMerchantCode(String merchantCode);
    boolean existsByUserId(Long userId);
}
