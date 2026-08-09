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
@Table(name = "bnpl_profiles")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BnplProfile extends BaseEntity {

    @Column(name = "user_id", nullable = false, unique = true)
    private Long userId;

    @Column(name = "occupation", length = 120)
    private String occupation;

    @Column(name = "company_name", length = 160)
    private String companyName;

    @Column(name = "monthly_income", precision = 15, scale = 2)
    private BigDecimal monthlyIncome;

    @Column(name = "relative1_name", length = 120)
    private String relative1Name;

    @Column(name = "relative1_phone", length = 30)
    private String relative1Phone;

    @Column(name = "relative1_relationship", length = 60)
    private String relative1Relationship;

    @Column(name = "relative2_name", length = 120)
    private String relative2Name;

    @Column(name = "relative2_phone", length = 30)
    private String relative2Phone;

    @Column(name = "relative2_relationship", length = 60)
    private String relative2Relationship;

    @Column(name = "credit_score")
    private Integer creditScore;

    @Column(name = "risk_grade", length = 20)
    private String riskGrade;

    @Column(name = "approved_limit", precision = 15, scale = 2)
    private BigDecimal approvedLimit;

    @Column(name = "assessment_reason", length = 80)
    private String assessmentReason;
}
