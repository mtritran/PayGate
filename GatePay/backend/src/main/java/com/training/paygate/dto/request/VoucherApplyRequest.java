package com.training.paygate.dto.request;

import com.training.paygate.enums.VoucherApplicableType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Builder;

import java.math.BigDecimal;

@Builder
public record VoucherApplyRequest(
        @NotBlank(message = "Voucher code is required")
        String voucherCode,

        @NotNull(message = "Original amount is required")
        @Positive(message = "Original amount must be positive")
        BigDecimal originalAmount,

        @NotNull(message = "Transaction type is required")
        VoucherApplicableType transactionType
) {}
