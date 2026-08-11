package com.training.paygate.dto.response;

import java.time.LocalDateTime;

public record BeneficiaryResponse(
        Long id,
        Long userId,
        Long beneficiaryUserId,
        String accountNumber,
        String accountHolderName,
        String nickName,
        String bankName,
        LocalDateTime createdAt
) {}
