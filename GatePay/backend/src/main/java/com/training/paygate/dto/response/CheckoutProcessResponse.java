package com.training.paygate.dto.response;

public record CheckoutProcessResponse(
        String transactionRef,
        String redirectUrl
) {}
