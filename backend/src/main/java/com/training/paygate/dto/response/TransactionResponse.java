package com.training.paygate.dto.response;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record TransactionResponse(
        String transactionRef,
        String status,
        BigDecimal amount,
        Long sourceAccountId,
        Long destAccountId,
        String type,
        String description,
        LocalDateTime createdAt
) {}
