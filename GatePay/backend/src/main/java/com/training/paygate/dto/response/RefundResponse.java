package com.training.paygate.dto.response;

import com.training.paygate.enums.RefundStatus;

import java.math.BigDecimal;

public record RefundResponse(
        String refundId,
        String transactionRef,
        BigDecimal amountRefunded,
        String sourceType,
        int installmentsCancelled,
        RefundStatus status
) {}
