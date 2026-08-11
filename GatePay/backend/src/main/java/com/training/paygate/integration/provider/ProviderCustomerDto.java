package com.training.paygate.integration.provider;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.math.BigDecimal;

@JsonIgnoreProperties(ignoreUnknown = true)
public record ProviderCustomerDto(
        String customerCode,
        String customerName,
        String address,
        String providerCode,
        String type,
        BigDecimal cycleAmount,
        String registeredAt
) {}
