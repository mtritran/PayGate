package com.training.tpbank.entity;

import com.training.tpbank.enums.BankAccountStatus;
import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "tpbank_bank_accounts")
public class BankAccount {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "borrower_id", nullable = false)
    private Borrower borrower;

    @Column(name = "account_number", nullable = false, unique = true, length = 30)
    private String accountNumber;

    @Column(name = "account_type", nullable = false, length = 30)
    private String accountType;

    @Column(name = "current_balance", nullable = false, precision = 15, scale = 2)
    private BigDecimal currentBalance = BigDecimal.ZERO;

    @Column(name = "average_monthly_inflow", nullable = false, precision = 15, scale = 2)
    private BigDecimal averageMonthlyInflow = BigDecimal.ZERO;

    @Column(name = "average_monthly_outflow", nullable = false, precision = 15, scale = 2)
    private BigDecimal averageMonthlyOutflow = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private BankAccountStatus status = BankAccountStatus.ACTIVE;

    @Column(name = "opened_at")
    private LocalDateTime openedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public BigDecimal getCurrentBalance() {
        return currentBalance;
    }
}
