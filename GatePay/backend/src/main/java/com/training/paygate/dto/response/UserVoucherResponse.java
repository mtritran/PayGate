package com.training.paygate.dto.response;

import com.training.paygate.enums.UserVoucherStatus;
import com.training.paygate.enums.VoucherApplicableType;
import lombok.Builder;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Builder
public record UserVoucherResponse(
        Long userVoucherId,
        Long voucherId,
        String voucherCode,
        String title,
        BigDecimal discountAmount,
        Integer pointsRequired,
        BigDecimal minOrderAmount,
        VoucherApplicableType applicableType,
        UserVoucherStatus status,
        LocalDateTime redeemedAt,
        LocalDateTime usedAt,
        LocalDateTime expiresAt
) {}
