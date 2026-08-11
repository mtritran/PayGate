package com.training.paygate.dto.response;

import java.time.LocalDateTime;

public record RecurringPaymentLogResponse(
        Long id,
        Long recurringPaymentId,
        String transactionRef,
        String status,
        String message,
        LocalDateTime executedAt
) {}
