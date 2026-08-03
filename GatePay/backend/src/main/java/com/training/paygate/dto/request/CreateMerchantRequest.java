package com.training.paygate.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record CreateMerchantRequest(
        @NotNull(message = "User ID is required")
        Long userId,

        @NotBlank(message = "Merchant name is required")
        @Size(max = 255, message = "Merchant name must not exceed 255 characters")
        String merchantName,

        @NotBlank(message = "Merchant code is required")
        @Size(max = 50, message = "Merchant code must not exceed 50 characters")
        String merchantCode,

        @Pattern(regexp = "^(https?://.+)?$", message = "Webhook URL must be a valid URL")
        @Size(max = 500, message = "Webhook URL must not exceed 500 characters")
        String webhookUrl
) {}
