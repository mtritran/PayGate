package com.training.paygate.service.impl;

import com.training.paygate.dto.response.LedgerEntryResponse;
import com.training.paygate.dto.response.LedgerVerificationResponse;
import com.training.paygate.entity.LedgerEntry;
import com.training.paygate.exception.ResourceNotFoundException;
import com.training.paygate.mapper.LedgerEntryMapper;
import com.training.paygate.repository.AccountRepository;
import com.training.paygate.repository.LedgerEntryRepository;
import com.training.paygate.service.LedgerService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class LedgerServiceImpl implements LedgerService {

    private final LedgerEntryRepository ledgerEntryRepository;
    private final AccountRepository accountRepository;
    private final LedgerEntryMapper ledgerEntryMapper;

    @Override
    @Transactional(readOnly = true)
    public LedgerVerificationResponse verifyLedger() {
        log.info("Verifying double-entry ledger balance...");
        BigDecimal totalDebit = ledgerEntryRepository.sumTotalDebit();
        BigDecimal totalCredit = ledgerEntryRepository.sumTotalCredit();

        boolean balanced = totalDebit.compareTo(totalCredit) == 0;
        String message = balanced
                ? String.format("Ledger is balanced. Total Debit: %s, Total Credit: %s", totalDebit, totalCredit)
                : String.format("Ledger is UNBALANCED! Total Debit: %s, Total Credit: %s", totalDebit, totalCredit);

        if (!balanced) {
            log.error("LEDGER INTEGRITY VIOLATION: {}", message);
        } else {
            log.info("Ledger verification successful: {}", message);
        }

        return new LedgerVerificationResponse(balanced, totalDebit, totalCredit, message);
    }

    @Override
    @Transactional(readOnly = true)
    public List<LedgerEntryResponse> getEntriesByAccount(Long accountId) {
        log.info("Fetching ledger entries for account ID: {}", accountId);
        if (!accountRepository.existsById(accountId)) {
            throw new ResourceNotFoundException("Account", accountId);
        }
        List<LedgerEntry> entries = ledgerEntryRepository.findAllByAccountId(accountId);
        return ledgerEntryMapper.toResponseList(entries);
    }
}
