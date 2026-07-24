package com.training.paygate.repository;

import com.training.paygate.entity.LedgerEntry;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;

@Repository
public interface LedgerEntryRepository extends JpaRepository<LedgerEntry, Long> {

    List<LedgerEntry> findByTransactionId(Long transactionId);

    @Query("SELECT COALESCE(SUM(l.amount), 0) FROM LedgerEntry l WHERE l.entryType = com.training.paygate.enums.EntryType.DEBIT")
    BigDecimal sumTotalDebit();

    @Query("SELECT COALESCE(SUM(l.amount), 0) FROM LedgerEntry l WHERE l.entryType = com.training.paygate.enums.EntryType.CREDIT")
    BigDecimal sumTotalCredit();

    List<LedgerEntry> findAllByAccountId(Long accountId);

    Page<LedgerEntry> findByAccountId(Long accountId, Pageable pageable);
}
