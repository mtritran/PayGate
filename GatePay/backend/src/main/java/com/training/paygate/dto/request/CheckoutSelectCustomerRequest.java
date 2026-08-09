package com.training.paygate.dto.request;

import jakarta.validation.constraints.NotNull;

public record CheckoutSelectCustomerRequest(
        @NotNull
        Long customerId
) {
}
