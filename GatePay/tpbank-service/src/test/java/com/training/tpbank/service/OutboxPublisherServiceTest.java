package com.training.tpbank.service;

import com.training.tpbank.client.CicCreditEventClient;
import com.training.tpbank.entity.OutboxEvent;
import com.training.tpbank.enums.OutboxStatus;
import com.training.tpbank.repository.OutboxEventRepository;
import com.training.tpbank.service.impl.OutboxPublisherServiceImpl;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class OutboxPublisherServiceTest {

    private final OutboxEventRepository outboxEventRepository = mock(OutboxEventRepository.class);
    private final CicCreditEventClient cicCreditEventClient = mock(CicCreditEventClient.class);
    private final OutboxPublisherService service = new OutboxPublisherServiceImpl(
            outboxEventRepository,
            cicCreditEventClient
    );

    @Test
    void publishesDueEventsToCic() {
        OutboxEvent event = new OutboxEvent(
                "event-1",
                "ACCOUNT_SNAPSHOT_UPDATED",
                "TPBANK",
                1024L,
                "{\"eventId\":\"event-1\"}"
        );
        when(outboxEventRepository.findByStatusInAndNextAttemptAtLessThanEqualOrderByCreatedAtAsc(
                anyCollection(),
                any(LocalDateTime.class),
                any(Pageable.class)
        )).thenReturn(List.of(event));

        int published = service.publishDueEvents();

        assertThat(published).isEqualTo(1);
        assertThat(event.getStatus()).isEqualTo(OutboxStatus.SENT);
        verify(cicCreditEventClient).publish("{\"eventId\":\"event-1\"}");
        verify(outboxEventRepository).save(event);
    }

    @Test
    void marksEventFailedWhenCicRejectsPublish() {
        OutboxEvent event = new OutboxEvent(
                "event-1",
                "ACCOUNT_SNAPSHOT_UPDATED",
                "TPBANK",
                1024L,
                "{\"eventId\":\"event-1\"}"
        );
        when(outboxEventRepository.findByStatusInAndNextAttemptAtLessThanEqualOrderByCreatedAtAsc(
                anyCollection(),
                any(LocalDateTime.class),
                any(Pageable.class)
        )).thenReturn(List.of(event));
        doThrow(new RuntimeException("CIC unavailable"))
                .when(cicCreditEventClient)
                .publish("{\"eventId\":\"event-1\"}");

        int published = service.publishDueEvents();

        assertThat(published).isZero();
        assertThat(event.getStatus()).isEqualTo(OutboxStatus.FAILED);
        assertThat(event.getAttempts()).isEqualTo(1);
        verify(outboxEventRepository).save(event);
    }
}
