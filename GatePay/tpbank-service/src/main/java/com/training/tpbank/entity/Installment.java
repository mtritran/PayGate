package com.training.tpbank.entity;

import com.training.tpbank.enums.InstallmentStatus;
import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "tpbank_installments")
public class Installment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "loan_id", nullable = false)
    private Loan loan;

    @Column(name = "installment_number", nullable = false)
    private Integer installmentNumber;

    @Column(name = "due_date", nullable = false)
    private LocalDate dueDate;

    @Column(name = "principal_due", nullable = false, precision = 15, scale = 2)
    private BigDecimal principalDue = BigDecimal.ZERO;

    @Column(name = "interest_due", nullable = false, precision = 15, scale = 2)
    private BigDecimal interestDue = BigDecimal.ZERO;

    @Column(name = "fee_due", nullable = false, precision = 15, scale = 2)
    private BigDecimal feeDue = BigDecimal.ZERO;

    @Column(name = "total_due", nullable = false, precision = 15, scale = 2)
    private BigDecimal totalDue = BigDecimal.ZERO;

    @Column(name = "paid_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal paidAmount = BigDecimal.ZERO;

    @Column(name = "paid_at")
    private LocalDateTime paidAt;

    @Column(name = "days_past_due", nullable = false)
    private Integer daysPastDue = 0;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private InstallmentStatus status = InstallmentStatus.PENDING;

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
}
