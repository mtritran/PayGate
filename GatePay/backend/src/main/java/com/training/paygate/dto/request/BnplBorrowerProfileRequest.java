package com.training.paygate.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

import java.math.BigDecimal;

public record BnplBorrowerProfileRequest(
        @NotBlank
        String fullName,

        @NotBlank
        String occupation,

        @NotBlank
        String companyName,

        @NotNull
        @DecimalMin("0")
        BigDecimal monthlyIncome,

        @NotBlank
        String relative1Name,

        @NotBlank
        @Pattern(regexp = "^(0|\\+84)[3|5|7|8|9][0-9]{8}$", message = "Phone number is invalid")
        String relative1Phone,

        @NotBlank
        String relative1Relationship,

        @NotBlank
        String relative2Name,

        @NotBlank
        @Pattern(regexp = "^(0|\\+84)[3|5|7|8|9][0-9]{8}$", message = "Phone number is invalid")
        String relative2Phone,

        @NotBlank
        String relative2Relationship
) {
}
