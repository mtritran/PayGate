package com.training.cic.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record CreditEventRequest(
        @NotBlank
        String eventId,

        @NotBlank
        String eventType,

        @NotBlank
        String provider,

        @NotNull
        Long customerId,

        @PositiveOrZero
        long totalTransactions,

        @PositiveOrZero
        long onTimePayments,

        @PositiveOrZero
        long missedPayments,

        @NotNull
        @PositiveOrZero
        BigDecimal currentBalance,

        @NotNull
        @PositiveOrZero
        BigDecimal usedCredit,

        @PositiveOrZero
        int maxDaysPastDue,

        boolean activeBadDebt,

        boolean writeOff,

        boolean providerFraudReported,

        @NotNull
        OffsetDateTime occurredAt
) {
}
