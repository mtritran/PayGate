package com.training.paygate.cache;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
public class BalanceCacheService {

    private final RedisTemplate<String, Object> redisTemplate;
    private static final String CACHE_PREFIX = "account:balance:";
    private static final long TTL_MINUTES = 5;

    public void cacheBalance(Long accountId, BigDecimal balance) {
        String key = CACHE_PREFIX + accountId;
        redisTemplate.opsForValue().set(key, balance.toString(), TTL_MINUTES, TimeUnit.MINUTES);
    }

    public BigDecimal getBalance(Long accountId) {
        String key = CACHE_PREFIX + accountId;
        Object val = redisTemplate.opsForValue().get(key);
        if (val != null) {
            return new BigDecimal(val.toString());
        }
        return null;
    }

    public void evictBalance(Long accountId) {
        String key = CACHE_PREFIX + accountId;
        redisTemplate.delete(key);
    }
}
