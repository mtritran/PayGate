package com.training.paygate.controller;

import com.training.paygate.common.ApiResponse;
import com.training.paygate.dto.request.BnplBorrowerProfileRequest;
import com.training.paygate.dto.request.BnplProposalCreateRequest;
import com.training.paygate.dto.request.CheckoutSelectCustomerRequest;
import com.training.paygate.dto.response.BnplCheckoutResponse;
import com.training.paygate.dto.response.BnplProposalResponse;
import com.training.paygate.service.BnplCheckoutService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/checkout")
@RequiredArgsConstructor
@Tag(name = "BNPL Checkout", description = "Demo BNPL checkout happy-case APIs")
public class BnplCheckoutController {

    private final BnplCheckoutService bnplCheckoutService;

    @PostMapping("/{token}/customer")
    @Operation(summary = "Assign PayGate customer to checkout")
    public ApiResponse<BnplCheckoutResponse> selectCustomer(
            @PathVariable String token,
            @Valid @RequestBody CheckoutSelectCustomerRequest request
    ) {
        return ApiResponse.success(bnplCheckoutService.selectCustomer(token, request.customerId()));
    }

    @PostMapping("/{token}/borrower-profile")
    @Operation(summary = "Submit first-time BNPL borrower profile and resolve PayGate account")
    public ApiResponse<BnplCheckoutResponse> submitBorrowerProfile(
            @PathVariable String token,
            @Valid @RequestBody BnplBorrowerProfileRequest request,
            Authentication authentication
    ) {
        String username = authentication != null ? authentication.getName() : null;
        return ApiResponse.success(bnplCheckoutService.submitBorrowerProfile(token, request, username));
    }

    @PostMapping("/{token}/credit-assessment")
    @Operation(summary = "Request CIC credit assessment for checkout")
    public ApiResponse<BnplCheckoutResponse> assessCredit(@PathVariable String token) {
        return ApiResponse.success(bnplCheckoutService.assessCredit(token));
    }

    @PostMapping("/{token}/bnpl-proposals")
    @Operation(summary = "Create proposal from selected loan amount and tenor")
    public ApiResponse<BnplProposalResponse> createBnplProposal(
            @PathVariable String token,
            @Valid @RequestBody BnplProposalCreateRequest request,
            Authentication authentication
    ) {
        String username = authentication != null ? authentication.getName() : null;
        return ApiResponse.success(bnplCheckoutService.createProposal(token, request, username));
    }

    @PostMapping("/bnpl-proposals/{proposalRef}/confirm")
    @Operation(summary = "Confirm proposal and disburse to merchant")
    public ApiResponse<BnplProposalResponse> confirmBnplProposal(
            @PathVariable String proposalRef,
            Authentication authentication
    ) {
        String username = authentication != null ? authentication.getName() : null;
        return ApiResponse.success(bnplCheckoutService.confirmProposal(proposalRef, username));
    }
}
