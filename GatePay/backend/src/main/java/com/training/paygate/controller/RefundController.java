package com.training.paygate.controller;

import com.training.paygate.common.ApiResponse;
import com.training.paygate.dto.request.RefundCreateRequest;
import com.training.paygate.dto.response.RefundResponse;
import com.training.paygate.service.RefundService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;

@RestController
@RequestMapping("/api/v1/refunds")
@RequiredArgsConstructor
@Tag(name = "Refund Management", description = "APIs for processing transaction refunds for Merchants and Customers")
public class RefundController {

    private final RefundService refundService;

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Process a transaction refund request")
    public ApiResponse<RefundResponse> processRefund(
            Principal principal,
            @Valid @RequestBody RefundCreateRequest request) {
        RefundResponse response = refundService.processRefund(request, principal.getName());
        return ApiResponse.success("Refund processed successfully", response);
    }
}
