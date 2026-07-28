package com.training.paygate.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record PinVerifyRequest(
        @NotBlank(message = "PIN code is required")
        @Pattern(regexp = "^\\d{6}$", message = "PIN code must be exactly 6 numeric digits")
        String pin
) {}
