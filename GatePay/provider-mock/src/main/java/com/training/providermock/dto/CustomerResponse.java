package com.training.providermock.dto;

import java.math.BigDecimal;

public record CustomerResponse(
        String customerCode,
        String customerName,
        String address,
        String providerCode,
        String type,
        BigDecimal cycleAmount,
        String registeredAt
) {}
