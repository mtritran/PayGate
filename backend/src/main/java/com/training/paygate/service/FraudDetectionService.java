package com.training.paygate.service;

import com.training.paygate.dto.request.PaymentRequest;
import com.training.paygate.entity.Account;
import com.training.paygate.entity.FraudLog;
import com.training.paygate.enums.OwnerType;
import com.training.paygate.repository.AccountRepository;
import com.training.paygate.repository.FraudLogRepository;
import lombok.Builder;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalTime;
import java.time.ZonedDateTime;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedQueue;

@Service
@RequiredArgsConstructor
@Slf4j
public class FraudDetectionService {

    public enum RiskLevel {
        LOW,        // Score 0 - 29: Normal transaction
        MEDIUM,     // Score 30 - 50: Minor anomaly, logged for audit
        HIGH,       // Score 51 - 75: High risk, requires extra confirmation / OTP
        CRITICAL    // Score 76 - 100: Severe fraud risk, blocked immediately
    }

    public enum FraudAction {
        ALLOW,
        CHALLENGE_OTP,
        BLOCK_TEMPORARY
    }

    @Data
    @Builder
    public static class FraudAnalysisResult {
        private int riskScore;              // 0 to 100
        private RiskLevel riskLevel;
        private FraudAction actionTaken;
        private boolean suspicious;
        private String ruleTriggered;
        private String reason;
        private String recommendation;
    }

    @Data
    private static class TxRecord {
        private final long timestamp;
        private final BigDecimal amount;
        private final Long destAccountId;
    }

    private final FraudLogRepository fraudLogRepository;
    private final AccountRepository accountRepository;

    // In-memory sliding window history: username -> list of recent transactions in 5 minutes
    private final ConcurrentHashMap<String, ConcurrentLinkedQueue<TxRecord>> userTxHistory = new ConcurrentHashMap<>();

    private static final BigDecimal VERY_HIGH_AMOUNT = new BigDecimal("50000000");   // 50 Million VND
    private static final BigDecimal EXTREME_AMOUNT = new BigDecimal("200000000");   // 200 Million VND

