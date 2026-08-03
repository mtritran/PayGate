package com.training.paygate.dto.response;

public record SavedBillResponse(
        Long id,
        Long providerId,
        String providerCode,
        String providerName,
        String providerType,
        String customerCode,
        String nickname
) {}
