package com.training.cic.service.impl;

import com.training.cic.dto.CreditEventRequest;
import com.training.cic.dto.CreditEventResponse;
import com.training.cic.entity.CreditEvent;
import com.training.cic.entity.CreditProfile;
import com.training.cic.repository.CreditEventRepository;
import com.training.cic.repository.CreditProfileRepository;
import com.training.cic.service.CreditEventIngestionService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CreditEventIngestionServiceImpl implements CreditEventIngestionService {

    private final CreditEventRepository eventRepository;
    private final CreditProfileRepository profileRepository;

    public CreditEventIngestionServiceImpl(
            CreditEventRepository eventRepository,
            CreditProfileRepository profileRepository
    ) {
        this.eventRepository = eventRepository;
        this.profileRepository = profileRepository;
    }

    @Override
    @Transactional
    public CreditEventResponse ingest(CreditEventRequest request) {
        if (eventRepository.existsByEventId(request.eventId())) {
            return new CreditEventResponse(request.eventId(), true, true);
        }

        eventRepository.save(CreditEvent.fromRequest(request));

        CreditProfile profile = profileRepository.findByCustomerId(request.customerId())
                .orElseGet(CreditProfile::new);
        profile.applySnapshot(
                request.customerId(),
                request.totalTransactions(),
                request.onTimePayments(),
                request.missedPayments(),
                request.currentBalance(),
                request.usedCredit(),
                request.maxDaysPastDue(),
                request.activeBadDebt(),
                request.writeOff(),
                request.providerFraudReported(),
                request.occurredAt().toLocalDateTime()
        );
        profileRepository.save(profile);

        return new CreditEventResponse(request.eventId(), true, false);
    }
}
