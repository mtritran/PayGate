package com.training.cic.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;

public record CreditCheckRequest(
        @NotNull
        Long customerId,

        @NotNull
        @Positive
        BigDecimal requestedAmount,

        String plan
) {
}
