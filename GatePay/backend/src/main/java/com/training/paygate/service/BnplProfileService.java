package com.training.paygate.service;

import com.training.paygate.dto.client.CicCreditCheckRequest;
import com.training.paygate.dto.client.CicCreditCheckResponse;
import com.training.paygate.dto.request.BnplBorrowerProfileRequest;
import com.training.paygate.dto.response.BnplProfileResponse;
import com.training.paygate.entity.BnplProfile;
import com.training.paygate.entity.User;
import com.training.paygate.exception.BadRequestException;
import com.training.paygate.exception.ResourceNotFoundException;
import com.training.paygate.integration.cic.CicClient;
import com.training.paygate.repository.BnplProfileRepository;
import com.training.paygate.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import com.training.paygate.service.NotificationService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class BnplProfileService {

    private final BnplProfileRepository profileRepository;
    private final UserRepository userRepository;
    private final CicClient cicClient;
    private final NotificationService notificationService;
    private final com.training.paygate.repository.LoanRepository loanRepository;

    public BnplProfileResponse getProfile(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        
        Optional<BnplProfile> profileOpt = profileRepository.findByUserId(user.getId());
        if (profileOpt.isEmpty()) {
            return null; // Return null if not exists so UI knows to show empty form
        }
        
        return toResponse(profileOpt.get());
    }

    @Transactional
    public BnplProfileResponse updateProfile(String username, BnplBorrowerProfileRequest request) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        BnplProfile profile = profileRepository.findByUserId(user.getId())
                .orElseGet(() -> BnplProfile.builder().userId(user.getId()).build());

        // We can update User's fullName just in case they change it
        user.setFullName(request.fullName());
        userRepository.save(user);

        profile.setOccupation(request.occupation());
        profile.setCompanyName(request.companyName());
        profile.setMonthlyIncome(request.monthlyIncome());
        profile.setRelative1Name(request.relative1Name());
        profile.setRelative1Phone(request.relative1Phone());
        profile.setRelative1Relationship(request.relative1Relationship());
        profile.setRelative2Name(request.relative2Name());
        profile.setRelative2Phone(request.relative2Phone());
        profile.setRelative2Relationship(request.relative2Relationship());
        
        return toResponse(profileRepository.save(profile));
    }

    @Transactional
    public BnplProfileResponse assessCredit(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        BnplProfile profile = profileRepository.findByUserId(user.getId())
                .orElseThrow(() -> new BadRequestException("Please complete your profile first"));

        // Use a generic amount (e.g. 50,000,000 VND) for pre-approval assessment
        CicCreditCheckResponse cic = cicClient.checkCredit(new CicCreditCheckRequest(
                user.getId(),
                new BigDecimal("50000000"),
                "BNPL"
        ));

        if (cic == null) {
            throw new BadRequestException("CIC did not return assessment");
        }

        profile.setCreditScore(cic.score());
        profile.setRiskGrade(cic.tier());
        
        // Custom logic: Limit is 70% of monthly income
        BigDecimal calculatedLimit = profile.getMonthlyIncome() != null ? 
                profile.getMonthlyIncome().multiply(new BigDecimal("0.70")) : BigDecimal.ZERO;
        profile.setApprovedLimit(calculatedLimit);
        profile.setAssessmentReason("Tự động duyệt 70% lương");

        String msg = String.format("Hạn mức tín dụng BNPL của bạn đã được duyệt: %s VND. (%s)",
                calculatedLimit, profile.getAssessmentReason());
        notificationService.createNotification(user.getId(), "Duyệt hạn mức thành công", msg, "BNPL_LIMIT_APPROVED");

        return toResponse(profileRepository.save(profile));
    }

    private BnplProfileResponse toResponse(BnplProfile p) {
        String fullName = userRepository.findById(p.getUserId())
                .map(User::getFullName)
                .orElse("");
                
        java.math.BigDecimal usedLimit = loanRepository.sumActiveBnplRemainingAmount(p.getUserId(), java.util.List.of(com.training.paygate.enums.LoanStatus.ACTIVE, com.training.paygate.enums.LoanStatus.OVERDUE));
        java.math.BigDecimal availableLimit = p.getApprovedLimit() != null ? p.getApprovedLimit().subtract(usedLimit) : null;
        if (availableLimit != null && availableLimit.compareTo(java.math.BigDecimal.ZERO) < 0) {
            availableLimit = java.math.BigDecimal.ZERO;
        }

        return new BnplProfileResponse(
                p.getUserId(),
                fullName,
                p.getOccupation(),
                p.getCompanyName(),
                p.getMonthlyIncome(),
                p.getRelative1Name(),
                p.getRelative1Phone(),
                p.getRelative1Relationship(),
                p.getRelative2Name(),
                p.getRelative2Phone(),
                p.getRelative2Relationship(),
                p.getCreditScore(),
                p.getRiskGrade(),
                p.getApprovedLimit(),
                availableLimit,
                p.getAssessmentReason()
        );
    }
}
