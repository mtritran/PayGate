package com.training.cic.service;

import com.training.cic.dto.CreditEventRequest;
import com.training.cic.dto.CreditEventResponse;
import com.training.cic.entity.CreditEvent;
import com.training.cic.entity.CreditProfile;
import com.training.cic.repository.CreditEventRepository;
import com.training.cic.repository.CreditProfileRepository;
import com.training.cic.service.impl.CreditEventIngestionServiceImpl;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class CreditEventIngestionServiceTest {

    private final CreditEventRepository eventRepository = mock(CreditEventRepository.class);
    private final CreditProfileRepository profileRepository = mock(CreditProfileRepository.class);
    private final CreditEventIngestionService service = new CreditEventIngestionServiceImpl(
            eventRepository,
            profileRepository
    );

    @Test
    void savesEventAndUpsertsCreditProfile() {
        CreditEventRequest request = request("event-1");
        when(eventRepository.existsByEventId("event-1")).thenReturn(false);
        when(profileRepository.findByCustomerId(1024L)).thenReturn(Optional.empty());

        CreditEventResponse response = service.ingest(request);

        ArgumentCaptor<CreditProfile> profileCaptor = ArgumentCaptor.forClass(CreditProfile.class);
        assertThat(response.accepted()).isTrue();
        assertThat(response.duplicate()).isFalse();
        verify(eventRepository).save(any(CreditEvent.class));
        verify(profileRepository).save(profileCaptor.capture());
        assertThat(profileCaptor.getValue().getCustomerId()).isEqualTo(1024L);
        assertThat(profileCaptor.getValue().getUsedCredit()).isEqualByComparingTo("3000000.00");
    }

    @Test
    void ignoresDuplicateEvent() {
        when(eventRepository.existsByEventId("event-1")).thenReturn(true);

        CreditEventResponse response = service.ingest(request("event-1"));

        assertThat(response.accepted()).isTrue();
        assertThat(response.duplicate()).isTrue();
        verify(eventRepository, never()).save(any(CreditEvent.class));
        verify(profileRepository, never()).save(any(CreditProfile.class));
    }

    private CreditEventRequest request(String eventId) {
        return new CreditEventRequest(
                eventId,
                "ACCOUNT_SNAPSHOT_UPDATED",
                "TPBANK",
                1024L,
                18,
                8,
                0,
                new BigDecimal("7000000.00"),
                new BigDecimal("3000000.00"),
                0,
                false,
                false,
                false,
                OffsetDateTime.now()
        );
    }
}
