package com.training.cic.entity;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "cic_credit_profiles")
public class CreditProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "customer_id", nullable = false, unique = true)
    private Long customerId;

    @Column(name = "total_transactions", nullable = false)
    private long totalTransactions;

    @Column(name = "on_time_payments", nullable = false)
    private long onTimePayments;

    @Column(name = "missed_payments", nullable = false)
    private long missedPayments;

    @Column(name = "current_balance", nullable = false, precision = 15, scale = 2)
    private BigDecimal currentBalance = BigDecimal.ZERO;

    @Column(name = "used_credit", nullable = false, precision = 15, scale = 2)
    private BigDecimal usedCredit = BigDecimal.ZERO;

    @Column(name = "max_days_past_due", nullable = false)
    private int maxDaysPastDue;

    @Column(name = "active_bad_debt", nullable = false)
    private boolean activeBadDebt;

    @Column(name = "write_off", nullable = false)
    private boolean writeOff;

    @Column(name = "provider_fraud_reported", nullable = false)
    private boolean providerFraudReported;

    @Column(name = "data_as_of", nullable = false)
    private LocalDateTime dataAsOf;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        createdAt = now;
        updatedAt = now;
        if (dataAsOf == null) {
            dataAsOf = now;
        }
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public void applySnapshot(
            Long customerId,
            long totalTransactions,
            long onTimePayments,
            long missedPayments,
            BigDecimal currentBalance,
            BigDecimal usedCredit,
            int maxDaysPastDue,
            boolean activeBadDebt,
            boolean writeOff,
            boolean providerFraudReported,
            LocalDateTime dataAsOf
    ) {
        this.customerId = customerId;
        this.totalTransactions = totalTransactions;
        this.onTimePayments = onTimePayments;
        this.missedPayments = missedPayments;
        this.currentBalance = currentBalance != null ? currentBalance : BigDecimal.ZERO;
        this.usedCredit = usedCredit != null ? usedCredit : BigDecimal.ZERO;
        this.maxDaysPastDue = maxDaysPastDue;
        this.activeBadDebt = activeBadDebt;
        this.writeOff = writeOff;
        this.providerFraudReported = providerFraudReported;
        this.dataAsOf = dataAsOf != null ? dataAsOf : LocalDateTime.now();
    }

    public Long getCustomerId() {
        return customerId;
    }

    public long getTotalTransactions() {
        return totalTransactions;
    }

    public long getOnTimePayments() {
        return onTimePayments;
    }

    public long getMissedPayments() {
        return missedPayments;
    }

    public BigDecimal getCurrentBalance() {
        return currentBalance;
    }

    public BigDecimal getUsedCredit() {
        return usedCredit;
    }

    public int getMaxDaysPastDue() {
        return maxDaysPastDue;
    }

    public boolean isActiveBadDebt() {
        return activeBadDebt;
    }

    public boolean isWriteOff() {
        return writeOff;
    }

    public boolean isProviderFraudReported() {
        return providerFraudReported;
    }
}
