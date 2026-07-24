package com.training.paygate.dto.request;

import com.training.paygate.enums.RecurringStatus;
import jakarta.validation.constraints.NotNull;

public record UpdateRecurringPaymentStatusRequest(
        @NotNull RecurringStatus status
) {}
