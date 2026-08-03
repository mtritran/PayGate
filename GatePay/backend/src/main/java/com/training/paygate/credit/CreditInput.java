package com.training.paygate.credit;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

/**
 * CreditInput — dữ liệu đầu vào thuần logic cho {@link CreditScoreService}.
 * Dùng model (POJO) đơn giản, độc lập với entity/repository, để service dễ test
 * và không phụ thuộc vào nguồn dữ liệu (có thể lấp từ ví, MarketPlace, ...).
 *
 * Vai trò: "Tình hình tài chính lịch sử của 1 khách hàng" được dùng để chấm điểm.
 */
@Data
@Builder
public class CreditInput {

    /** Tổng số giao dịch thanh toán đã thực hiện (mua/trả). */
    private long totalTransactions;

    /** Tổng số lần trả nợ đúng hạn (BNPL / loan / installments). */
    private long onTimePayments;

    /** Tổng số lần trễ hạn hoặc bỏ lỡ thanh toán. */
    private long missedPayments;

    /** Số dư ví hiện tại (đại diện sức khỏe "chi tiêu") - để tính tỉ lệ thấu chi. */
    private BigDecimal currentBalance;

    /** Tổng hạn mức tín dụng được duyệt (nếu có). */
    private BigDecimal usedCredit;

    /** 0-100 từ FraudDetectionService (điểm chống gian lận — dùng làm 1 đầu vào phụ). */
    private Integer fraudScore;
}