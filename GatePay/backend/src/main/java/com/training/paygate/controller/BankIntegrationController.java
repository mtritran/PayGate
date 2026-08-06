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
@Tag(name = "Bank Integration Webhook", description = "Endpoint nhận thông báo chuyển khoản thành công từ Ngân hàng đối tác")
public class BankIntegrationController {

    private final BankIntegrationService bankIntegrationService;

    @PostMapping("/bank-webhook")
    @Operation(summary = "Nhận webhook thông báo chuyển khoản tiền từ Ngân hàng ngoài qua VietQR (Public API)")
    public ApiResponse<TransactionResponse> handleBankWebhook(@Valid @RequestBody BankWebhookRequest request) {
        TransactionResponse response = bankIntegrationService.processBankWebhook(request);
        return ApiResponse.success("Xử lý chuyển khoản ngân hàng VietQR thành công", response);
    }
}
