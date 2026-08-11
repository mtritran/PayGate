package com.training.paygate.controller;

import com.training.paygate.common.ApiResponse;
import com.training.paygate.dto.request.CheckoutCreateRequest;
import com.training.paygate.dto.request.CheckoutProcessRequest;
import com.training.paygate.dto.response.CheckoutCreateResponse;
import com.training.paygate.dto.response.CheckoutInfoResponse;
import com.training.paygate.dto.response.CheckoutProcessResponse;
import com.training.paygate.service.CheckoutService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.training.paygate.annotation.RateLimit;

import java.security.Principal;

@RestController
@RequestMapping("/api/v1/checkout")
@RequiredArgsConstructor
@Tag(name = "Payment Gateway Checkout", description = "APIs for third-party merchants to initiate checkout sessions and customers to authenticate payments")
public class CheckoutController {

    private final CheckoutService checkoutService;

    @PostMapping("/create")
    @RateLimit(limit = 60, windowSeconds = 60, key = "checkout_create")
    @Operation(summary = "Merchant initiates a checkout session (Public API for Merchants)")
    public ApiResponse<CheckoutCreateResponse> createCheckoutSession(
            jakarta.servlet.http.HttpServletRequest httpRequest,
            @Valid @RequestBody CheckoutCreateRequest request
    ) {
        String merchantCode = (String) httpRequest.getAttribute("validatedMerchantCode");
        
        CheckoutCreateResponse data = checkoutService.createCheckoutSession(request, merchantCode);
        return ApiResponse.success("Checkout session created successfully", data);
    }

    @GetMapping("/info/{token}")
    @Operation(summary = "Get public checkout session details by token")
    public ApiResponse<CheckoutInfoResponse> getCheckoutInfo(@PathVariable String token) {
        return ApiResponse.success(checkoutService.getCheckoutInfo(token));
    }

    @GetMapping("/info/txn/{transactionRef}")
    @Operation(summary = "Get checkout session details by transaction reference")
    public ApiResponse<CheckoutInfoResponse> getCheckoutInfoByTxnRef(@PathVariable String transactionRef) {
        return ApiResponse.success(checkoutService.getCheckoutInfoByTxnRef(transactionRef));
    }

    @PostMapping("/process")
    @PreAuthorize("isAuthenticated()")
    @RateLimit(limit = 5, windowSeconds = 60, key = "checkout_process")
    @Operation(summary = "Customer authenticates OTP and completes checkout payment")
    public ApiResponse<CheckoutProcessResponse> processCheckout(
            Principal principal,
            @Valid @RequestBody CheckoutProcessRequest request,
            HttpServletRequest httpRequest
    ) {
        CheckoutProcessResponse data = checkoutService.processCheckout(principal.getName(), request, clientIp(httpRequest));
        return ApiResponse.success("Checkout payment is being processed", data);
    }

    private String clientIp(HttpServletRequest request) {
        String xf = request.getHeader("X-Forwarded-For");
        if (xf != null && !xf.isEmpty()) {
            return xf.split(",")[0].trim();
        }
        return request.getRemoteAddr() != null ? request.getRemoteAddr() : "unknown_ip";
    }

    @PostMapping("/cancel/{token}")
    @Operation(summary = "Cancel a pending checkout session and notify merchant via webhook")
    public ApiResponse<Void> cancelCheckout(@PathVariable String token) {
        checkoutService.cancelCheckout(token);
        return ApiResponse.success("Checkout session cancelled", null);
    }
}
