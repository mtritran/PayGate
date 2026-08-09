package com.training.paygate.dto.response;

import java.math.BigDecimal;

public record BnplProposalResponse(
        String proposalRef,
        String checkoutToken,
        Long customerId,
        BigDecimal financedAmount,
        BigDecimal upfrontAmount,
        Integer tenorMonths,
        BigDecimal monthlyInstallment,
        String status,
        String loanRef,
        String transactionRef
) {
}
