package com.training.paygate.dto.response;

public record AuthResponse(
        String accessToken,
        String refreshToken,
        String username,
        String role,
        Long userId
) {}
