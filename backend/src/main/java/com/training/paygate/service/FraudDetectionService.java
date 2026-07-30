package com.training.paygate.service;

import com.training.paygate.dto.request.PaymentRequest;
import lombok.Builder;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedQueue;

@Service
@RequiredArgsConstructor
@Slf4j
public class FraudDetectionService {

    public enum RiskLevel {
        LOW, MEDIUM, HIGH, CRITICAL
    }

    @Data
    @Builder
    public static class FraudAnalysisResult {
        private RiskLevel riskLevel;
        private boolean suspicious;
        private String reason;
        private String recommendation;
    }

    @Data
    private static class TransactionAttempt {
        private final long timestamp;
        private final BigDecimal amount;
    }

    // Tracks recent transactions per user: username -> list of recent attempts in 60s
    private final ConcurrentHashMap<String, ConcurrentLinkedQueue<TransactionAttempt>> userTxHistory = new ConcurrentHashMap<>();

    // Threshold: > 50,000,000 VND in a single tx is flagged HIGH
    private static final BigDecimal HIGH_AMOUNT_THRESHOLD = new BigDecimal("50000000");

    /**
     * Analyzes an incoming payment request in real-time before DB execution.
     */
    public FraudAnalysisResult evaluatePayment(String username, PaymentRequest request) {
        long now = System.currentTimeMillis();
        long windowStart = now - 60_000L; // 60 seconds window

        ConcurrentLinkedQueue<TransactionAttempt> attempts = userTxHistory.computeIfAbsent(username, k -> new ConcurrentLinkedQueue<>());
        
        // Remove stale attempts older than 60s
        while (!attempts.isEmpty() && attempts.peek().getTimestamp() < windowStart) {
            attempts.poll();
        }

        int countInLastMinute = attempts.size();
        BigDecimal currentAmount = request.amount() != null ? request.amount() : BigDecimal.ZERO;

        // 1. Check for rapid burst transactions (> 5 transactions in 60s)
        if (countInLastMinute >= 5) {
            log.warn("SUSPICIOUS FRAUD: Rapid transaction burst for user={}: {} txs in 60s", username, countInLastMinute + 1);
            return FraudAnalysisResult.builder()
                    .riskLevel(RiskLevel.HIGH)
                    .suspicious(true)
                    .reason("Phát hiện tần suất giao dịch bất thường trong thời gian ngắn (Burst Payment).")
                    .recommendation("Cần kiểm tra xác thực sinh trắc học hoặc OTP trước khi phê duyệt.")
                    .build();
        }

        // 2. Check for unusually large single transaction (> 50,000,000 VND)
        if (currentAmount.compareTo(HIGH_AMOUNT_THRESHOLD) > 0) {
            log.warn("SUSPICIOUS FRAUD: High amount transaction for user={}: {} VND", username, currentAmount);
            return FraudAnalysisResult.builder()
                    .riskLevel(RiskLevel.MEDIUM)
                    .suspicious(false)
                    .reason("Giao dịch giá trị lớn vượt mức thông thường (> 50,000,000 VND).")
                    .recommendation("Hệ thống áp dụng cảnh báo an ninh nâng cao.")
                    .build();
        }

        // Record attempt
        attempts.add(new TransactionAttempt(now, currentAmount));

        return FraudAnalysisResult.builder()
                .riskLevel(RiskLevel.LOW)
                .suspicious(false)
                .reason("Giao dịch an toàn.")
                .recommendation("Cho phép thực hiện giao dịch.")
                .build();
    }
}
