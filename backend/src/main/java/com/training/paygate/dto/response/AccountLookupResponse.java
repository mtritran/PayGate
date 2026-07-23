package com.training.paygate.dto.response;

import com.training.paygate.enums.AccountStatus;
import com.training.paygate.enums.OwnerType;

public record AccountLookupResponse(
        Long accountId,
        String accountNumber,
        String ownerName,
        OwnerType ownerType,
        AccountStatus status
) {}
