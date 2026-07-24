package com.training.paygate.controller;

import com.training.paygate.common.ApiResponse;
import com.training.paygate.common.PageResponse;
import com.training.paygate.dto.request.CreateMerchantRequest;
import com.training.paygate.dto.request.UpdateMerchantRequest;
import com.training.paygate.dto.response.MerchantResponse;
import com.training.paygate.service.MerchantService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/merchants")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Merchant Management (Admin)", description = "APIs for managing merchants, webhooks, and approval workflows (ROLE_ADMIN required)")
public class MerchantController {

    private final MerchantService merchantService;

    @GetMapping
    @Operation(summary = "Get paginated merchant list", description = "Retrieves a paginated list of registered merchants with sorting capabilities.")
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Successfully retrieved merchant list"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403", description = "Access denied - ROLE_ADMIN required")
    })
    public ApiResponse<PageResponse<MerchantResponse>> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "DESC") String sortDir) {
        Sort sort = Sort.by(Sort.Direction.fromString(sortDir), sortBy);
        var result = merchantService.getAll(PageRequest.of(page, size, sort));
        return ApiResponse.success(PageResponse.from(result, r -> r));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get merchant by ID", description = "Retrieves detailed information of a specific merchant by merchant ID.")
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Successfully retrieved merchant details"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "Merchant not found"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403", description = "Access denied - ROLE_ADMIN required")
    })
    public ApiResponse<MerchantResponse> getById(@PathVariable Long id) {
        return ApiResponse.success(merchantService.getById(id));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create a new merchant", description = "Registers a new merchant and automatically provisions a merchant wallet account.")
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "201", description = "Merchant registered and wallet created successfully"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "Validation error in merchant request data"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "409", description = "Merchant code or business registration number already exists"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403", description = "Access denied - ROLE_ADMIN required")
    })
    public ApiResponse<MerchantResponse> create(@Valid @RequestBody CreateMerchantRequest request) {
        return ApiResponse.success("Merchant registered successfully", merchantService.create(request));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update merchant details", description = "Updates business information, webhook URL, or status for an existing merchant.")
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Merchant updated successfully"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "Merchant not found"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403", description = "Access denied - ROLE_ADMIN required")
    })
    public ApiResponse<MerchantResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody UpdateMerchantRequest request) {
        return ApiResponse.success("Merchant updated successfully", merchantService.update(id, request));
    }

    @PutMapping("/{id}/approve")
    @PatchMapping("/{id}/approve")
    @Operation(summary = "Approve pending merchant", description = "Approves a pending merchant request and provisions a merchant wallet account.")
    public ApiResponse<MerchantResponse> approve(@PathVariable Long id) {
        return ApiResponse.success("Merchant approved successfully", merchantService.approveMerchant(id));
    }

    @PutMapping("/{id}/reject")
    @PatchMapping("/{id}/reject")
    @Operation(summary = "Reject pending merchant", description = "Rejects a pending merchant request.")
    public ApiResponse<MerchantResponse> reject(@PathVariable Long id) {
        return ApiResponse.success("Merchant request rejected", merchantService.rejectMerchant(id));
    }
}
