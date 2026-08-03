package com.training.paygate.dto.response;

import com.training.paygate.enums.MerchantStatus;
import java.time.LocalDateTime;

public record MerchantResponse(
        Long id,
        Long userId,
        String merchantName,
        String merchantCode,
        String apiKey,
        String webhookUrl,
        boolean active,
        MerchantStatus status,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public MerchantResponse(Long id, Long userId, String merchantName, String merchantCode, String apiKey, String webhookUrl, boolean active, LocalDateTime createdAt, LocalDateTime updatedAt) {
        this(id, userId, merchantName, merchantCode, apiKey, webhookUrl, active, active ? MerchantStatus.ACTIVE : MerchantStatus.REJECTED, createdAt, updatedAt);
    }
}
