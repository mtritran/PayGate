package com.training.paygate.service;

import com.training.paygate.dto.request.CreateBeneficiaryRequest;
import com.training.paygate.dto.response.BeneficiaryResponse;

import java.util.List;

public interface BeneficiaryService {
    BeneficiaryResponse create(CreateBeneficiaryRequest request, String currentUsername);
    List<BeneficiaryResponse> getMyBeneficiaries(String currentUsername);
    void delete(Long id, String currentUsername);
    void autoSaveBeneficiary(Long userId, String accountNumber, String accountHolderName, Long targetUserId);
}
