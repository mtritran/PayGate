package com.training.paygate.dto.response;

import lombok.Builder;

import java.math.BigDecimal;

@Builder
public record VoucherApplyResponse(
        boolean valid,
        BigDecimal discountAmount,
        BigDecimal finalAmount,
        Long userVoucherId,
        String message
) {}
