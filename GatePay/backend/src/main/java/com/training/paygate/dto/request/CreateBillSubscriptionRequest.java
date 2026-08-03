package com.training.paygate.dto.request;

import com.training.paygate.enums.BillSubscriptionFrequency;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;

/**
 * Request to link a utility service account to PayGate.
 *
 * <p>Two modes:
 * <ul>
 *   <li><b>LINK_EXISTING</b>: User already has a provider customer code (printed on paper bill).
 *       Provide {@code providerCode} + {@code customerCode}. Other fields optional.</li>
 *   <li><b>REGISTER_NEW</b>: User wants a new service contract created with the provider.
 *       Provide {@code providerCode} + {@code customerName} + {@code address} + {@code cycleAmount}.</li>
 * </ul>
 */
public record CreateBillSubscriptionRequest(
        @NotBlank String providerCode,

        /** Non-null = LINK_EXISTING mode: look up this code in provider gateway */
        String customerCode,

        /** Required only for REGISTER_NEW mode */
        String customerName,

        /** Required only for REGISTER_NEW mode */
        String address,

        /** Required only for REGISTER_NEW mode */
        @Positive BigDecimal cycleAmount,

        @NotNull BillSubscriptionFrequency frequency
) {}
