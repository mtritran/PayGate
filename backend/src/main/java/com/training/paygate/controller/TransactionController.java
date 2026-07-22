package com.training.paygate.controller;

import com.training.paygate.common.ApiResponse;
import com.training.paygate.common.PageResponse;
import com.training.paygate.dto.request.PaymentRequest;
import com.training.paygate.dto.response.AccountResponse;
import com.training.paygate.dto.response.TransactionDetailResponse;
import com.training.paygate.dto.response.TransactionResponse;
import com.training.paygate.entity.User;
import com.training.paygate.enums.Role;
import com.training.paygate.enums.TransactionStatus;
import com.training.paygate.enums.TransactionType;
import com.training.paygate.exception.ResourceNotFoundException;
import com.training.paygate.repository.UserRepository;
import com.training.paygate.service.AccountService;
import com.training.paygate.service.TransactionService;
import io.swagger.v3.oas.annotations.Operation;
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

import java.security.Principal;

@RestController
@RequestMapping("/api/v1/transactions")
@RequiredArgsConstructor
@Tag(name = "Transactions", description = "Endpoints for processing and querying transactions")
public class TransactionController {

    private final TransactionService transactionService;
    private final AccountService accountService;
    private final UserRepository userRepository;

    @PostMapping("/pay")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Process a payment transaction")
    public ApiResponse<TransactionResponse> pay(@Valid @RequestBody PaymentRequest request, Principal principal) {
        TransactionResponse response = transactionService.processPayment(request, principal.getName());
        return ApiResponse.success("Payment processed successfully", response);
    }

    @GetMapping("/{ref}")
    @Operation(summary = "Get transaction details by reference")
    public ApiResponse<TransactionDetailResponse> getTransactionByRef(@PathVariable String ref, Principal principal) {
        TransactionDetailResponse response = transactionService.getTransactionByRef(ref, principal.getName());
        return ApiResponse.success(response);
    }

    @GetMapping
    @Operation(summary = "Get transactions with filters and pagination")
    public ApiResponse<PageResponse<TransactionResponse>> getTransactions(
            @RequestParam(required = false) TransactionType type,
            @RequestParam(required = false) TransactionStatus status,
            @RequestParam(required = false) Long sourceAccountId,
            @RequestParam(required = false) Long destAccountId,
            @RequestParam(required = false) Long merchantId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "DESC") String sortDir,
            Principal principal
    ) {
        User user = userRepository.findByUsername(principal.getName())
                .orElseThrow(() -> new ResourceNotFoundException("User not found with username: " + principal.getName()));

        Long ownerAccountId = null;
        if (user.getRole() != Role.ADMIN) {
            AccountResponse userAccount = accountService.getAccountByUsername(principal.getName());
            ownerAccountId = userAccount.id();
        }

        Sort sort = Sort.by(Sort.Direction.fromString(sortDir), sortBy);
        Page<TransactionResponse> result = transactionService.getTransactions(
                ownerAccountId, type, status, sourceAccountId, destAccountId, merchantId, PageRequest.of(page, size, sort)
        );

        return ApiResponse.success(PageResponse.from(result, r -> r));
    }

    @PostMapping("/{ref}/refund")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Request a refund for a completed transaction")
    public ApiResponse<TransactionResponse> refund(@PathVariable String ref, Principal principal) {
        TransactionResponse response = transactionService.refund(ref, principal.getName());
        return ApiResponse.success("Transaction refunded successfully", response);
    }
}
