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

import java.security.Principal;

@RestController
@RequestMapping("/api/v1/checkout")
@RequiredArgsConstructor
@Tag(name = "Payment Gateway Checkout", description = "APIs for Third-Party Merchants to initiate checkout and customers to authenticate transactions")
public class CheckoutController {

    private final CheckoutService checkoutService;

    @PostMapping("/create")
    @Operation(summary = "Merchant initiates a checkout session (Public API for Merchants)")
    public ApiResponse<CheckoutCreateResponse> createCheckoutSession(@Valid @RequestBody CheckoutCreateRequest request) {
        CheckoutCreateResponse data = checkoutService.createCheckoutSession(request);
        return ApiResponse.success("Checkout session created successfully", data);
    }

    @GetMapping("/info/{token}")
    @Operation(summary = "Get public checkout session details by token")
    public ApiResponse<CheckoutInfoResponse> getCheckoutInfo(@PathVariable String token) {
        CheckoutInfoResponse info = checkoutService.getCheckoutInfo(token);
        return ApiResponse.success(info);
    }

    @GetMapping("/info/txn/{transactionRef}")
    @Operation(summary = "Get checkout session details by transaction reference")
    public ApiResponse<CheckoutInfoResponse> getCheckoutInfoByTxnRef(@PathVariable String transactionRef) {
        CheckoutInfoResponse info = checkoutService.getCheckoutInfoByTxnRef(transactionRef);
        return ApiResponse.success(info);
    }

    @PostMapping("/process")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Customer authenticates with OTP to complete checkout payment")
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
}
