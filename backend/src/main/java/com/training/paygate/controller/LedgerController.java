package com.training.paygate.controller;

import com.training.paygate.common.ApiResponse;
import com.training.paygate.dto.response.LedgerEntryResponse;
import com.training.paygate.dto.response.LedgerVerificationResponse;
import com.training.paygate.service.LedgerService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/ledger")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Ledger Verification (Admin)", description = "Double-entry accounting audit APIs for total DEBIT vs CREDIT verification (ROLE_ADMIN required)")
public class LedgerController {

    private final LedgerService ledgerService;

    @GetMapping("/verify")
    @Operation(summary = "Verify double-entry ledger balance integrity", description = "Audits system-wide double-entry balance by comparing SUM(DEBIT) with SUM(CREDIT).")
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Double-entry verification executed successfully"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403", description = "Access denied - ROLE_ADMIN required")
    })
    public ApiResponse<LedgerVerificationResponse> verify() {
        return ApiResponse.success("Ledger verification executed successfully", ledgerService.verifyLedger());
    }

    @GetMapping("/account/{id}")
    @Operation(summary = "Get all ledger entries for a specific account", description = "Retrieves all debit and credit journal entries recorded for the specified account ID.")
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Ledger entries retrieved successfully"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403", description = "Access denied - ROLE_ADMIN required")
    })
    public ApiResponse<List<LedgerEntryResponse>> getEntriesByAccount(@PathVariable Long id) {
        return ApiResponse.success("Account ledger entries retrieved successfully", ledgerService.getEntriesByAccount(id));
    }
}
