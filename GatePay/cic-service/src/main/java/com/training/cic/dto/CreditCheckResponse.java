package com.training.cic.dto;

import java.math.BigDecimal;

public record CreditCheckResponse(
        Long customerId,
        boolean approved,
        int score,
        String tier,
        BigDecimal approvedLimit,
        BigDecimal maxLoanAmount,
        BigDecimal suggestedUpfrontAmount,
        String reason
) {
}
