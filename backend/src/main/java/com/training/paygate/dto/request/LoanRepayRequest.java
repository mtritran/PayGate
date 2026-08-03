package com.training.paygate.dto.request;

import com.training.paygate.enums.RepayType;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;

@Builder
public record LoanRepayRequest(
        @NotNull(message = "Repay type is required")
        RepayType repayType
) {}
