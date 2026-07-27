package com.training.paygate.dto.response;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record BillSubscriptionResponse(
        Long id,
        Long providerId,
        String providerCode,
        String providerName,
        String providerType,
        String customerCode,
        String customerName,
        String address,
        BigDecimal cycleAmount,
        String frequency,
        String status,
        LocalDateTime nextBillAt,
        LocalDateTime lastBillAt,
        LocalDateTime createdAt
) {}
