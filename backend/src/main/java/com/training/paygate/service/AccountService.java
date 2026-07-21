package com.training.paygate.service;

import com.training.paygate.dto.response.AccountResponse;
import com.training.paygate.dto.response.LedgerEntryResponse;
import com.training.paygate.dto.response.TransactionResponse;
import com.training.paygate.enums.OwnerType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;

public interface AccountService {

    AccountResponse createAccount(Long ownerId, OwnerType ownerType);

    AccountResponse getBalance(Long accountId);

    AccountResponse getByOwnerIdAndType(Long ownerId, OwnerType ownerType);

    TransactionResponse topUp(Long accountId, BigDecimal amount, String description);

    AccountResponse getAccountByUsername(String username);

    AccountResponse getBalanceChecked(Long accountId, String currentUsername);

    Page<LedgerEntryResponse> getAccountHistory(Long accountId, String currentUsername, Pageable pageable);
}
