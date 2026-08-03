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
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalTime;
import java.time.ZonedDateTime;
import java.util.Optional;
import java.util.Set;
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
    private final StringRedisTemplate redisTemplate;

    // In-memory sliding window fallback used when Redis is unreachable
    private final ConcurrentHashMap<String, ConcurrentLinkedQueue<TxRecord>> fallbackTxHistory = new ConcurrentHashMap<>();

    // In-memory per-day counter fallback used when Redis is unreachable
    private final ConcurrentHashMap<String, Long> fallbackDailyCounts = new ConcurrentHashMap<>();

    private static final String REDIS_PREFIX = "fraud:tx:";
    private static final String DAILY_PREFIX = "fraud:daily:";
    private static final long DAILY_TX_LIMIT = 20;
    private static final long DAILY_TTL_DAYS = 2;
    private static final long WINDOW_MINUTES = 5;
    private static final long WINDOW_MS = WINDOW_MINUTES * 60 * 1000L;

    private static final BigDecimal VERY_HIGH_AMOUNT = new BigDecimal("50000000");   // 50 Million VND
    private static final BigDecimal EXTREME_AMOUNT = new BigDecimal("200000000");   // 200 Million VND

    /**
     * Comprehensive Multi-Factor Risk Assessment Engine (0-100 Score Model)
     */
    public FraudAnalysisResult evaluatePayment(String username, Long userId, PaymentRequest request, String clientIp) {
        long now = System.currentTimeMillis();
        long windowStart5Min = now - WINDOW_MS;
        long windowStart1Min = now - (60 * 1000L);

        BigDecimal currentAmount = request.amount() != null ? request.amount() : BigDecimal.ZERO;
        int riskScore = 0;
        StringBuilder rulesTriggered = new StringBuilder();

        // --------------------------------------------------------------------
        // RULE 1: Rapid Transaction Velocity Check
        // --------------------------------------------------------------------
        long countIn1Min = countTxInWindow(username, windowStart1Min, now);
        long countIn5Min = countTxInWindow(username, windowStart5Min, now);

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
        long sameDestCount = countTxToDest(username, request.destAccountId(), windowStart5Min, now);
        if (sameDestCount >= 3) {
            riskScore += 25;
            rulesTriggered.append("[REPEATED_DESTINATION: >3 txs to same account] ");
        }

        // --------------------------------------------------------------------
        // RULE 6: Daily Transaction Volume Limit (Anti-Money-Laundering style)
        // Counts ALL payment attempts in the current calendar day (local server
        // date) to catch users who spread many small transactions across time
        // to dodge the 5-minute velocity window.
        // --------------------------------------------------------------------
        long dailyCount = getDailyTxCount(username);
        if (dailyCount >= DAILY_TX_LIMIT) {
            riskScore += 40;
            rulesTriggered.append("[DAILY_TX_LIMIT: >=20 txs in current day] ");
        }

        // Record current transaction attempt
        recordTx(username, now, currentAmount, request.destAccountId());
        incrementDailyTxCount(username);

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

    /**
     * Counts transactions in a time window [windowStart, now] for a user.
     * Uses Redis ZSET when available, otherwise in-memory fallback.
     */
    private long countTxInWindow(String username, long windowStart, long now) {
        String key = REDIS_PREFIX + username;
        try {
            if (redisTemplate != null && redisTemplate.getConnectionFactory() != null) {
                redisTemplate.opsForZSet().removeRangeByScore(key, 0, windowStart);
                Long count = redisTemplate.opsForZSet().count(key, windowStart, now);
                return count != null ? count : 0;
            }
        } catch (Exception e) {
            log.warn("Redis unavailable for fraud history ({}), using in-memory fallback", e.getMessage());
        }
        return countInMemory(username, windowStart, now);
    }

    /**
     * Counts transactions to a specific destination account within the window.
     */
    private long countTxToDest(String username, Long destAccountId, long windowStart, long now) {
        if (destAccountId == null) {
            return 0;
        }
        String key = REDIS_PREFIX + username;
        try {
            if (redisTemplate != null && redisTemplate.getConnectionFactory() != null) {
                long sameDestCount = 0;
                Set<String> members = redisTemplate.opsForZSet().rangeByScore(key, windowStart, now);
                if (members != null) {
                    for (String member : members) {
                        int sep = member.indexOf(':');
                        if (sep > 0) {
                            String destPart = member.substring(sep + 1);
                            if (destPart.equals(String.valueOf(destAccountId))) {
                                sameDestCount++;
                            }
                        }
                    }
                }
                return sameDestCount;
            }
        } catch (Exception e) {
            log.warn("Redis unavailable for fraud history ({}), using in-memory fallback", e.getMessage());
        }
        return countToDestInMemory(username, destAccountId, windowStart, now);
    }

    /**
     * Records the current transaction attempt for the user, then expires the key.
     */
    private void recordTx(String username, long now, BigDecimal amount, Long destAccountId) {
        String key = REDIS_PREFIX + username;
        try {
            if (redisTemplate != null && redisTemplate.getConnectionFactory() != null) {
                redisTemplate.opsForZSet().add(key, now + ":" + destAccountId, now);
                redisTemplate.expire(key, Duration.ofSeconds(WINDOW_MINUTES * 60 + 5));
                return;
            }
        } catch (Exception e) {
            log.warn("Redis unavailable for fraud history ({}), using in-memory fallback", e.getMessage());
        }
        recordInMemory(username, now, amount, destAccountId);
    }

    /**
     * Returns the number of payment attempts recorded so far today for the user
     * (local server date). Uses Redis INCR for atomicity, with a 2-day TTL so the
     * count outlives the 5-minute sliding window and survives to catch "lách luật".
     */
    private long getDailyTxCount(String username) {
        String key = DAILY_PREFIX + java.time.LocalDate.now() + ":" + username;
        try {
            if (redisTemplate != null && redisTemplate.getConnectionFactory() != null) {
                String val = redisTemplate.opsForValue().get(key);
                long count = val != null ? Long.parseLong(val) : 0;
                redisTemplate.expire(key, Duration.ofDays(DAILY_TTL_DAYS));
                return count;
            }
        } catch (Exception e) {
            log.warn("Redis unavailable for daily fraud counter ({}), using in-memory fallback", e.getMessage());
        }
        return fallbackDailyCounts.getOrDefault(java.time.LocalDate.now() + ":" + username, 0L);
    }

    /**
     * Atomically increments the daily transaction counter for the user.
     */
    private void incrementDailyTxCount(String username) {
        String key = DAILY_PREFIX + java.time.LocalDate.now() + ":" + username;
        try {
            if (redisTemplate != null && redisTemplate.getConnectionFactory() != null) {
                redisTemplate.opsForValue().increment(key);
                redisTemplate.expire(key, Duration.ofDays(DAILY_TTL_DAYS));
                return;
            }
        } catch (Exception e) {
            log.warn("Redis unavailable for daily fraud counter ({}), skipping increment", e.getMessage());
        }
        // In-memory fallback: track per-day counts so the rule still works without Redis.
        String fallbackKey = java.time.LocalDate.now() + ":" + username;
        fallbackDailyCounts.merge(fallbackKey, 1L, Long::sum);
    }

    private long countInMemory(String username, long windowStart, long now) {
        ConcurrentLinkedQueue<TxRecord> history = fallbackTxHistory.computeIfAbsent(username, k -> new ConcurrentLinkedQueue<>());
        while (!history.isEmpty() && history.peek().getTimestamp() < windowStart) {
            history.poll();
        }
        return history.stream().filter(r -> r.getTimestamp() <= now).count();
    }

    private long countToDestInMemory(String username, Long destAccountId, long windowStart, long now) {
        ConcurrentLinkedQueue<TxRecord> history = fallbackTxHistory.computeIfAbsent(username, k -> new ConcurrentLinkedQueue<>());
        return history.stream()
                .filter(r -> r.getTimestamp() >= windowStart && r.getTimestamp() <= now)
                .filter(r -> r.getDestAccountId() != null && r.getDestAccountId().equals(destAccountId))
                .count();
    }

    private void recordInMemory(String username, long now, BigDecimal amount, Long destAccountId) {
        ConcurrentLinkedQueue<TxRecord> history = fallbackTxHistory.computeIfAbsent(username, k -> new ConcurrentLinkedQueue<>());
        history.add(new TxRecord(now, amount, destAccountId));
    }
}
