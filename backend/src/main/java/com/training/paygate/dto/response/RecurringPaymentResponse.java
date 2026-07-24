package com.training.paygate.dto.response;

import com.training.paygate.enums.RecurringCategory;
import com.training.paygate.enums.RecurringFrequency;
import com.training.paygate.enums.RecurringStatus;
import com.training.paygate.enums.RecurringType;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record RecurringPaymentResponse(
        Long id,
        Long userId,
        RecurringType type,
        RecurringCategory category,
        String providerCode,
        String billCode,
        Long destAccountId,
        String destAccountNumber,
        BigDecimal amount,
        String currency,
        String description,
        RecurringFrequency frequency,
        RecurringStatus status,
        LocalDateTime startDate,
        LocalDateTime nextRunAt,
        LocalDateTime lastRunAt,
        Integer failureCount,
        LocalDateTime createdAt
) {}
