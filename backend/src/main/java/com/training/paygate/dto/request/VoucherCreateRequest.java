package com.training.paygate.dto.request;

import com.training.paygate.enums.VoucherApplicableType;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Builder;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Builder
public record VoucherCreateRequest(
        @NotBlank(message = "Voucher code is required")
        String code,

        @NotBlank(message = "Title is required")
        String title,

        @NotNull(message = "Discount amount is required")
        @Positive(message = "Discount amount must be positive")
        BigDecimal discountAmount,

        @NotNull(message = "Points required is mandatory")
        @Positive(message = "Points required must be positive")
        Integer pointsRequired,

        BigDecimal minOrderAmount,

        VoucherApplicableType applicableType,

        @NotNull(message = "Total quantity is required")
        @Positive(message = "Total quantity must be positive")
        Integer totalQuantity,

        @NotNull(message = "Expiration date is required")
        @Future(message = "Expiration date must be in the future")
        LocalDateTime expiresAt
) {}
