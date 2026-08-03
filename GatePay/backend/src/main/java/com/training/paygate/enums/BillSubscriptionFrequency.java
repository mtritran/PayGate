package com.training.paygate.enums;

import java.time.LocalDateTime;

public enum BillSubscriptionFrequency {
    MINUTELY,
    DAILY,
    WEEKLY,
    MONTHLY;

    public LocalDateTime advance(LocalDateTime from) {
        return switch (this) {
            case MINUTELY -> from.plusMinutes(1);
            case DAILY -> from.plusDays(1);
            case WEEKLY -> from.plusWeeks(1);
            case MONTHLY -> from.plusMonths(1);
        };
    }
}
