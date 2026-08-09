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
import org.springframework.web.bind.annotation.*;

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
    @Operation(summary = "Merchant initiates checkout session (Public API for merchants)")
    public ApiResponse<CheckoutCreateResponse> createCheckoutSession(@Valid @RequestBody CheckoutCreateRequest request) {
        CheckoutCreateResponse response = checkoutService.createCheckoutSession(request);
        return ApiResponse.success("Checkout session created successfully", response);
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
        CheckoutProcessResponse response = checkoutService.processCheckout(
                principal.getName(),
                request,
                clientIp(httpRequest)
        );
        return ApiResponse.success("Checkout payment is being processed", response);
    }

    private String clientIp(HttpServletRequest request) {
        String xf = request.getHeader("X-Forwarded-For");
        if (xf != null && !xf.isEmpty()) {
            return xf.split(",")[0].trim();
        }
        return request.getRemoteAddr() != null ? request.getRemoteAddr() : "unknown_ip";
    }
}
