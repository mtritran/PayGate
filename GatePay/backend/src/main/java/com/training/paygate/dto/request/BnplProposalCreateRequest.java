package com.training.paygate.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;

public record BnplProposalCreateRequest(
        @NotNull
        @DecimalMin("1000")
        BigDecimal financedAmount,

        @NotNull
        @Positive
        Integer tenorMonths
) {
}
