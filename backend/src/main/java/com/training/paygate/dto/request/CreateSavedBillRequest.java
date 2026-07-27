package com.training.paygate.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateSavedBillRequest(
        @NotBlank(message = "Provider code is required")
        String providerCode,

        @NotBlank(message = "Customer code is required")
        String customerCode,

        @Size(max = 100)
        String nickname
) {}
