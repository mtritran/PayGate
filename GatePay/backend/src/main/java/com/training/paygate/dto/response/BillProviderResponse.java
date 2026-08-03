package com.training.paygate.dto.response;

public record BillProviderResponse(
        Long id,
        String code,
        String name,
        String type
) {}
