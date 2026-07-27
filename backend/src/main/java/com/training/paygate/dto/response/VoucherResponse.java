package com.training.paygate.dto.response;

import com.training.paygate.enums.VoucherApplicableType;
import lombok.Builder;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Builder
public record VoucherResponse(
        Long id,
        String code,
        String title,
        BigDecimal discountAmount,
        Integer pointsRequired,
        BigDecimal minOrderAmount,
        VoucherApplicableType applicableType,
        Integer totalQuantity,
        Integer remainingQty,
        LocalDateTime expiresAt,
        LocalDateTime createdAt
) {}
