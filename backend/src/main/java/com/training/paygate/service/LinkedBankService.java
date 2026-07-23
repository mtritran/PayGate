package com.training.paygate.service;

import com.training.paygate.dto.request.LinkedBankRequest;
import com.training.paygate.dto.response.LinkedBankResponse;

import java.util.List;

public interface LinkedBankService {
    List<LinkedBankResponse> getUserLinkedBanks(String username);
    LinkedBankResponse linkBank(String username, LinkedBankRequest request);
    void unlinkBank(String username, Long bankId);
}
