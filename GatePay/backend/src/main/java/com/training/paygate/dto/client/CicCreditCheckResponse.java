package com.training.paygate.dto.client;

import java.math.BigDecimal;

public record CicCreditCheckResponse(
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
