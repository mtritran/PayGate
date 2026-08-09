package com.training.cic.dto;

public record CreditEventResponse(
        String eventId,
        boolean accepted,
        boolean duplicate
) {
}
