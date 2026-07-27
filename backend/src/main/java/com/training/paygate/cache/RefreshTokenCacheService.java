package com.training.paygate.cache;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
public class RefreshTokenCacheService {

    private final RedisTemplate<String, Object> redisTemplate;
    private static final String CACHE_PREFIX = "auth:refresh_token:";
    private static final String BLACKLIST_PREFIX = "auth:blacklist:";

    public void saveRefreshToken(String username, String refreshToken, long expirationMs) {
        String key = CACHE_PREFIX + username;
        redisTemplate.opsForValue().set(key, refreshToken, expirationMs, TimeUnit.MILLISECONDS);
    }

    public String getRefreshToken(String username) {
        String key = CACHE_PREFIX + username;
        Object val = redisTemplate.opsForValue().get(key);
        return val != null ? val.toString() : null;
    }

    public boolean isRefreshTokenValid(String username, String refreshToken) {
        if (refreshToken == null || username == null) {
            return false;
        }
        String storedToken = getRefreshToken(username);
        return refreshToken.equals(storedToken);
    }

    public void deleteRefreshToken(String username) {
        String key = CACHE_PREFIX + username;
        redisTemplate.delete(key);
    }

    public void blacklistAccessToken(String accessToken, long remainingMs) {
        if (accessToken != null && remainingMs > 0) {
            String key = BLACKLIST_PREFIX + accessToken;
            redisTemplate.opsForValue().set(key, "logout", remainingMs, TimeUnit.MILLISECONDS);
        }
    }

    public boolean isAccessTokenBlacklisted(String accessToken) {
        if (accessToken == null) {
            return false;
        }
        String key = BLACKLIST_PREFIX + accessToken;
        return Boolean.TRUE.equals(redisTemplate.hasKey(key));
    }
}
