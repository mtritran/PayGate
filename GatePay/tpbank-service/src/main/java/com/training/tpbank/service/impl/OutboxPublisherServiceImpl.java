package com.training.tpbank.service.impl;

import com.training.tpbank.client.CicCreditEventClient;
import com.training.tpbank.entity.OutboxEvent;
import com.training.tpbank.enums.OutboxStatus;
import com.training.tpbank.repository.OutboxEventRepository;
import com.training.tpbank.service.OutboxPublisherService;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class OutboxPublisherServiceImpl implements OutboxPublisherService {

    private static final int BATCH_SIZE = 20;

    private final OutboxEventRepository outboxEventRepository;
    private final CicCreditEventClient cicCreditEventClient;

    public OutboxPublisherServiceImpl(
            OutboxEventRepository outboxEventRepository,
            CicCreditEventClient cicCreditEventClient
    ) {
        this.outboxEventRepository = outboxEventRepository;
        this.cicCreditEventClient = cicCreditEventClient;
    }

    @Override
    @Transactional
    public int publishDueEvents() {
        List<OutboxEvent> events = outboxEventRepository
                .findByStatusInAndNextAttemptAtLessThanEqualOrderByCreatedAtAsc(
                        List.of(OutboxStatus.PENDING, OutboxStatus.FAILED),
                        LocalDateTime.now(),
                        PageRequest.of(0, BATCH_SIZE)
                );

        int published = 0;
        for (OutboxEvent event : events) {
            try {
                cicCreditEventClient.publish(event.getPayloadJson());
                event.markSent();
                published++;
            } catch (RuntimeException ex) {
                event.markFailed(ex.getMessage());
            }
            outboxEventRepository.save(event);
        }
        return published;
    }
}
