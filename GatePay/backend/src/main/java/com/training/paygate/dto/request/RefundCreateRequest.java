package com.training.paygate.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;

public record RefundCreateRequest(
        @NotBlank(message = "Transaction reference must not be blank")
        String transactionRef,

        @NotBlank(message = "Order ID must not be blank")
        String orderId,

        @NotNull(message = "Amount is required")
        @Positive(message = "Amount must be greater than zero")
        BigDecimal amount,

        String reason
) {}
