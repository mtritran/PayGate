package com.training.paygate.repository;

import com.training.paygate.entity.Vault;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface VaultRepository extends JpaRepository<Vault, Long> {

    List<Vault> findByUserIdOrderByCreatedAtDesc(Long userId);

    Optional<Vault> findByIdAndUserId(Long id, Long userId);

    Optional<Vault> findByAccountId(Long accountId);
}
