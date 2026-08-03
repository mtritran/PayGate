package com.training.paygate.service;

import com.training.paygate.dto.request.CreateVaultRequest;
import com.training.paygate.dto.request.DepositVaultRequest;
import com.training.paygate.dto.request.UpdateVaultRequest;
import com.training.paygate.dto.request.WithdrawVaultRequest;
import com.training.paygate.dto.response.VaultResponse;
import com.training.paygate.dto.response.VaultTransactionResponse;

import java.util.List;

public interface VaultService {

    List<VaultResponse> getAll(String username);

    VaultResponse getById(Long id, String username);

    VaultResponse create(CreateVaultRequest request, String username);

    VaultResponse update(Long id, UpdateVaultRequest request, String username);

    VaultTransactionResponse deposit(Long id, DepositVaultRequest request, String username);

    VaultTransactionResponse withdraw(Long id, WithdrawVaultRequest request, String username);

    VaultResponse close(Long id, String username);

    VaultResponse reopen(Long id, String username);
}
