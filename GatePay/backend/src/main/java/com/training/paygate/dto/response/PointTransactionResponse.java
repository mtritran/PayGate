package com.training.paygate.dto.response;

import com.training.paygate.enums.PointTransactionType;
import lombok.Builder;

import java.time.LocalDateTime;

@Builder
public record PointTransactionResponse(
        Long id,
        Integer points,
        PointTransactionType type,
        String description,
        String transactionRef,
        LocalDateTime createdAt
) {}
