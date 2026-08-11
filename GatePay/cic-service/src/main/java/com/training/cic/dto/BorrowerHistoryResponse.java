package com.training.cic.dto;

import java.math.BigDecimal;

public record BorrowerHistoryResponse(
        Long customerId,
        long totalTransactions,
        long onTimePayments,
        long missedPayments,
        int maxDaysPastDue,
        BigDecimal currentBalance,
        BigDecimal usedCredit
) {
}
