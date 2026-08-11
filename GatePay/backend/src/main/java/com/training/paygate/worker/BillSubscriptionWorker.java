package com.training.paygate.worker;

import com.training.paygate.service.BillSubscriptionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Chay dinh ky de:
 *  - Quet cac subscription ACTIVE co next_bill_at <= now.
 *  - Goi provider gateway (mock/real) sinh bill ky hien tai.
 *  - Insert 1 row `bills` UNPAID + advance next_bill_at theo frequency.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class BillSubscriptionWorker {

    private final BillSubscriptionService billSubscriptionService;

    @Scheduled(cron = "0/30 * * * * *")
    public void runDueBillSubscriptions() {
        try {
            int generated = billSubscriptionService.runDueSubscriptions();
            if (generated > 0) {
                log.info("BillSubscriptionWorker generated {} new bill(s) from due subscriptions", generated);
            }
        } catch (Exception e) {
            log.error("Error in BillSubscriptionWorker: {}", e.getMessage(), e);
        }
    }
}
