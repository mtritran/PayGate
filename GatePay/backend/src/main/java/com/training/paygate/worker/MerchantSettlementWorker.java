package com.training.paygate.worker;

import com.training.paygate.service.MerchantSettlementService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
@ConditionalOnProperty(name = "app.settlement.enabled", havingValue = "true", matchIfMissing = true)
public class MerchantSettlementWorker {

    private final MerchantSettlementService merchantSettlementService;

    @Scheduled(cron = "${app.settlement.cron:0 0 1 * * ?}")
    public void runEscrowSettlementJob() {
        log.info("Starting scheduled 30-Day Escrow Auto-Settlement Job...");
        try {
            int count = merchantSettlementService.processDueEscrowSettlements();
            log.info("Finished scheduled 30-Day Escrow Auto-Settlement Job. Settle count: {}", count);
        } catch (Exception e) {
            log.error("Error occurred during scheduled Escrow Settlement Job: {}", e.getMessage(), e);
        }
    }
}
