package com.training.providermock.dto;

import java.math.BigDecimal;

public record BillResponse(
        String customerCode,
        String customerName,
        String address,
        String providerCode,
        String type,
        String period,
        BigDecimal amount,
        boolean paid
) {}
