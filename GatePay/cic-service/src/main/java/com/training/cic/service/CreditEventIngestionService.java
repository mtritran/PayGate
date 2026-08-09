package com.training.cic.service;

import com.training.cic.dto.CreditEventRequest;
import com.training.cic.dto.CreditEventResponse;

public interface CreditEventIngestionService {

    CreditEventResponse ingest(CreditEventRequest request);
}
