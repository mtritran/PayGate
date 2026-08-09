package com.training.paygate.dto.client;

import java.math.BigDecimal;

public record CicCreditCheckRequest(
        Long customerId,
        BigDecimal requestedAmount,
        String plan
) {
}
