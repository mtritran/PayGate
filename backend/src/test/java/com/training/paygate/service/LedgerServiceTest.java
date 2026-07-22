package com.training.paygate.service;

import com.training.paygate.dto.response.LedgerEntryResponse;
import com.training.paygate.dto.response.LedgerVerificationResponse;
import com.training.paygate.entity.LedgerEntry;
import com.training.paygate.enums.EntryType;
import com.training.paygate.exception.ResourceNotFoundException;
import com.training.paygate.mapper.LedgerEntryMapper;
import com.training.paygate.repository.AccountRepository;
import com.training.paygate.repository.LedgerEntryRepository;
import com.training.paygate.service.impl.LedgerServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class LedgerServiceTest {

    @Mock
    private LedgerEntryRepository ledgerEntryRepository;

    @Mock
    private AccountRepository accountRepository;

    @Mock
    private LedgerEntryMapper ledgerEntryMapper;

    @InjectMocks
    private LedgerServiceImpl ledgerService;

    @Test
    void verifyLedger_balanced_returnsTrue() {
        // Given
        BigDecimal totalDebit = new BigDecimal("150000.00");
        BigDecimal totalCredit = new BigDecimal("150000.00");

        when(ledgerEntryRepository.sumTotalDebit()).thenReturn(totalDebit);
        when(ledgerEntryRepository.sumTotalCredit()).thenReturn(totalCredit);

        // When
        LedgerVerificationResponse response = ledgerService.verifyLedger();

        // Then
        assertThat(response.balanced()).isTrue();
        assertThat(response.totalDebit()).isEqualTo(totalDebit);
        assertThat(response.totalCredit()).isEqualTo(totalCredit);
        assertThat(response.message()).contains("balanced");
    }

    @Test
    void verifyLedger_unbalanced_returnsFalse() {
        // Given
        BigDecimal totalDebit = new BigDecimal("150000.00");
        BigDecimal totalCredit = new BigDecimal("149000.00");

        when(ledgerEntryRepository.sumTotalDebit()).thenReturn(totalDebit);
        when(ledgerEntryRepository.sumTotalCredit()).thenReturn(totalCredit);

        // When
        LedgerVerificationResponse response = ledgerService.verifyLedger();

        // Then
        assertThat(response.balanced()).isFalse();
        assertThat(response.totalDebit()).isEqualTo(totalDebit);
        assertThat(response.totalCredit()).isEqualTo(totalCredit);
        assertThat(response.message()).contains("UNBALANCED");
    }

    @Test
    void getEntriesByAccount_accountNotFound_throwsException() {
        // Given
        Long accountId = 999L;
        when(accountRepository.existsById(accountId)).thenReturn(false);

        // When & Then
        assertThatThrownBy(() -> ledgerService.getEntriesByAccount(accountId))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Account");
    }

    @Test
    void getEntriesByAccount_accountExists_returnsList() {
        // Given
        Long accountId = 1L;
        LedgerEntry entry = LedgerEntry.builder()
                .id(10L)
                .transactionId(100L)
                .accountId(accountId)
                .entryType(EntryType.DEBIT)
                .amount(new BigDecimal("100.00"))
                .balanceAfter(new BigDecimal("900.00"))
                .createdAt(LocalDateTime.now())
                .build();
        List<LedgerEntry> entries = List.of(entry);

        LedgerEntryResponse responseDto = new LedgerEntryResponse(
                10L, 100L, accountId, "DEBIT", new BigDecimal("100.00"), new BigDecimal("900.00"), entry.getCreatedAt()
        );
        List<LedgerEntryResponse> responseList = List.of(responseDto);

        when(accountRepository.existsById(accountId)).thenReturn(true);
        when(ledgerEntryRepository.findAllByAccountId(accountId)).thenReturn(entries);
        when(ledgerEntryMapper.toResponseList(entries)).thenReturn(responseList);

        // When
        List<LedgerEntryResponse> result = ledgerService.getEntriesByAccount(accountId);

        // Then
        assertThat(result).hasSize(1);
        assertThat(result.get(0).id()).isEqualTo(10L);
        assertThat(result.get(0).entryType()).isEqualTo("DEBIT");
    }
}
