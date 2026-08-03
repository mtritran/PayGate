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

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;
}
