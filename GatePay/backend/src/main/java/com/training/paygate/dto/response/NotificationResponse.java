package com.training.paygate.dto.response;

import java.time.LocalDateTime;

public record NotificationResponse(
        Long id,
        Long userId,
        String title,
        String message,
        String type,
        boolean read,
        LocalDateTime createdAt
) {}
