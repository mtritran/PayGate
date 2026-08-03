package com.training.paygate.dto.response;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record BillPayResponse(
        Long billId,
        String status,
        BigDecimal originalAmount,
        BigDecimal discountAmount,
        BigDecimal paidAmount,
        String transactionRef,
        LocalDateTime paidAt
) {}
