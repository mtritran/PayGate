package com.training.paygate.dto.response;

import java.math.BigDecimal;

public record BnplProfileResponse(
        Long userId,
        String fullName,
        String occupation,
        String companyName,
        BigDecimal monthlyIncome,
        String relative1Name,
        String relative1Phone,
        String relative1Relationship,
        String relative2Name,
        String relative2Phone,
        String relative2Relationship,
        Integer creditScore,
        String riskGrade,
        BigDecimal approvedLimit,
        BigDecimal availableLimit,
        String assessmentReason
) {
}
