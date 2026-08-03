package com.training.paygate.entity;

import com.training.paygate.enums.VoucherApplicableType;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "vouchers")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Voucher extends BaseEntity {

    @Column(nullable = false, unique = true, length = 50)
    private String code;

    @Column(nullable = false, length = 150)
    private String title;

    @Column(name = "discount_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal discountAmount;

    @Column(name = "points_required", nullable = false)
    private Integer pointsRequired;

    @Column(name = "min_order_amount", nullable = false, precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal minOrderAmount = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(name = "applicable_type", nullable = false, length = 30)
    @Builder.Default
    private VoucherApplicableType applicableType = VoucherApplicableType.ALL;

    @Column(name = "total_quantity", nullable = false)
    private Integer totalQuantity;

    @Column(name = "remaining_qty", nullable = false)
    private Integer remainingQty;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;
}
