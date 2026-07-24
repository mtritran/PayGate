package com.training.paygate.worker;

import com.training.paygate.service.RecurringPaymentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class RecurringPaymentWorker {

    private final RecurringPaymentService recurringPaymentService;

    /**
     * Runs every 30 seconds to check for due recurring payments and bill payments.
     */
    @Scheduled(cron = "0/30 * * * * *")
    public void processDuePayments() {
        try {
            recurringPaymentService.executeDuePayments();
        } catch (Exception e) {
            log.error("Error in RecurringPaymentWorker execution: {}", e.getMessage(), e);
        }
    }
}
