package com.training.cic.service.impl;

import com.training.cic.client.TpbankHistoryClient;
import com.training.cic.dto.BorrowerHistoryResponse;
import com.training.cic.dto.CreditCheckRequest;
import com.training.cic.dto.CreditCheckResponse;
import com.training.cic.entity.CreditAssessment;
import com.training.cic.entity.CreditProfile;
import com.training.cic.repository.CreditAssessmentRepository;
import com.training.cic.repository.CreditProfileRepository;
import com.training.cic.service.CicCreditCheckService;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.UUID;

@Service
public class CicCreditCheckServiceImpl implements CicCreditCheckService {

    private static final BigDecimal ZERO = BigDecimal.ZERO.setScale(2);
    private static final BigDecimal FAIR_LIMIT = new BigDecimal("5000000.00");
    private static final BigDecimal GOOD_LIMIT = new BigDecimal("10000000.00");
    private static final BigDecimal HIGH_LIMIT = new BigDecimal("15000000.00");

    private final CreditProfileRepository profileRepository;
    private final CreditAssessmentRepository assessmentRepository;
    private final TpbankHistoryClient tpbankHistoryClient;

    public CicCreditCheckServiceImpl(
            CreditProfileRepository profileRepository,
            CreditAssessmentRepository assessmentRepository,
            TpbankHistoryClient tpbankHistoryClient
    ) {
        this.profileRepository = profileRepository;
        this.assessmentRepository = assessmentRepository;
        this.tpbankHistoryClient = tpbankHistoryClient;
    }

    @Override
    @Transactional
    public CreditCheckResponse checkCredit(CreditCheckRequest request) {
        CreditCheckResponse firstTimeApproval = firstTimeApprovalIfNoTpbankHistory(request);
        if (firstTimeApproval != null) {
            saveAssessment(request, firstTimeApproval);
            return firstTimeApproval;
        }

        CreditProfile profile = loadFreshProfile(request.customerId());

        CreditCheckResponse hardDecline = hardDeclineIfNeeded(request, profile);
        if (hardDecline != null) {
            saveAssessment(request, hardDecline);
            return hardDecline;
        }

        int score = calculateScore(profile);
        String tier = toTier(score);
        BigDecimal approvedLimit = approvedLimitFor(score);
        BigDecimal maxLoanAmount = approvedLimit;
        BigDecimal requestedAmount = request.requestedAmount();

        boolean approved = score >= 55 && requestedAmount.compareTo(maxLoanAmount) <= 0;
        BigDecimal suggestedUpfrontAmount = suggestedUpfrontFor(score, requestedAmount, maxLoanAmount);
        String reason = reasonFor(approved, score, requestedAmount, maxLoanAmount);

        CreditCheckResponse response = new CreditCheckResponse(
                request.customerId(),
                approved,
                score,
                tier,
                approvedLimit,
                maxLoanAmount,
                suggestedUpfrontAmount,
                reason
        );
        saveAssessment(request, response);
        return response;
    }

    private CreditCheckResponse firstTimeApprovalIfNoTpbankHistory(CreditCheckRequest request) {
        try {
            tpbankHistoryClient.getHistory(request.customerId());
            return null;
        } catch (HttpClientErrorException.NotFound ex) {
            BigDecimal requestedAmount = request.requestedAmount();
            return new CreditCheckResponse(
                    request.customerId(),
                    true,
                    80,
                    "GOOD",
                    requestedAmount,
                    requestedAmount,
                    ZERO,
                    "FIRST_TIME_BORROWER_AUTO_APPROVED"
            );
        }
    }

    private CreditProfile loadFreshProfile(Long customerId) {
        BorrowerHistoryResponse history = tpbankHistoryClient.getHistory(customerId);
        if (history == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Borrower history not found");
        }

        CreditProfile profile = profileRepository.findByCustomerId(customerId).orElseGet(CreditProfile::new);
        profile.applySnapshot(
                customerId,
                history.totalTransactions(),
                history.onTimePayments(),
                history.missedPayments(),
                history.currentBalance(),
                history.usedCredit(),
                history.maxDaysPastDue(),
                history.maxDaysPastDue() >= 90,
                false,
                false,
                java.time.LocalDateTime.now()
        );
        return profileRepository.save(profile);
    }

