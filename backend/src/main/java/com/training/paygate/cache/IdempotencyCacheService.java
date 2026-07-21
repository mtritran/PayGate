package com.training.paygate.cache;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
public class IdempotencyCacheService {

    private final RedisTemplate<String, Object> redisTemplate;
    private static final String CACHE_PREFIX = "tx:dedup:";
    private static final long TTL_HOURS = 24;

    public void set(String idempotencyKey, String transactionRef) {
        String key = CACHE_PREFIX + idempotencyKey;
        redisTemplate.opsForValue().set(key, transactionRef, TTL_HOURS, TimeUnit.HOURS);
    }

    public String get(String idempotencyKey) {
        String key = CACHE_PREFIX + idempotencyKey;
        Object val = redisTemplate.opsForValue().get(key);
        return val != null ? val.toString() : null;
    }
}
