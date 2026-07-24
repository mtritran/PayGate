package com.training.paygate.dto.response;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record LedgerEntryResponse(
        Long id,
        Long transactionId,
        Long accountId,
        String entryType,
        BigDecimal amount,
        BigDecimal balanceAfter,
        LocalDateTime createdAt
) {}
