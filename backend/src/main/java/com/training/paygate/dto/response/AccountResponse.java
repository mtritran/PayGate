package com.training.paygate.dto.response;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record AccountResponse(
        Long id,
        Long ownerId,
        String ownerType,
        String accountNumber,
        BigDecimal balance,
        String currency,
        String status,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {}
