package com.training.paygate.dto.response;

import java.math.BigDecimal;

public record BnplCheckoutResponse(
        String token,
        String orderId,
        Long customerId,
        String merchantCustomerRef,
        String customerName,
        BigDecimal totalAmount,
        String status,
        Integer creditScore,
        String riskGrade,
        BigDecimal approvedLimit,
        BigDecimal maximumFinancedAmount,
        String assessmentReason
) {
}
