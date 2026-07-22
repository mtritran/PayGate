package com.training.paygate.service;

import com.training.paygate.dto.response.LedgerEntryResponse;
import com.training.paygate.dto.response.LedgerVerificationResponse;

import java.util.List;

public interface LedgerService {
    LedgerVerificationResponse verifyLedger();
    List<LedgerEntryResponse> getEntriesByAccount(Long accountId);
}
