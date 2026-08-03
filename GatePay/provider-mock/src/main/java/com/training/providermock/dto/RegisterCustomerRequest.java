package com.training.providermock.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;

public record RegisterCustomerRequest(
        @NotBlank String providerCode,
        @NotBlank String customerName,
        @NotBlank String address,
        @NotNull @Positive BigDecimal cycleAmount
) {}
