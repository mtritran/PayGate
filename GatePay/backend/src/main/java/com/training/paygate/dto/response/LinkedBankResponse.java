package com.training.paygate.dto.response;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record LinkedBankResponse(
        Long id,
        Long userId,
        String bankName,
        String accountNumber,
        String accountHolder,
        BigDecimal balance,
        String iconType,
        String status,
        LocalDateTime createdAt
) {}
