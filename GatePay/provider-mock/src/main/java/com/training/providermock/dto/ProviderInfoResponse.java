package com.training.providermock.dto;

public record ProviderInfoResponse(
        String code,
        String name,
        String type,
        String country,
        String hotline
) {}
