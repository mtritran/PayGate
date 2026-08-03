package com.training.paygate.dto.response;

import com.training.paygate.enums.VaultStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record VaultResponse(
        Long id,
        String name,
        String description,
        BigDecimal targetAmount,
        BigDecimal currentBalance,
        BigDecimal progress,
        LocalDate deadline,
        VaultStatus status,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {}
