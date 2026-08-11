package com.training.cic.entity;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "cic_credit_assessments")
public class CreditAssessment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "assessment_ref", nullable = false, unique = true, length = 80)
    private String assessmentRef;

    @Column(name = "customer_id", nullable = false)
    private Long customerId;

    @Column(name = "requested_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal requestedAmount;

    @Column(length = 50)
    private String plan;

    @Column(nullable = false)
    private boolean approved;

    private Integer score;

    @Column(nullable = false, length = 20)
    private String tier;

    @Column(name = "approved_limit", nullable = false, precision = 15, scale = 2)
    private BigDecimal approvedLimit;

    @Column(name = "max_loan_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal maxLoanAmount;

    @Column(name = "suggested_upfront_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal suggestedUpfrontAmount;

    @Column(nullable = false, length = 80)
    private String reason;

    @Column(name = "model_version", nullable = false, length = 30)
    private String modelVersion;

    @Column(name = "rule_version", nullable = false, length = 30)
    private String ruleVersion;

    @Column(name = "assessed_at", nullable = false)
    private LocalDateTime assessedAt;

    public static CreditAssessment create(
            String assessmentRef,
            Long customerId,
            BigDecimal requestedAmount,
            String plan,
            boolean approved,
            int score,
            String tier,
            BigDecimal approvedLimit,
            BigDecimal maxLoanAmount,
            BigDecimal suggestedUpfrontAmount,
            String reason
    ) {
        CreditAssessment assessment = new CreditAssessment();
        assessment.assessmentRef = assessmentRef;
        assessment.customerId = customerId;
        assessment.requestedAmount = requestedAmount;
        assessment.plan = plan;
        assessment.approved = approved;
        assessment.score = score;
        assessment.tier = tier;
        assessment.approvedLimit = approvedLimit;
        assessment.maxLoanAmount = maxLoanAmount;
        assessment.suggestedUpfrontAmount = suggestedUpfrontAmount;
        assessment.reason = reason;
        assessment.modelVersion = "scorecard-v1";
        assessment.ruleVersion = "rules-v1";
        assessment.assessedAt = LocalDateTime.now();
        return assessment;
    }
}
