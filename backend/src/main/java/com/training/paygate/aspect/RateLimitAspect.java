package com.training.paygate.aspect;

import com.training.paygate.annotation.RateLimit;
import com.training.paygate.exception.RateLimitExceededException;
import com.training.paygate.service.RedisRateLimiterService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

@Aspect
@Component
@RequiredArgsConstructor
@Slf4j
public class RateLimitAspect {

    private final RedisRateLimiterService rateLimiterService;

    @Around("@annotation(rateLimit)")
    public Object enforceRateLimit(ProceedingJoinPoint joinPoint, RateLimit rateLimit) throws Throwable {
        String clientIp = getClientIp();
        String username = getCurrentUsername();
        
        // Key format: rate_key:user_or_ip
        String userIdentifier = (username != null && !username.isEmpty()) ? username : clientIp;
        String rateKey = rateLimit.key() + ":" + userIdentifier;

        boolean allowed = rateLimiterService.tryAcquire(rateKey, rateLimit.limit(), rateLimit.windowSeconds());
        if (!allowed) {
            log.warn("Rate limit triggered for user/ip={} on endpoint {}", userIdentifier, joinPoint.getSignature().toShortString());
            throw new RateLimitExceededException(
                    String.format("Tần suất truy cập quá nhanh! Vui lòng đợi %d giây trước khi thử lại.", rateLimit.windowSeconds()),
                    rateLimit.windowSeconds()
            );
        }

        return joinPoint.proceed();
    }

    private String getClientIp() {
        ServletRequestAttributes attrs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attrs != null) {
            HttpServletRequest request = attrs.getRequest();
            String xf = request.getHeader("X-Forwarded-For");
            if (xf != null && !xf.isEmpty()) {
                return xf.split(",")[0].trim();
            }
            return request.getRemoteAddr();
        }
        return "unknown_ip";
    }

    private String getCurrentUsername() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getPrincipal())) {
            return auth.getName();
        }
        return null;
    }
}
