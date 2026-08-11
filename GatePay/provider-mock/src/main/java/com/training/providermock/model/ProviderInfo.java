package com.training.providermock.model;

public record ProviderInfo(
        String code,
        String name,
        ProviderType type,
        String country,
        String hotline,
        String customerCodePrefix
) {}
