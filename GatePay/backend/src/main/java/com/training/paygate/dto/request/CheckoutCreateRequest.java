package com.training.paygate.dto.request;

import com.fasterxml.jackson.annotation.JsonAlias;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record CheckoutCreateRequest(
        @Schema(hidden = true)
        String apiKey,

        @NotBlank(message = "Order ID is required")
        String orderId,

        @NotNull(message = "Payment amount is required")
        @DecimalMin(value = "1000", message = "Minimum payment amount is 1,000 VND")
        @JsonAlias("totalAmount")
        BigDecimal amount,

        String method,

        @DecimalMin(value = "0", message = "Upfront amount cannot be negative")
        BigDecimal upfrontAmount,

        @DecimalMin(value = "0", message = "Finance amount cannot be negative")
        BigDecimal financeAmount,

        String merchantCustomerRef,

        String customerName,

        String description,

        @NotBlank(message = "Return URL is required")
        String returnUrl,

        String cancelUrl
) {
    public CheckoutCreateRequest(
            String apiKey,
            String orderId,
            BigDecimal amount,
            String description,
            String returnUrl,
            String cancelUrl
    ) {
        this(apiKey, orderId, amount, null, null, null, null, null, description, returnUrl, cancelUrl);
    }
}
