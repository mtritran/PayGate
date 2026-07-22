package com.training.paygate.controller;

import com.training.paygate.cache.BalanceCacheService;
import com.training.paygate.common.ApiResponse;
import com.training.paygate.dto.request.TopUpRequest;
import com.training.paygate.dto.response.AccountBalanceResponse;
import com.training.paygate.dto.response.AccountResponse;
import com.training.paygate.dto.response.TransactionResponse;
import com.training.paygate.service.AccountService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.security.Principal;

@RestController
@RequestMapping("/api/v1/accounts")
@RequiredArgsConstructor
@Tag(name = "Accounts", description = "Endpoints for managing accounts and balances")
public class AccountController {

    private final AccountService accountService;
    private final BalanceCacheService balanceCacheService;

    @GetMapping("/me")
    @Operation(summary = "Get current user's account details")
    public ApiResponse<AccountResponse> getMyAccount(Principal principal) {
        AccountResponse response = accountService.getAccountByUsername(principal.getName());
        return ApiResponse.success(response);
    }

    @GetMapping("/{id}/balance")
    @Operation(summary = "Get account balance by ID (cached)")
    public ApiResponse<AccountBalanceResponse> getBalance(@PathVariable Long id, Principal principal) {
        String currentUsername = principal.getName();

        // 1. Try reading from cache
        BigDecimal cachedBalance = balanceCacheService.getBalance(id);
        if (cachedBalance != null) {
            // Check authorization before returning cached balance
            AccountResponse accountDetails = accountService.getBalanceChecked(id, currentUsername);
            return ApiResponse.success(new AccountBalanceResponse(id, cachedBalance, accountDetails.currency()));
        }

        // 2. Cache miss: read from DB and verify ownership/admin
        AccountResponse account = accountService.getBalanceChecked(id, currentUsername);

        // 3. Write back to cache
        balanceCacheService.cacheBalance(id, account.balance());

        return ApiResponse.success(new AccountBalanceResponse(id, account.balance(), account.currency()));
    }

    @PostMapping("/topup")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Top up account balance")
    public ApiResponse<TransactionResponse> topUp(@Valid @RequestBody TopUpRequest request, Principal principal) {
        AccountResponse userAccount = accountService.getAccountByUsername(principal.getName());
        TransactionResponse response = accountService.topUp(userAccount.id(), request.amount(), request.description());

        // Invalidate balance cache for the updated account
        balanceCacheService.evictBalance(userAccount.id());

        return ApiResponse.success("Balance topped up successfully", response);
    }

    @GetMapping("/{id}/history")
    @Operation(summary = "Get account history (transactions)")
    public ApiResponse<com.training.paygate.common.PageResponse<com.training.paygate.dto.response.TransactionResponse>> getHistory(
            @PathVariable Long id,
            @org.springframework.web.bind.annotation.RequestParam(defaultValue = "0") int page,
            @org.springframework.web.bind.annotation.RequestParam(defaultValue = "20") int size,
            @org.springframework.web.bind.annotation.RequestParam(defaultValue = "createdAt") String sortBy,
            @org.springframework.web.bind.annotation.RequestParam(defaultValue = "DESC") String sortDir,
            Principal principal
    ) {
        org.springframework.data.domain.Sort sort = org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.fromString(sortDir), sortBy);
        org.springframework.data.domain.Page<com.training.paygate.dto.response.TransactionResponse> result =
                accountService.getAccountHistory(id, principal.getName(), org.springframework.data.domain.PageRequest.of(page, size, sort));
        return ApiResponse.success(com.training.paygate.common.PageResponse.from(result, r -> r));
    }
}
