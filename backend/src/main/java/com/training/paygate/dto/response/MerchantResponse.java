package com.training.paygate.dto.response;

import java.time.LocalDateTime;

public record MerchantResponse(
        Long id,
        Long userId,
        String merchantName,
        String merchantCode,
        String apiKey,
        String webhookUrl,
        boolean active,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {}
