package com.training.paygate.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record CheckoutCreateRequest(
        @NotBlank(message = "API Key là bắt buộc")
        String apiKey,

        @NotBlank(message = "Mã đơn hàng orderId là bắt buộc")
        String orderId,

        @NotNull(message = "Số tiền thanh toán là bắt buộc")
        @DecimalMin(value = "1000", message = "Số tiền thanh toán tối thiểu là 1,000 VND")
        BigDecimal amount,

        String description,

        String paymentMethod, // Optional: "PAYGATE" or "VIETQR"

        @NotBlank(message = "returnUrl là bắt buộc")
        String returnUrl,

        String cancelUrl
) {}
