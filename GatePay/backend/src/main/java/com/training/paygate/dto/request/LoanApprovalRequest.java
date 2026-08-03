package com.training.paygate.dto.request;

import lombok.Builder;

@Builder
public record LoanApprovalRequest(
        String adminNote
) {}
