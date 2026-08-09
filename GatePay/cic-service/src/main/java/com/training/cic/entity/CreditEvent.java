package com.training.cic.entity;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "cic_credit_events")
public class CreditEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "event_id", nullable = false, unique = true, length = 80)
    private String eventId;

    @Column(name = "event_type", nullable = false, length = 50)
    private String eventType;

    @Column(nullable = false, length = 50)
    private String provider;

    @Column(name = "customer_id", nullable = false)
    private Long customerId;

    @Column(name = "total_transactions", nullable = false)
    private long totalTransactions;

    @Column(name = "on_time_payments", nullable = false)
    private long onTimePayments;

    @Column(name = "missed_payments", nullable = false)
    private long missedPayments;

    @Column(name = "current_balance", nullable = false, precision = 15, scale = 2)
    private BigDecimal currentBalance;

    @Column(name = "used_credit", nullable = false, precision = 15, scale = 2)
    private BigDecimal usedCredit;

    @Column(name = "max_days_past_due", nullable = false)
    private int maxDaysPastDue;

    @Column(name = "active_bad_debt", nullable = false)
    private boolean activeBadDebt;

    @Column(name = "write_off", nullable = false)
    private boolean writeOff;

    @Column(name = "provider_fraud_reported", nullable = false)
    private boolean providerFraudReported;

    @Column(name = "occurred_at", nullable = false)
    private LocalDateTime occurredAt;

    @Column(name = "received_at", nullable = false, updatable = false)
    private LocalDateTime receivedAt;

    @PrePersist
    void onCreate() {
        receivedAt = LocalDateTime.now();
    }

    public static CreditEvent fromRequest(com.training.cic.dto.CreditEventRequest request) {
        CreditEvent event = new CreditEvent();
        event.eventId = request.eventId();
        event.eventType = request.eventType();
        event.provider = request.provider();
        event.customerId = request.customerId();
        event.totalTransactions = request.totalTransactions();
        event.onTimePayments = request.onTimePayments();
        event.missedPayments = request.missedPayments();
        event.currentBalance = request.currentBalance();
        event.usedCredit = request.usedCredit();
        event.maxDaysPastDue = request.maxDaysPastDue();
        event.activeBadDebt = request.activeBadDebt();
        event.writeOff = request.writeOff();
        event.providerFraudReported = request.providerFraudReported();
        event.occurredAt = request.occurredAt().toLocalDateTime();
        return event;
    }
}
