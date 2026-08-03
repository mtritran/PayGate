package com.training.paygate.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Builder;

@Builder
public record VoucherRedeemRequest(
        @NotNull(message = "Voucher ID is required")
        Long voucherId
) {}
