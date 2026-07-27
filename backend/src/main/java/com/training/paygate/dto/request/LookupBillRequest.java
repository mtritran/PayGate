package com.training.paygate.dto.request;

import jakarta.validation.constraints.NotBlank;

public record LookupBillRequest(
        @NotBlank(message = "Provider code is required")
        String providerCode,

        @NotBlank(message = "Customer code is required")
        String customerCode
) {}
