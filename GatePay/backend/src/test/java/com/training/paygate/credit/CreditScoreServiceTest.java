package com.training.paygate.credit;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CreditScoreServiceTest {

    @Mock
    private CreditScoreRepository creditScoreRepository;

    @InjectMocks
    private CreditScoreServiceImpl creditScoreService;

    private CreditInput cleanInput(long onTime, long missed, BigDecimal bal, BigDecimal used) {
        return CreditInput.builder()
                .totalTransactions(onTime + missed)
                .onTimePayments(onTime)
                .missedPayments(missed)
                .currentBalance(bal)
                .usedCredit(used)
                .fraudScore(20)
                .build();
    }

    @Test
    void emptyInput_yieldsZeroScoreAndPoorTier() {
        CreditScore result = creditScoreService.evaluateOnly(CreditInput.builder().build());
        assertThat(result.getScore()).isZero();
        assertThat(result.getTier()).isEqualTo("POOR");
    }

    @Test
    void strongHistory_scoreHigh_tierGood() {
        CreditInput good = cleanInput(
                /*onTime*/ 15, /*missed*/ 0,
                new BigDecimal("5000000"), new BigDecimal("1000000")); // utilization 20%
        CreditScore result = creditScoreService.evaluateOnly(good);
        assertThat(result.getScore()).isEqualTo(70); // 15(exp)+15(onTime)+40(low util)=70
        assertThat(result.getTier()).isEqualTo("GOOD");
    }

    @Test
    void repeatMisses_pushScoreDown() {
        // nhiều lần trễ hạn → bị trừ mạnh (exp+onTime đều bị penalty vượt qua)
        CreditInput bad = cleanInput(
                /*onTime*/ 2, /*missed*/ 15,
                new BigDecimal("6000000"), new BigDecimal("6000000"));
        CreditScore result = creditScoreService.evaluateOnly(bad);
        assertThat(result.getScore()).isEqualTo(0);      // 17+2−40 <0 → cap 0
        assertThat(result.getTier()).isEqualTo("POOR");
    }

    @Test
    void highUtilization_penaltyApplied() {
        // used rất cao so với balance → utilization > 80% → trừ 20
        CreditInput overUtil = cleanInput(
                /*onTime*/ 10, /*missed*/ 0,
                new BigDecimal("1000000"), new BigDecimal("9000000")); // utilization 90%
        CreditScore result = creditScoreService.evaluateOnly(overUtil);
        assertThat(result.getTier()).isIn("POOR", "FAIR");
    }

    @Test
    void fraudScoreHigh_reducesCredit() {
        CreditInput same = cleanInput(10, 10, new BigDecimal("5000000"), new BigDecimal("1000000"));
        int base = creditScoreService.evaluateOnly(same).getScore();

        same.setFraudScore(80);
        int penalized = creditScoreService.evaluateOnly(same).getScore();
        assertThat(penalized).isLessThan(base);
    }

    @Test
    void evaluateAndSave_persists() {
        when(creditScoreRepository.save(any(CreditScore.class))).thenAnswer(inv -> inv.getArgument(0));
        CreditScore saved = creditScoreService.evaluateAndSave(
                7L, "khach_tot",
                cleanInput(10, 0, new BigDecimal("3000000"), new BigDecimal("1000000")));
        assertThat(saved.getUserId()).isEqualTo(7L);
        assertThat(saved.getUsername()).isEqualTo("khach_tot");
        assertThat(saved.getScore()).isGreaterThan(0);
        verify(creditScoreRepository).save(any(CreditScore.class));
    }
}