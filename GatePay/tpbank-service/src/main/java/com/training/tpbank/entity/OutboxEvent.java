package com.training.tpbank.entity;

import com.training.tpbank.enums.OutboxStatus;
import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "tpbank_outbox_events")
public class OutboxEvent {

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

    @Column(name = "payload_json", nullable = false, columnDefinition = "TEXT")
    private String payloadJson;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private OutboxStatus status = OutboxStatus.PENDING;

    @Column(nullable = false)
    private int attempts;

    @Column(name = "last_error", length = 1000)
    private String lastError;

    @Column(name = "next_attempt_at", nullable = false)
    private LocalDateTime nextAttemptAt;

    @Column(name = "sent_at")
    private LocalDateTime sentAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    protected OutboxEvent() {
    }

    public OutboxEvent(String eventId, String eventType, String provider, Long customerId, String payloadJson) {
        this.eventId = eventId;
        this.eventType = eventType;
        this.provider = provider;
        this.customerId = customerId;
        this.payloadJson = payloadJson;
        this.status = OutboxStatus.PENDING;
        this.nextAttemptAt = LocalDateTime.now();
    }

    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        createdAt = now;
        updatedAt = now;
        if (nextAttemptAt == null) {
            nextAttemptAt = now;
        }
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public void markSent() {
        status = OutboxStatus.SENT;
        sentAt = LocalDateTime.now();
        lastError = null;
    }

    public void markFailed(String error) {
        status = OutboxStatus.FAILED;
        attempts++;
        lastError = error != null && error.length() > 1000 ? error.substring(0, 1000) : error;
        nextAttemptAt = LocalDateTime.now().plusSeconds(Math.min(60, attempts * 5L));
    }

    public void retry() {
        status = OutboxStatus.PENDING;
    }

    public Long getId() {
        return id;
    }

    public String getEventId() {
        return eventId;
    }

    public String getPayloadJson() {
        return payloadJson;
    }

    public OutboxStatus getStatus() {
        return status;
    }

    public int getAttempts() {
        return attempts;
    }
}
