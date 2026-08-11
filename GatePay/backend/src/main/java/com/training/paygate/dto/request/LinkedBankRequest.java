package com.training.paygate.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record LinkedBankRequest(
        @NotBlank(message = "Tên ngân hàng không được để trống")
        String bankName,

        @NotBlank(message = "Số tài khoản không được để trống")
        String accountNumber,

        @NotBlank(message = "Tên chủ tài khoản không được để trống")
        String accountHolder,

        @NotNull(message = "Hạn mức/Số dư không được để trống")
        BigDecimal balance,

        String iconType
) {}
