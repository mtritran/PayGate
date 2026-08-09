package com.training.tpbank.service;

import com.training.tpbank.dto.BorrowerHistoryResponse;

public interface BorrowerHistoryService {

    BorrowerHistoryResponse getHistory(Long customerId);
}
