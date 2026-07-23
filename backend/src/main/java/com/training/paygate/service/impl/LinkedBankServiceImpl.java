package com.training.paygate.service.impl;

import com.training.paygate.dto.request.LinkedBankRequest;
import com.training.paygate.dto.response.LinkedBankResponse;
import com.training.paygate.entity.LinkedBank;
import com.training.paygate.entity.User;
import com.training.paygate.exception.ResourceNotFoundException;
import com.training.paygate.repository.LinkedBankRepository;
import com.training.paygate.repository.UserRepository;
import com.training.paygate.service.LinkedBankService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class LinkedBankServiceImpl implements LinkedBankService {

    private final LinkedBankRepository linkedBankRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional(readOnly = true)
    public List<LinkedBankResponse> getUserLinkedBanks(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        return linkedBankRepository.findByUserIdAndStatus(user.getId(), "ACTIVE")
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Override
    @Transactional
    public LinkedBankResponse linkBank(String username, LinkedBankRequest request) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        String icon = request.iconType();
        if (icon == null || icon.isBlank()) {
            String nameLower = request.bankName().toLowerCase();
            if (nameLower.contains("momo") || nameLower.contains("zalo")) {
                icon = "MOMO";
            } else if (nameLower.contains("napas") || nameLower.contains("thẻ")) {
                icon = "CARD";
            } else {
                icon = "BANK";
            }
        }

        LinkedBank bank = LinkedBank.builder()
                .userId(user.getId())
                .bankName(request.bankName())
                .accountNumber(request.accountNumber())
                .accountHolder(request.accountHolder().toUpperCase())
                .balance(request.balance())
                .iconType(icon)
                .status("ACTIVE")
                .build();

        LinkedBank saved = linkedBankRepository.save(bank);
        return mapToResponse(saved);
    }

    @Override
    @Transactional
    public void unlinkBank(String username, Long bankId) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        LinkedBank bank = linkedBankRepository.findByIdAndUserId(bankId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Linked bank not found"));

        bank.setStatus("INACTIVE");
        linkedBankRepository.save(bank);
    }

    private LinkedBankResponse mapToResponse(LinkedBank bank) {
        return new LinkedBankResponse(
                bank.getId(),
                bank.getUserId(),
                bank.getBankName(),
                bank.getAccountNumber(),
                bank.getAccountHolder(),
                bank.getBalance(),
                bank.getIconType(),
                bank.getStatus(),
                bank.getCreatedAt()
        );
    }
}
