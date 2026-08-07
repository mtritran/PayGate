package com.training.paygate.dto.response;

/**
 * Response returned after customer completes OTP authentication for checkout.
 */
public record CheckoutProcessResponse(
        String transactionRef,
        String redirectUrl
) {}