    /**
     * Comprehensive Multi-Factor Risk Assessment Engine (0-100 Score Model)
     */
    public FraudAnalysisResult evaluatePayment(String username, Long userId, PaymentRequest request, String clientIp) {
        long now = System.currentTimeMillis();
        long windowStart5Min = now - (5 * 60 * 1000L); // 5 minutes window
        long windowStart1Min = now - (60 * 1000L);      // 1 minute window

        ConcurrentLinkedQueue<TxRecord> history = userTxHistory.computeIfAbsent(username, k -> new ConcurrentLinkedQueue<>());
        
        // Clean up records older than 5 minutes
        while (!history.isEmpty() && history.peek().getTimestamp() < windowStart5Min) {
            history.poll();
        }

        BigDecimal currentAmount = request.amount() != null ? request.amount() : BigDecimal.ZERO;
        int riskScore = 0;
        StringBuilder rulesTriggered = new StringBuilder();

        // --------------------------------------------------------------------
        // RULE 1: Rapid Transaction Velocity Check
        // --------------------------------------------------------------------
        long countIn1Min = history.stream().filter(r -> r.getTimestamp() >= windowStart1Min).count();
        long countIn5Min = history.size();

        if (countIn1Min >= 4) {
            riskScore += 45;
            rulesTriggered.append("[VELOCITY_BURST: >4 txs in 1 min] ");
        } else if (countIn5Min >= 8) {
            riskScore += 30;
            rulesTriggered.append("[HIGH_FREQUENCY: >8 txs in 5 min] ");
        }

        // --------------------------------------------------------------------
        // RULE 2: Transaction Amount Anomaly & Large Outflow
        // --------------------------------------------------------------------
        if (currentAmount.compareTo(EXTREME_AMOUNT) >= 0) {
            riskScore += 50;
            rulesTriggered.append("[EXTREME_AMOUNT: >=200M VND] ");
        } else if (currentAmount.compareTo(VERY_HIGH_AMOUNT) >= 0) {
            riskScore += 30;
            rulesTriggered.append("[LARGE_AMOUNT: >=50M VND] ");
        }

        // --------------------------------------------------------------------
        // RULE 3: Sudden Balance Depletion Check (>80% of main balance in 1 tx)
        // --------------------------------------------------------------------
        if (userId != null) {
            Optional<Account> sourceAccOpt = accountRepository.findByOwnerIdAndOwnerType(userId, OwnerType.USER);
            if (sourceAccOpt.isPresent()) {
                BigDecimal balance = sourceAccOpt.get().getBalance();
                if (balance != null && balance.compareTo(BigDecimal.ZERO) > 0) {
                    BigDecimal ratio = currentAmount.divide(balance, 2, java.math.RoundingMode.HALF_UP);
                    if (ratio.compareTo(new BigDecimal("0.85")) >= 0) {
                        riskScore += 25;
                        rulesTriggered.append("[BALANCE_DEPLETION: >85% of wallet balance] ");
                    }
                }
            }
        }

        // --------------------------------------------------------------------
        // RULE 4: Off-Peak Night Time Activity (01:00 - 04:30 AM)
        // --------------------------------------------------------------------
        LocalTime time = LocalTime.now();
        if (time.isAfter(LocalTime.of(1, 0)) && time.isBefore(LocalTime.of(4, 30))) {
            riskScore += 15;
            rulesTriggered.append("[NIGHT_BURST_WINDOW: 01:00-04:30 AM] ");
        }

        // --------------------------------------------------------------------
        // RULE 5: Repeated Transfers to Same Destination Account in Short Time
        // --------------------------------------------------------------------
        long sameDestCount = history.stream()
                .filter(r -> r.getDestAccountId() != null && r.getDestAccountId().equals(request.destAccountId()))
                .count();
        if (sameDestCount >= 3) {
            riskScore += 25;
            rulesTriggered.append("[REPEATED_DESTINATION: >3 txs to same account] ");
        }

        // Record current transaction attempt
        history.add(new TxRecord(now, currentAmount, request.destAccountId()));

        // Cap Risk Score at 100
        riskScore = Math.min(riskScore, 100);

        // Determine Risk Level & Action
        RiskLevel riskLevel;
        FraudAction action;
        boolean suspicious = false;

        if (riskScore >= 75) {
            riskLevel = RiskLevel.CRITICAL;
            action = FraudAction.BLOCK_TEMPORARY;
            suspicious = true;
        } else if (riskScore >= 45) {
            riskLevel = RiskLevel.HIGH;
            action = FraudAction.CHALLENGE_OTP;
            suspicious = true;
        } else if (riskScore >= 25) {
            riskLevel = RiskLevel.MEDIUM;
            action = FraudAction.ALLOW;
            suspicious = false;
        } else {
            riskLevel = RiskLevel.LOW;
            action = FraudAction.ALLOW;
            suspicious = false;
        }

        String ruleStr = rulesTriggered.length() > 0 ? rulesTriggered.toString().trim() : "NORMAL";

        // Persist Audit Log to database if riskScore >= 25
        if (riskScore >= 25) {
            try {
                FraudLog logEntity = FraudLog.builder()
                        .userId(userId)
                        .username(username)
                        .transactionRef(request.idempotencyKey())
                        .riskScore(riskScore)
                        .riskLevel(riskLevel.name())
                        .ruleTriggered(ruleStr)
                        .actionTaken(action.name())
                        .details(String.format("Giao dịch %s VND | Điểm rủi ro: %d/100 | Quy tắc: %s",
                                currentAmount.toPlainString(), riskScore, ruleStr))
                        .clientIp(clientIp)
                        .build();
                fraudLogRepository.save(logEntity);
                log.info("Saved Fraud Audit Log to DB for user={}: score={}/100, level={}", username, riskScore, riskLevel);
            } catch (Exception e) {
                log.error("Failed to persist Fraud Audit Log: {}", e.getMessage());
            }
        }

        return FraudAnalysisResult.builder()
                .riskScore(riskScore)
                .riskLevel(riskLevel)
                .actionTaken(action)
                .suspicious(suspicious)
                .ruleTriggered(ruleStr)
                .reason(suspicious ? "Hệ thống phát hiện dấu hiệu rủi ro cao: " + ruleStr : "Giao dịch an toàn.")
                .recommendation(suspicious ? "Vui lòng xác minh bổ sung hoặc chậm lại thao tác để bảo vệ tài khoản." : "Cho phép thực hiện giao dịch.")
                .build();
    }
}
