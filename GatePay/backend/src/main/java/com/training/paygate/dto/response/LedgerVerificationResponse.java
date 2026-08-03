package com.training.paygate.dto.response;

import java.math.BigDecimal;

public record LedgerVerificationResponse(
        boolean balanced,
        BigDecimal totalDebit,
        BigDecimal totalCredit,
        String message
) {}
