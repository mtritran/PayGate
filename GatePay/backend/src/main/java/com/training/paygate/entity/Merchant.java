package com.training.paygate.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "merchants")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Merchant extends BaseEntity {

    @Column(name = "user_id", nullable = false, unique = true)
    private Long userId;

    @Column(name = "merchant_name", nullable = false)
    private String merchantName;

    @Column(name = "merchant_code", nullable = false, unique = true, length = 50)
    private String merchantCode;

    @Column(name = "api_key", nullable = false, unique = true)
    private String apiKey;

    @Column(name = "webhook_url", length = 500)
    private String webhookUrl;

    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;

    @jakarta.persistence.Enumerated(jakarta.persistence.EnumType.STRING)
    @Column(length = 20)
    @Builder.Default
    private com.training.paygate.enums.MerchantStatus status = com.training.paygate.enums.MerchantStatus.ACTIVE;
}
