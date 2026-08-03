package com.training.paygate.dto.response;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record TransactionDetailResponse(
        String transactionRef,
        String status,
        BigDecimal amount,
        Long sourceAccountId,
        Long destAccountId,
        String type,
        String description,
        LocalDateTime createdAt,
        List<LedgerEntryResponse> ledgerEntries
) {}
