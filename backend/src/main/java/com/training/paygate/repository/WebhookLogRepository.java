package com.training.paygate.repository;

import com.training.paygate.entity.WebhookLog;
import com.training.paygate.enums.WebhookStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface WebhookLogRepository extends JpaRepository<WebhookLog, Long> {

    List<WebhookLog> findByMerchantId(Long merchantId);

    List<WebhookLog> findByTransactionId(Long transactionId);

    List<WebhookLog> findByStatus(WebhookStatus status);

    List<WebhookLog> findByStatusInAndNextRetryAtLessThanEqualAndAttemptLessThan(
            List<WebhookStatus> statuses, LocalDateTime now, Integer maxAttempt);
}
