package com.training.paygate.service.impl;

import com.training.paygate.dto.response.AccountResponse;
import com.training.paygate.entity.Account;
import com.training.paygate.enums.AccountStatus;
import com.training.paygate.enums.OwnerType;
import com.training.paygate.exception.BadRequestException;
import com.training.paygate.exception.DuplicateResourceException;
import com.training.paygate.exception.ResourceNotFoundException;
import com.training.paygate.mapper.AccountMapper;
import com.training.paygate.repository.AccountRepository;
import com.training.paygate.service.AccountService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Service
@RequiredArgsConstructor
public class AccountServiceImpl implements AccountService {

    private final AccountRepository accountRepository;
    private final AccountMapper accountMapper;

    @Override
    @Transactional
    public AccountResponse createAccount(Long ownerId, OwnerType ownerType) {
        if (accountRepository.findByOwnerIdAndOwnerType(ownerId, ownerType).isPresent()) {
            throw new DuplicateResourceException("Account", "ownerId", ownerId);
        }

        Account account = Account.builder()
                .ownerId(ownerId)
                .ownerType(ownerType)
                .balance(BigDecimal.ZERO)
                .currency("VND")
                .status(AccountStatus.ACTIVE)
                .accountNumber("TEMP-" + ownerId + "-" + System.nanoTime())
                .build();

        Account saved = accountRepository.save(account);
        saved.setAccountNumber(String.format("AC%08d", saved.getId()));
        saved = accountRepository.save(saved);

        return accountMapper.toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public AccountResponse getBalance(Long accountId) {
        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Account", accountId));
        return accountMapper.toResponse(account);
    }

    @Override
    @Transactional(readOnly = true)
    public AccountResponse getByOwnerIdAndType(Long ownerId, OwnerType ownerType) {
        Account account = accountRepository.findByOwnerIdAndOwnerType(ownerId, ownerType)
                .orElseThrow(() -> new ResourceNotFoundException("Account for owner ID: " + ownerId + ", type: " + ownerType + " not found"));
        return accountMapper.toResponse(account);
    }

    @Override
    @Transactional
    public AccountResponse topUp(Long accountId, BigDecimal amount) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BadRequestException("Topup amount must be positive");
        }
        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Account", accountId));

        account.setBalance(account.getBalance().add(amount));
        Account saved = accountRepository.save(account);
        return accountMapper.toResponse(saved);
    }
}
