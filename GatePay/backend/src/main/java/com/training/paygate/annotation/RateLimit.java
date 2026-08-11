package com.training.paygate.annotation;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Custom annotation to enforce Distributed Sliding-Window Rate Limiting via Redis.
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface RateLimit {
    
    /**
     * Maximum allowed requests within the time window.
     */
    int limit() default 10;

    /**
     * Sliding time window size in seconds.
     */
    int windowSeconds() default 60;

    /**
     * Custom key prefix (e.g., "transfer", "login", "ai_chat").
     */
    String key() default "general";
}
