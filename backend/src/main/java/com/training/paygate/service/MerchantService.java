package com.training.paygate.service;

import com.training.paygate.dto.request.CreateMerchantRequest;
import com.training.paygate.dto.request.UpdateMerchantRequest;
import com.training.paygate.dto.request.UserMerchantRequest;
import com.training.paygate.dto.response.MerchantResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface MerchantService {

    Page<MerchantResponse> getAll(Pageable pageable);

    MerchantResponse getById(Long id);

    MerchantResponse getByCode(String merchantCode);

    MerchantResponse create(CreateMerchantRequest request);

    MerchantResponse update(Long id, UpdateMerchantRequest request);

    MerchantResponse requestMerchant(Long userId, UserMerchantRequest request);

    MerchantResponse approveMerchant(Long id);

    MerchantResponse rejectMerchant(Long id);

    MerchantResponse getByUserId(Long userId);
}