    private CreditCheckResponse hardDeclineIfNeeded(CreditCheckRequest request, CreditProfile profile) {
        String reason = null;
        if (profile.isWriteOff()) {
            reason = "ACTIVE_WRITE_OFF";
        } else if (profile.isActiveBadDebt()) {
            reason = "ACTIVE_BAD_DEBT";
        } else if (profile.getMaxDaysPastDue() >= 90) {
            reason = "SEVERE_DELINQUENCY";
        } else if (profile.isProviderFraudReported()) {
            reason = "PROVIDER_REPORTED_FRAUD";
        }

        if (reason == null) {
            return null;
        }

        return new CreditCheckResponse(
                request.customerId(),
                false,
                0,
                "POOR",
                ZERO,
                ZERO,
                ZERO,
                reason
        );
    }

    private int calculateScore(CreditProfile profile) {
        int score = 0;
        score += (int) Math.min(20, Math.max(0, profile.getTotalTransactions()));
        score += (int) Math.min(30, Math.max(0, profile.getOnTimePayments()));
        score -= (int) Math.min(40, Math.max(0, profile.getMissedPayments()) * 4L);

        BigDecimal used = profile.getUsedCredit() != null ? profile.getUsedCredit() : ZERO;
        BigDecimal balance = profile.getCurrentBalance() != null ? profile.getCurrentBalance() : ZERO;
        if (used.compareTo(ZERO) > 0 && balance.compareTo(ZERO) >= 0) {
            BigDecimal utilization = used
                    .divide(balance.add(used), 2, RoundingMode.HALF_UP)
                    .movePointRight(2);
            if (utilization.compareTo(new BigDecimal("80")) > 0) {
                score -= 20;
            } else if (utilization.compareTo(new BigDecimal("60")) > 0) {
                score -= 10;
            } else if (utilization.compareTo(new BigDecimal("30")) <= 0) {
                score += 40;
            }
        }

        return Math.max(0, Math.min(score, 100));
    }

    private String toTier(int score) {
        if (score >= 75) return "HIGH";
        if (score >= 55) return "GOOD";
        if (score >= 35) return "FAIR";
        return "POOR";
    }

    private BigDecimal approvedLimitFor(int score) {
        if (score >= 75) return HIGH_LIMIT;
        if (score >= 55) return GOOD_LIMIT;
        if (score >= 35) return FAIR_LIMIT;
        return ZERO;
    }

    private String reasonFor(boolean approved, int score, BigDecimal requestedAmount, BigDecimal maxLoanAmount) {
        if (approved) {
            return "GOOD_HISTORY";
        }
        if (score < 55) {
            return "LOW_SCORE";
        }
        if (requestedAmount.compareTo(maxLoanAmount) > 0) {
            return maxLoanAmount.compareTo(ZERO) > 0 ? "PARTIAL_LIMIT_AVAILABLE" : "LIMIT_EXHAUSTED";
        }
        return "DENIED";
    }

    private BigDecimal suggestedUpfrontFor(int score, BigDecimal requestedAmount, BigDecimal maxLoanAmount) {
        if (score < 55 || requestedAmount.compareTo(maxLoanAmount) <= 0) {
            return ZERO;
        }
        return requestedAmount.subtract(maxLoanAmount).max(ZERO);
    }

    private void saveAssessment(CreditCheckRequest request, CreditCheckResponse response) {
        assessmentRepository.save(CreditAssessment.create(
                "CIC-ASMT-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(),
                request.customerId(),
                request.requestedAmount() != null ? request.requestedAmount() : ZERO,
                request.plan(),
                response.approved(),
                response.score(),
                response.tier(),
                response.approvedLimit(),
                response.maxLoanAmount(),
                response.suggestedUpfrontAmount(),
                response.reason()
        ));
    }
}
