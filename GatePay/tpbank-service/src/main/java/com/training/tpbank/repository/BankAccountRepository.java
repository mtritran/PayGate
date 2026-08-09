package com.training.tpbank.repository;

import com.training.tpbank.entity.BankAccount;
import com.training.tpbank.enums.BankAccountStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BankAccountRepository extends JpaRepository<BankAccount, Long> {

    List<BankAccount> findByBorrowerIdAndStatus(Long borrowerId, BankAccountStatus status);
}
