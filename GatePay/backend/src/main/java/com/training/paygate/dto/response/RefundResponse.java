package com.training.paygate.dto.response;

import java.math.BigDecimal;

public record RefundResponse(
        String refundId,
        String transactionRef,
        BigDecimal amountRefunded,
        String sourceType,
        int installmentsCancelled,
        String status
) {}
