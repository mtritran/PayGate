package com.training.paygate.dto.response;

import java.math.BigDecimal;

public record BillLookupResponse(
        Long billId,
        String providerCode,
        String providerName,
        String customerCode,
        String customerName,
        String address,
        String period,
        BigDecimal amount,
        String status
) {}
