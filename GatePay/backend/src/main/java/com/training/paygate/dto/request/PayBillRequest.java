package com.training.paygate.dto.request;

import jakarta.validation.constraints.NotNull;

public record PayBillRequest(
        @NotNull(message = "Bill ID is required")
        Long billId,

        String voucherCode
) {}
