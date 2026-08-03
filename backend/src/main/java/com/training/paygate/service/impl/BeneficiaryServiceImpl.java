package com.training.paygate.service.impl;

import com.training.paygate.dto.request.CreateBeneficiaryRequest;
import com.training.paygate.dto.response.BeneficiaryResponse;
import com.training.paygate.entity.Beneficiary;
import com.training.paygate.entity.User;
import com.training.paygate.exception.BadRequestException;
import com.training.paygate.exception.ResourceNotFoundException;
import com.training.paygate.repository.BeneficiaryRepository;
import com.training.paygate.repository.UserRepository;
import com.training.paygate.service.BeneficiaryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class BeneficiaryServiceImpl implements BeneficiaryService {

    private final BeneficiaryRepository beneficiaryRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional
    public BeneficiaryResponse create(CreateBeneficiaryRequest request, String currentUsername) {
        User user = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + currentUsername));

        Optional<Beneficiary> existing = beneficiaryRepository.findByUserIdAndAccountNumber(user.getId(), request.accountNumber());
        if (existing.isPresent()) {
            Beneficiary b = existing.get();
            b.setAccountHolderName(request.accountHolderName());
            if (request.nickName() != null) b.setNickName(request.nickName());
            beneficiaryRepository.save(b);
            return mapToResponse(b);
        }

        Beneficiary beneficiary = Beneficiary.builder()
                .userId(user.getId())
                .accountNumber(request.accountNumber())
                .accountHolderName(request.accountHolderName())
                .nickName(request.nickName())
                .bankName(request.bankName() != null ? request.bankName() : "PayGate Ví")
                .build();

        beneficiaryRepository.save(beneficiary);
        log.info("Saved new beneficiary account={} for user={}", request.accountNumber(), currentUsername);
        return mapToResponse(beneficiary);
    }

    @Override
    @Transactional(readOnly = true)
    public List<BeneficiaryResponse> getMyBeneficiaries(String currentUsername) {
        User user = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + currentUsername));

        return beneficiaryRepository.findByUserIdOrderByUpdatedAtDesc(user.getId())
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Override
    @Transactional
    public void delete(Long id, String currentUsername) {
        User user = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + currentUsername));

        Beneficiary b = beneficiaryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Beneficiary", id));

        if (!b.getUserId().equals(user.getId())) {
            throw new BadRequestException("Access denied");
        }

        beneficiaryRepository.delete(b);
        log.info("Deleted beneficiary ID={} for user={}", id, currentUsername);
    }

    @Override
    @Transactional
    public void autoSaveBeneficiary(Long userId, String accountNumber, String accountHolderName, Long targetUserId) {
        try {
            Optional<Beneficiary> existing = beneficiaryRepository.findByUserIdAndAccountNumber(userId, accountNumber);
            if (existing.isEmpty()) {
                Beneficiary b = Beneficiary.builder()
                        .userId(userId)
                        .beneficiaryUserId(targetUserId)
                        .accountNumber(accountNumber)
                        .accountHolderName(accountHolderName)
                        .bankName("PayGate Ví")
                        .build();
                beneficiaryRepository.save(b);
                log.info("Auto-saved beneficiary account={} for userId={}", accountNumber, userId);
            }
        } catch (Exception e) {
            log.warn("Failed to auto-save beneficiary: {}", e.getMessage());
        }
    }

    private BeneficiaryResponse mapToResponse(Beneficiary b) {
        return new BeneficiaryResponse(
                b.getId(),
                b.getUserId(),
                b.getBeneficiaryUserId(),
                b.getAccountNumber(),
                b.getAccountHolderName(),
                b.getNickName(),
                b.getBankName(),
                b.getCreatedAt()
        );
    }
}
