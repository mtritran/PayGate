package com.training.paygate.service.impl;

import com.training.paygate.dto.request.CreateMerchantRequest;
import com.training.paygate.dto.request.UpdateMerchantRequest;
import com.training.paygate.dto.request.UserMerchantRequest;
import com.training.paygate.dto.response.MerchantResponse;
import com.training.paygate.entity.Merchant;
import com.training.paygate.enums.MerchantStatus;
import com.training.paygate.enums.OwnerType;
import com.training.paygate.exception.DuplicateResourceException;
import com.training.paygate.exception.ResourceNotFoundException;
import com.training.paygate.mapper.MerchantMapper;
import com.training.paygate.repository.MerchantRepository;
import com.training.paygate.service.AccountService;
import com.training.paygate.service.MerchantService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class MerchantServiceImpl implements MerchantService {

    private final MerchantRepository merchantRepository;
    private final MerchantMapper merchantMapper;
    private final AccountService accountService;

    @Override
    @Transactional(readOnly = true)
    public Page<MerchantResponse> getAll(Pageable pageable) {
        return merchantRepository.findAll(pageable).map(merchantMapper::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public MerchantResponse getById(Long id) {
        Merchant merchant = merchantRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Merchant", id));
        return merchantMapper.toResponse(merchant);
    }

    @Override
    @Transactional(readOnly = true)
    public MerchantResponse getByCode(String merchantCode) {
        Merchant merchant = merchantRepository.findByMerchantCode(merchantCode)
                .orElseThrow(() -> new ResourceNotFoundException("Merchant not found with merchantCode: " + merchantCode));
        return merchantMapper.toResponse(merchant);
    }

    @Override
    @Transactional
    public MerchantResponse create(CreateMerchantRequest request) {
        if (merchantRepository.existsByMerchantCode(request.merchantCode())) {
            throw new DuplicateResourceException("Merchant", "merchantCode", request.merchantCode());
        }
        if (merchantRepository.existsByUserId(request.userId())) {
            throw new DuplicateResourceException("Merchant", "userId", request.userId());
        }

        Merchant merchant = merchantMapper.toEntity(request);
        merchant.setApiKey(UUID.randomUUID().toString());
        merchant.setActive(true);
        merchant.setStatus(MerchantStatus.ACTIVE);

        Merchant savedMerchant = merchantRepository.save(merchant);

        // Tự động tạo Account loại MERCHANT cho merchant này
        try {
            accountService.createAccount(savedMerchant.getId(), OwnerType.MERCHANT);
        } catch (Exception ignored) {}

        return merchantMapper.toResponse(savedMerchant);
    }

    @Override
    @Transactional
    public MerchantResponse update(Long id, UpdateMerchantRequest request) {
        Merchant merchant = merchantRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Merchant", id));

        merchantMapper.updateEntity(merchant, request);
        if (request.active() != null) {
            merchant.setStatus(request.active() ? MerchantStatus.ACTIVE : MerchantStatus.REJECTED);
        }

        return merchantMapper.toResponse(merchantRepository.save(merchant));
    }

    @Override
    @Transactional
    public MerchantResponse requestMerchant(Long userId, UserMerchantRequest request) {
        if (merchantRepository.existsByMerchantCode(request.merchantCode())) {
            throw new DuplicateResourceException("Merchant", "merchantCode", request.merchantCode());
        }
        if (merchantRepository.existsByUserId(userId)) {
            throw new DuplicateResourceException("Merchant", "userId", userId);
        }

        Merchant merchant = Merchant.builder()
                .userId(userId)
                .merchantName(request.merchantName())
                .merchantCode(request.merchantCode())
                .apiKey(UUID.randomUUID().toString())
                .webhookUrl(request.webhookUrl())
                .active(false)
                .status(MerchantStatus.PENDING)
                .build();

        Merchant savedMerchant = merchantRepository.save(merchant);
        return merchantMapper.toResponse(savedMerchant);
    }

    @Override
    @Transactional
    public MerchantResponse approveMerchant(Long id) {
        Merchant merchant = merchantRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Merchant", id));

        merchant.setActive(true);
        merchant.setStatus(MerchantStatus.ACTIVE);
        Merchant updatedMerchant = merchantRepository.save(merchant);

        // Provision merchant wallet account upon approval
        try {
            accountService.createAccount(updatedMerchant.getId(), OwnerType.MERCHANT);
        } catch (Exception ignored) {}

        return merchantMapper.toResponse(updatedMerchant);
    }

    @Override
    @Transactional
    public MerchantResponse rejectMerchant(Long id) {
        Merchant merchant = merchantRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Merchant", id));

        merchant.setActive(false);
        merchant.setStatus(MerchantStatus.REJECTED);
        return merchantMapper.toResponse(merchantRepository.save(merchant));
    }

    @Override
    @Transactional(readOnly = true)
    public MerchantResponse getByUserId(Long userId) {
        Merchant merchant = merchantRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Merchant for userId", userId));
        return merchantMapper.toResponse(merchant);
    }
}
