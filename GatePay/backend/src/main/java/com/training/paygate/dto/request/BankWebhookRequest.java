package com.training.paygate.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;

public record BankWebhookRequest(
        String bankCode,
        String bankTransactionNo,
        String accountNumber,

        @NotNull(message = "Amount is required")
        @Positive(message = "Amount must be greater than zero")
        BigDecimal amount,

        @NotBlank(message = "Transfer content is required")
        String transferContent,

        String transactionTime
) {}
