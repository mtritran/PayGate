package com.training.paygate.dto.request;

import jakarta.validation.constraints.NotBlank;

public record CheckoutProcessRequest(
        @NotBlank(message = "Token thanh toán là bắt buộc")
        String token,

        @NotBlank(message = "Mã OTP là bắt buộc")
        String otpCode
) {}
