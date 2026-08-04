package com.training.paygate.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record CheckoutCreateRequest(
        @NotBlank(message = "API Key is required")
        String apiKey,

        @NotBlank(message = "Order ID is required")
        String orderId,

        @NotNull(message = "Payment amount is required")
        @DecimalMin(value = "1000", message = "Minimum payment amount is 1,000 VND")
        BigDecimal amount,

        String description,

        @NotBlank(message = "Return URL is required")
        String returnUrl,

        String cancelUrl
) {}
