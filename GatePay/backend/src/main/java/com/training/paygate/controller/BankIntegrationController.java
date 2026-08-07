package com.training.paygate.controller;

import com.training.paygate.common.ApiResponse;
import com.training.paygate.dto.request.BankWebhookRequest;
import com.training.paygate.dto.response.TransactionResponse;
import com.training.paygate.service.BankIntegrationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/integration")
@RequiredArgsConstructor
@Tag(name = "Bank Integration Webhook", description = "Partner bank transfer webhook endpoint")
public class BankIntegrationController {

    private final BankIntegrationService bankIntegrationService;

    @PostMapping("/bank-webhook")
    @Operation(summary = "Process inbound bank transfer webhook for VietQR payments")
    public ApiResponse<TransactionResponse> handleBankWebhook(@Valid @RequestBody BankWebhookRequest request) {
        TransactionResponse response = bankIntegrationService.processBankWebhook(request);
        return ApiResponse.success("Bank transfer webhook processed successfully", response);
    }
}
