package com.training.tpbank.service;

import com.training.tpbank.dto.BorrowerHistoryResponse;
import com.training.tpbank.entity.BankAccount;
import com.training.tpbank.entity.Borrower;
import com.training.tpbank.entity.Loan;
import com.training.tpbank.enums.BankAccountStatus;
import com.training.tpbank.enums.BorrowerStatus;
import com.training.tpbank.enums.LoanStatus;
import com.training.tpbank.enums.PaymentStatus;
import com.training.tpbank.repository.BankAccountRepository;
import com.training.tpbank.repository.BorrowerRepository;
import com.training.tpbank.repository.InstallmentRepository;
import com.training.tpbank.repository.LoanRepository;
import com.training.tpbank.repository.PaymentRepository;
import com.training.tpbank.service.impl.BorrowerHistoryServiceImpl;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class BorrowerHistoryServiceTest {

    private final BorrowerRepository borrowerRepository = mock(BorrowerRepository.class);
    private final BankAccountRepository bankAccountRepository = mock(BankAccountRepository.class);
    private final LoanRepository loanRepository = mock(LoanRepository.class);
    private final InstallmentRepository installmentRepository = mock(InstallmentRepository.class);
    private final PaymentRepository paymentRepository = mock(PaymentRepository.class);

    private final BorrowerHistoryService service = new BorrowerHistoryServiceImpl(
            borrowerRepository,
            bankAccountRepository,
            loanRepository,
            installmentRepository,
            paymentRepository
    );

    @Test
    void returnsCalculatedBorrowerHistory() {
        Borrower borrower = mock(Borrower.class);
        BankAccount account = mock(BankAccount.class);
        Loan loan = mock(Loan.class);

        when(borrower.getId()).thenReturn(1L);
        when(borrower.getCustomerId()).thenReturn(1024L);
        when(account.getCurrentBalance()).thenReturn(new BigDecimal("7000000.00"));
        when(loan.getOutstandingPrincipal()).thenReturn(new BigDecimal("3000000.00"));
        when(borrowerRepository.findByCustomerIdAndStatus(1024L, BorrowerStatus.ACTIVE))
                .thenReturn(Optional.of(borrower));
        when(bankAccountRepository.findByBorrowerIdAndStatus(1L, BankAccountStatus.ACTIVE))
                .thenReturn(List.of(account));
        when(loanRepository.findByBorrowerIdAndStatusIn(
                1L,
                List.of(LoanStatus.ACTIVE, LoanStatus.OVERDUE, LoanStatus.RESTRUCTURED)
        )).thenReturn(List.of(loan));
        when(paymentRepository.countByLoanBorrowerIdAndStatus(1L, PaymentStatus.SUCCESS)).thenReturn(18L);
        when(installmentRepository.countOnTimePayments(1L)).thenReturn(8L);
        when(installmentRepository.countMissedPayments(1L)).thenReturn(1L);
        when(installmentRepository.maxDaysPastDue(1L)).thenReturn(2);

        BorrowerHistoryResponse history = service.getHistory(1024L);

        assertThat(history.customerId()).isEqualTo(1024L);
        assertThat(history.totalTransactions()).isEqualTo(18);
        assertThat(history.onTimePayments()).isEqualTo(8);
        assertThat(history.missedPayments()).isEqualTo(1);
        assertThat(history.maxDaysPastDue()).isEqualTo(2);
        assertThat(history.currentBalance()).isEqualByComparingTo("7000000.00");
        assertThat(history.usedCredit()).isEqualByComparingTo("3000000.00");
    }

    @Test
    void rejectsUnknownBorrower() {
        when(borrowerRepository.findByCustomerIdAndStatus(9999L, BorrowerStatus.ACTIVE))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getHistory(9999L))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Borrower history not found");
    }
}
