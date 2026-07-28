package com.training.paygate.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;

import java.math.BigDecimal;

@Builder
public record LoanApplyRequest(
        @NotNull(message = "Loan amount is required")
        @Min(value = 500000, message = "Minimum loan amount is 500,000 VND")
        @Max(value = 20000000, message = "Maximum loan amount is 20,000,000 VND")
        BigDecimal amount,

        @NotNull(message = "Term in months is required")
        Integer termMonths,

        String reason
) {}
