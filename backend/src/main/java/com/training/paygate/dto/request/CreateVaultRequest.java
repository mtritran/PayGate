package com.training.paygate.dto.request;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

public record CreateVaultRequest(
        @NotBlank(message = "Vault name is required")
        @Size(max = 100, message = "Name must not exceed 100 characters")
        String name,

        @Size(max = 500, message = "Description must not exceed 500 characters")
        String description,

        @NotNull(message = "Target amount is required")
        @Positive(message = "Target amount must be greater than zero")
        BigDecimal targetAmount,

        @Future(message = "Deadline must be in the future")
        LocalDate deadline
) {}
