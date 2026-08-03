package com.training.paygate.entity;

import com.training.paygate.enums.BillSubscriptionFrequency;
import com.training.paygate.enums.BillSubscriptionStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "bill_subscriptions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BillSubscription extends BaseEntity {

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "provider_id", nullable = false)
    private Long providerId;

    @Column(name = "customer_code", nullable = false, length = 50)
    private String customerCode;

    @Column(name = "customer_name", nullable = false, length = 100)
    private String customerName;

    @Column(length = 255)
    private String address;

    @Column(name = "cycle_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal cycleAmount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private BillSubscriptionFrequency frequency;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private BillSubscriptionStatus status;

    @Column(name = "next_bill_at", nullable = false)
    private LocalDateTime nextBillAt;

    @Column(name = "last_bill_at")
    private LocalDateTime lastBillAt;
}
