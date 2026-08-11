package com.training.paygate.controller;

import com.training.paygate.common.ApiResponse;
import com.training.paygate.dto.request.CreateVaultRequest;
import com.training.paygate.dto.request.DepositVaultRequest;
import com.training.paygate.dto.request.UpdateVaultRequest;
import com.training.paygate.dto.request.WithdrawVaultRequest;
import com.training.paygate.dto.response.VaultResponse;
import com.training.paygate.dto.response.VaultTransactionResponse;
import com.training.paygate.service.VaultService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/v1/vaults")
@RequiredArgsConstructor
public class VaultController {

    private final VaultService vaultService;

    @GetMapping
    public ApiResponse<List<VaultResponse>> getAll(Principal principal) {
        return ApiResponse.success(vaultService.getAll(principal.getName()));
    }

    @GetMapping("/{id}")
    public ApiResponse<VaultResponse> getById(@PathVariable Long id, Principal principal) {
        return ApiResponse.success(vaultService.getById(id, principal.getName()));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<VaultResponse> create(@Valid @RequestBody CreateVaultRequest request, Principal principal) {
        return ApiResponse.success("Vault created successfully", vaultService.create(request, principal.getName()));
    }

    @PutMapping("/{id}")
    public ApiResponse<VaultResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody UpdateVaultRequest request,
            Principal principal
    ) {
        return ApiResponse.success("Vault updated successfully", vaultService.update(id, request, principal.getName()));
    }

    @PostMapping("/{id}/deposit")
    public ApiResponse<VaultTransactionResponse> deposit(
            @PathVariable Long id,
            @Valid @RequestBody DepositVaultRequest request,
            Principal principal
    ) {
        return ApiResponse.success("Deposit successful", vaultService.deposit(id, request, principal.getName()));
    }

    @PostMapping("/{id}/withdraw")
    public ApiResponse<VaultTransactionResponse> withdraw(
            @PathVariable Long id,
            @Valid @RequestBody WithdrawVaultRequest request,
            Principal principal
    ) {
        return ApiResponse.success("Withdrawal successful", vaultService.withdraw(id, request, principal.getName()));
    }

    @PatchMapping("/{id}/close")
    public ApiResponse<VaultResponse> close(@PathVariable Long id, Principal principal) {
        return ApiResponse.success("Vault closed successfully", vaultService.close(id, principal.getName()));
    }

    @PatchMapping("/{id}/reopen")
    public ApiResponse<VaultResponse> reopen(@PathVariable Long id, Principal principal) {
        return ApiResponse.success("Vault reopened successfully", vaultService.reopen(id, principal.getName()));
    }
}
