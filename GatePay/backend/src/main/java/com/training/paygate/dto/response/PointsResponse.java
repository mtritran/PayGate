package com.training.paygate.dto.response;

import lombok.Builder;

@Builder
public record PointsResponse(
        Integer totalPoints,
        Integer earnedThisMonth,
        String tier
) {}
