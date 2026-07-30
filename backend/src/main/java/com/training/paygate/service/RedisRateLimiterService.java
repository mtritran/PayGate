package com.training.paygate.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedQueue;

@Service
@RequiredArgsConstructor
@Slf4j
public class RedisRateLimiterService {

    private final StringRedisTemplate redisTemplate;

    // Local In-Memory Sliding Window Fallback if Redis is unreachable
    private final ConcurrentHashMap<String, ConcurrentLinkedQueue<Long>> fallbackMap = new ConcurrentHashMap<>();

    /**
     * Checks if the request under the specified key exceeds the rate limit.
     * Uses Redis Sorted Set (ZSET) Sliding Window algorithm.
     *
     * @@return true if allowed, false if rate limit exceeded
     */
    public boolean tryAcquire(String rateKey, int maxLimit, int windowSeconds) {
        long now = System.currentTimeMillis();
        long windowStart = now - (windowSeconds * 1000L);
        String redisKey = "rate_limit:" + rateKey;

        try {
            if (redisTemplate != null && redisTemplate.getConnectionFactory() != null) {
                // 1. Remove timestamps older than windowStart
                redisTemplate.opsForZSet().removeRangeByScore(redisKey, 0, windowStart);

                // 2. Count requests in current sliding window
                Long currentCount = redisTemplate.opsForZSet().zCard(redisKey);

                if (currentCount != null && currentCount >= maxLimit) {
                    log.warn("Rate limit EXCEEDED for key={}: {}/{} requests in {}s window",
                            rateKey, currentCount, maxLimit, windowSeconds);
                    return false;
                }

                // 3. Add current timestamp to ZSET & set TTL
                redisTemplate.opsForZSet().add(redisKey, String.valueOf(now), now);
                redisTemplate.expire(redisKey, java.time.Duration.ofSeconds(windowSeconds + 5));
                return true;
            }
        } catch (Exception e) {
            log.warn("Redis Rate Limiter unavailable ({}), using In-Memory Sliding Window Fallback", e.getMessage());
        }

        // High-Performance In-Memory Sliding Window Fallback
        ConcurrentLinkedQueue<Long> timestamps = fallbackMap.computeIfAbsent(rateKey, k -> new ConcurrentLinkedQueue<>());
        while (!timestamps.isEmpty() && timestamps.peek() < windowStart) {
            timestamps.poll();
        }
        if (timestamps.size() >= maxLimit) {
            log.warn("In-Memory Rate limit EXCEEDED for key={}: {}/{} requests", rateKey, timestamps.size(), maxLimit);
            return false;
        }
        timestamps.add(now);
        return true;
    }
}
