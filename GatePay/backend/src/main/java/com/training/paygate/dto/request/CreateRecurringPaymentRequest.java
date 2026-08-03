package com.training.paygate.dto.request;

import com.training.paygate.enums.RecurringCategory;
import com.training.paygate.enums.RecurringFrequency;
import com.training.paygate.enums.RecurringType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record CreateRecurringPaymentRequest(
        @NotNull RecurringType type,
        @NotNull RecurringCategory category,
        String providerCode,
        String billCode,
        Long destAccountId,
        @NotNull @DecimalMin(value = "1000", message = "Amount must be at least 1,000 VND") BigDecimal amount,
        String description,
        @NotNull RecurringFrequency frequency,
        LocalDateTime startDate
) {}
