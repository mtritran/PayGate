package com.training.paygate.dto.response;

public record PinStatusResponse(
        boolean hasPin,
        boolean pinEnabled
) {}
