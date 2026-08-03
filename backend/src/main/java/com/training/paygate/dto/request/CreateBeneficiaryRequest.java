package com.training.paygate.dto.request;

import jakarta.validation.constraints.NotBlank;

public record CreateBeneficiaryRequest(
        @NotBlank(message = "Account number is required")
        String accountNumber,

        @NotBlank(message = "Account holder name is required")
        String accountHolderName,

        String nickName,

        String bankName
) {}
