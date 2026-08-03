package com.training.paygate.service;

import com.training.paygate.dto.request.PaymentRequest;
import com.training.paygate.repository.AccountRepository;
import com.training.paygate.repository.FraudLogRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class FraudDetectionServiceTest {

    @Mock
    private FraudLogRepository fraudLogRepository;

    @Mock
    private AccountRepository accountRepository;

    @Mock
    private StringRedisTemplate redisTemplate;

    @Mock
    private RedisConnectionFactory redisConnectionFactory;

    @Mock
    private ValueOperations<String, String> valueOperations;

    @InjectMocks
    private FraudDetectionService fraudDetectionService;

    private PaymentRequest smallPayment() {
        return new PaymentRequest("idem-" + System.nanoTime(), 2L, BigDecimal.valueOf(100_000), "Test pay", null);
    }

    @Test
    void rule6_belowDailyLimit_noDailyPenalty() {
        // Given: Redis reachable, daily counter = 19 (< 20)
        when(redisTemplate.getConnectionFactory()).thenReturn(redisConnectionFactory);
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.get(anyString())).thenReturn("19");

        // When
        FraudDetectionService.FraudAnalysisResult result =
                fraudDetectionService.evaluatePayment("user1", null, smallPayment(), "127.0.0.1");

        // Then: Rule 6 không cộng điểm, ruleTriggered không chứa DAILY_TX_LIMIT
        assertThat(result.getRuleTriggered()).doesNotContain("DAILY_TX_LIMIT");
    }

    @Test
    void rule6_atDailyLimit_adds40Points() {
        // Given: daily counter = 20 (= limit)
        when(redisTemplate.getConnectionFactory()).thenReturn(redisConnectionFactory);
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.get(anyString())).thenReturn("20");

        // When
        FraudDetectionService.FraudAnalysisResult result =
                fraudDetectionService.evaluatePayment("user1", null, smallPayment(), "127.0.0.1");

        // Then: Rule 6 kích hoạt, score >= 40, counter được increment sau khi chấm điểm
        assertThat(result.getRuleTriggered()).contains("DAILY_TX_LIMIT");
        assertThat(result.getRiskScore()).isGreaterThanOrEqualTo(40);
        verify(valueOperations).increment(anyString());
    }
}
