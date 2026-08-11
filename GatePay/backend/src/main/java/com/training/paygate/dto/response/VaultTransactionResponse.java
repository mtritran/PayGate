package com.training.paygate.dto.response;

import java.math.BigDecimal;

public record VaultTransactionResponse(
        String transactionRef,
        BigDecimal amount,
        BigDecimal vaultBalance,
        String status
) {}
