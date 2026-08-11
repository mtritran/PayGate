package com.training.paygate.dto.response;

import com.training.paygate.enums.LoanStatus;
import lombok.Builder;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Builder
public record LoanResponse(
        Long id,
        String loanRef,
        BigDecimal amount,
        BigDecimal interestRate,
        Integer termMonths,
        BigDecimal monthlyAmount,
        BigDecimal totalRepayable,
        BigDecimal remainingAmount,
        String reason,
        LoanStatus status,
        String adminNote,
        LocalDateTime disbursedAt,
        LocalDateTime createdAt,
        List<LoanScheduleResponse> schedules
) {}
