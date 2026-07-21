package com.training.paygate.dto.response;

import java.math.BigDecimal;

public record AccountBalanceResponse(
        Long accountId,
        BigDecimal balance,
        String currency
) {}
