package com.training.paygate.credit;

import java.math.BigDecimal;
import java.util.Optional;

/**
 * CreditScoreService — đánh giá mức tín nhiệm dài hạn (kiểu CIC) cho 1 khách hàng.
 * Khác FraudDetectionService: Fraud chấm từng giao dịch realtime (ALLOW/CHALLENGE/BLOCK),
 * còn đây chấm "lý lịch tài chính" của con người để quyết hạn mức BNPL / vay merchant / ưu đãi.
 */
public interface CreditScoreService {

    /**
     * Chấm điểm tín dụng từ {@link CreditInput}, lưu xuống DB và trả về kết quả mới nhất.
     */
    CreditScore evaluateAndSave(Long userId, String username, CreditInput input);

    /**
     * Chấm điểm mà KHÔNG lưu — dùng khi chỉ muốn thử/ước tính.
     */
    CreditScore evaluateOnly(CreditInput input);

    /**
     * Lấy điểm gần nhất đã lưu của khách, {@link Optional#empty()} nếu chưa từng ghi.
     */
    Optional<CreditScore> getLatest(Long userId);

    /**
     * Map 0-100 -> Tier.
     */
    String toTier(int score);
}