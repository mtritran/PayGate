package com.training.paygate.controller;

import com.training.paygate.cache.BalanceCacheService;
import com.training.paygate.common.ApiResponse;
import com.training.paygate.common.PageResponse;
import com.training.paygate.dto.request.TopUpRequest;
import com.training.paygate.dto.response.AccountBalanceResponse;
import com.training.paygate.dto.response.AccountResponse;
import com.training.paygate.dto.response.TransactionResponse;
import com.training.paygate.service.AccountService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.security.Principal;

@RestController
@RequestMapping("/api/v1/accounts")
@RequiredArgsConstructor
@Tag(name = "Account Management", description = "Endpoints for checking user balance, caching, top-up operations, and account transaction history")
public class AccountController {

    private final AccountService accountService;
    private final BalanceCacheService balanceCacheService;

    @GetMapping("/me")
    @Operation(summary = "Get current user's account details", description = "Retrieves profile and wallet account information for the currently authenticated user.")
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Successfully retrieved account details"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "Unauthorized - Authentication token required")
    })
    public ApiResponse<AccountResponse> getMyAccount(Principal principal) {
        AccountResponse response = accountService.getAccountByUsername(principal.getName());
        return ApiResponse.success(response);
    }

    @GetMapping("/{id}/balance")
    @Operation(summary = "Get account balance by ID (Cached)", description = "Retrieves the account balance by ID, leveraging Redis cache eviction and ownership checks.")
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Successfully retrieved balance"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403", description = "Access denied - You do not own this account"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "Account not found")
    })
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
    @Operation(summary = "Top up account balance", description = "Transfers funds from system account into user account, recording TOPUP transaction and double-entry ledger logs.")
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "201", description = "Account topped up successfully"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "Invalid top-up amount or inactive account")
    })
    public ApiResponse<TransactionResponse> topUp(@Valid @RequestBody TopUpRequest request, Principal principal) {
        AccountResponse userAccount = accountService.getAccountByUsername(principal.getName());
        TransactionResponse response = accountService.topUp(userAccount.id(), request.amount(), request.description());

        // Invalidate balance cache for the updated account
        balanceCacheService.evictBalance(userAccount.id());

        return ApiResponse.success("Balance topped up successfully", response);
    }

    @GetMapping("/{id}/history")
    @Operation(summary = "Get account transaction history", description = "Retrieves a paginated list of transaction history entries for the specified account ID.")
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Successfully retrieved transaction history"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403", description = "Access denied - You do not own this account")
    })
    public ApiResponse<PageResponse<TransactionResponse>> getHistory(
            @PathVariable Long id,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "DESC") String sortDir,
            Principal principal
    ) {
        Sort sort = Sort.by(Sort.Direction.fromString(sortDir), sortBy);
        Page<TransactionResponse> result = accountService.getAccountHistory(id, principal.getName(), PageRequest.of(page, size, sort));
        return ApiResponse.success(PageResponse.from(result, r -> r));
    }

    @GetMapping("/lookup")
    @Operation(summary = "Lookup account details by account number, ID, or username", description = "Resolves recipient account details and verified owner name in real-time.")
    public ApiResponse<com.training.paygate.dto.response.AccountLookupResponse> lookupAccount(@RequestParam String query) {
        com.training.paygate.dto.response.AccountLookupResponse response = accountService.lookupAccount(query);
        return ApiResponse.success(response);
    }
}
