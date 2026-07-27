package com.training.paygate.dto.request;

import com.training.paygate.enums.BillSubscriptionFrequency;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;

public record CreateBillSubscriptionRequest(
        @NotBlank String providerCode,
        @NotBlank String customerName,
        @NotBlank String address,
        @NotNull @Positive BigDecimal cycleAmount,
        @NotNull BillSubscriptionFrequency frequency
) {}
