package com.training.paygate.integration.provider;

import java.math.BigDecimal;

public record ProviderRegisterRequest(
        String providerCode,
        String customerName,
        String address,
        BigDecimal cycleAmount
) {}
