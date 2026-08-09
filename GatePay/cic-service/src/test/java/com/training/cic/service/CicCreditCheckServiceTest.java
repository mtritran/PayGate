package com.training.cic.service;

import com.training.cic.client.TpbankHistoryClient;
import com.training.cic.dto.BorrowerHistoryResponse;
import com.training.cic.dto.CreditCheckRequest;
import com.training.cic.dto.CreditCheckResponse;
import com.training.cic.entity.CreditAssessment;
import com.training.cic.entity.CreditProfile;
import com.training.cic.repository.CreditAssessmentRepository;
import com.training.cic.repository.CreditProfileRepository;
import com.training.cic.service.impl.CicCreditCheckServiceImpl;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class CicCreditCheckServiceTest {

    private final CreditProfileRepository profileRepository = mock(CreditProfileRepository.class);
    private final CreditAssessmentRepository assessmentRepository = mock(CreditAssessmentRepository.class);
    private final TpbankHistoryClient tpbankHistoryClient = mock(TpbankHistoryClient.class);
    private final CicCreditCheckService service = new CicCreditCheckServiceImpl(
            profileRepository,
            assessmentRepository,
            tpbankHistoryClient
    );

    @Test
    void approvesGoodBorrowerWithinLimit() {
        when(tpbankHistoryClient.getHistory(1024L)).thenReturn(history(
                1024L, 8, 8, 0, "7000000.00", "3000000.00", 0, false, false, false
        ));
        when(profileRepository.findByCustomerId(1024L)).thenReturn(Optional.empty());
        when(profileRepository.save(any(CreditProfile.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(assessmentRepository.save(any(CreditAssessment.class))).thenAnswer(invocation -> invocation.getArgument(0));

        CreditCheckResponse response = service.checkCredit(new CreditCheckRequest(
                1024L,
                new BigDecimal("4000000.00"),
                "GTHP_3M"
        ));

        assertThat(response.approved()).isTrue();
        assertThat(response.tier()).isEqualTo("GOOD");
        assertThat(response.maxLoanAmount()).isEqualByComparingTo("10000000.00");
        assertThat(response.reason()).isEqualTo("GOOD_HISTORY");
    }

    @Test
    void deniesWeakBorrower() {
        when(tpbankHistoryClient.getHistory(1026L)).thenReturn(history(
                1026L, 1, 0, 6, "500000.00", "8000000.00", 120, true, false, false
        ));
        when(profileRepository.findByCustomerId(1026L)).thenReturn(Optional.empty());
        when(profileRepository.save(any(CreditProfile.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(assessmentRepository.save(any(CreditAssessment.class))).thenAnswer(invocation -> invocation.getArgument(0));

        CreditCheckResponse response = service.checkCredit(new CreditCheckRequest(
                1026L,
                new BigDecimal("1000000.00"),
                "BNPL_30"
        ));

        assertThat(response.approved()).isFalse();
        assertThat(response.tier()).isEqualTo("POOR");
        assertThat(response.reason()).isEqualTo("ACTIVE_BAD_DEBT");
        assertThat(response.suggestedUpfrontAmount()).isEqualByComparingTo("0.00");
    }

    @Test
    void returnsPartialLimitWhenRequestedAmountExceedsAvailableLimit() {
        when(tpbankHistoryClient.getHistory(1024L)).thenReturn(history(
                1024L, 8, 8, 0, "7000000.00", "3000000.00", 0, false, false, false
        ));
        when(profileRepository.findByCustomerId(1024L)).thenReturn(Optional.empty());
        when(profileRepository.save(any(CreditProfile.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(assessmentRepository.save(any(CreditAssessment.class))).thenAnswer(invocation -> invocation.getArgument(0));

        CreditCheckResponse response = service.checkCredit(new CreditCheckRequest(
                1024L,
                new BigDecimal("12000000.00"),
                "GTHP_3M"
        ));

        assertThat(response.approved()).isFalse();
        assertThat(response.maxLoanAmount()).isEqualByComparingTo("10000000.00");
        assertThat(response.suggestedUpfrontAmount()).isEqualByComparingTo("2000000.00");
        assertThat(response.reason()).isEqualTo("PARTIAL_LIMIT_AVAILABLE");
    }

    private BorrowerHistoryResponse history(
            Long customerId,
            long totalTransactions,
            long onTimePayments,
            long missedPayments,
            String currentBalance,
            String usedCredit,
            int maxDaysPastDue,
            boolean activeBadDebt,
            boolean writeOff,
            boolean providerFraudReported
    ) {
        return new BorrowerHistoryResponse(
                customerId,
                totalTransactions,
                onTimePayments,
                missedPayments,
                maxDaysPastDue,
                new BigDecimal(currentBalance),
                new BigDecimal(usedCredit)
        );
    }
}
