package com.training.paygate.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Entity
@Table(name = "bnpl_proposals")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BnplProposal extends BaseEntity {

    @Column(name = "proposal_ref", nullable = false, unique = true, length = 80)
    private String proposalRef;

    @Column(name = "checkout_token", nullable = false, length = 100)
    private String checkoutToken;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "merchant_id", nullable = false)
    private Long merchantId;

    @Column(name = "financed_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal financedAmount;

    @Column(name = "upfront_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal upfrontAmount;

    @Column(name = "tenor_months", nullable = false)
    private Integer tenorMonths;

    @Column(name = "monthly_installment", nullable = false, precision = 15, scale = 2)
    private BigDecimal monthlyInstallment;

    @Column(nullable = false, length = 30)
    private String status;

    @Column(name = "loan_id")
    private Long loanId;

    @Column(name = "transaction_ref", length = 50)
    private String transactionRef;
}
