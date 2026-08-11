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
import java.time.LocalDateTime;

@Entity
@Table(name = "checkout_sessions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CheckoutSession extends BaseEntity {

    @Column(name = "token", nullable = false, unique = true, length = 100)
    private String token;

    @Column(name = "merchant_id", nullable = false)
    private Long merchantId;

    @Column(name = "merchant_code", nullable = false, length = 50)
    private String merchantCode;

    @Column(name = "merchant_name", nullable = false)
    private String merchantName;

    @Column(name = "order_id", nullable = false, length = 100)
    private String orderId;

    @Column(name = "amount", nullable = false, precision = 19, scale = 2)
    private BigDecimal amount;

    @Column(name = "method", length = 30)
    private String method;

    @Column(name = "upfront_amount", precision = 15, scale = 2)
    private BigDecimal upfrontAmount;

    @Column(name = "finance_amount", precision = 15, scale = 2)
    private BigDecimal financeAmount;

    @Column(name = "customer_id")
    private Long customerId;

    @Column(name = "merchant_customer_ref", length = 100)
    private String merchantCustomerRef;

    @Column(name = "customer_email", length = 120)
    private String customerEmail;

    @Column(name = "customer_name", length = 120)
    private String customerName;

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

    @Column(name = "description", length = 500)
    private String description;

    @Column(name = "return_url", nullable = false, length = 500)
    private String returnUrl;

    @Column(name = "cancel_url", length = 500)
    private String cancelUrl;

    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private String status = "PENDING"; // PENDING, SUCCESS, EXPIRED, FAILED

    @Column(name = "transaction_ref", length = 100)
    private String transactionRef;

    @Column(name = "credit_score")
    private Integer creditScore;

    @Column(name = "risk_grade", length = 20)
    private String riskGrade;

    @Column(name = "approved_limit", precision = 15, scale = 2)
    private BigDecimal approvedLimit;

    @Column(name = "maximum_financed_amount", precision = 15, scale = 2)
    private BigDecimal maximumFinancedAmount;

    @Column(name = "assessment_reason", length = 80)
    private String assessmentReason;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;
}
