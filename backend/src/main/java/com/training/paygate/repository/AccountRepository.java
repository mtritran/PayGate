package com.training.paygate.repository;

import com.training.paygate.entity.Account;
import com.training.paygate.enums.OwnerType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface AccountRepository extends JpaRepository<Account, Long> {

    Optional<Account> findByAccountNumber(String accountNumber);

    Optional<Account> findByOwnerIdAndOwnerType(Long ownerId, OwnerType ownerType);

    boolean existsByAccountNumber(String accountNumber);
}
