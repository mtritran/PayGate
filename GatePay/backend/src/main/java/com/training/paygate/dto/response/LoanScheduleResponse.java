package com.training.paygate.dto.response;

import com.training.paygate.enums.LoanScheduleStatus;
import lombok.Builder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Builder
public record LoanScheduleResponse(
        Long id,
        Integer periodNumber,
        BigDecimal amountDue,
        LocalDate dueDate,
        LoanScheduleStatus status,
        LocalDateTime paidAt,
        String transactionRef
) {}
