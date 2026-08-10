package com.training.paygate.controller;

import com.training.paygate.common.ApiResponse;
import com.training.paygate.dto.request.RefundCreateRequest;
import com.training.paygate.dto.response.RefundResponse;
import com.training.paygate.service.RefundService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/refunds")
@RequiredArgsConstructor
@Tag(name = "Refund Management", description = "APIs for processing transaction refunds for Merchants")
public class RefundController {

    private final RefundService refundService;

    @PostMapping
    @com.training.paygate.annotation.RateLimit(limit = 10, windowSeconds = 60, key = "refund")
    @Operation(summary = "Process a transaction refund request (Public API for Merchants authenticated by API Key)")
    public ApiResponse<RefundResponse> processRefund(@Valid @RequestBody RefundCreateRequest request) {
        RefundResponse response = refundService.processRefund(request);
        return ApiResponse.success("Refund processed successfully", response);
    }
}
