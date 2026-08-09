package com.training.tpbank.service.impl;

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
import com.training.tpbank.service.BorrowerHistoryService;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;

@Service
public class BorrowerHistoryServiceImpl implements BorrowerHistoryService {

    private final BorrowerRepository borrowerRepository;
    private final BankAccountRepository bankAccountRepository;
    private final LoanRepository loanRepository;
    private final InstallmentRepository installmentRepository;
    private final PaymentRepository paymentRepository;

    public BorrowerHistoryServiceImpl(
            BorrowerRepository borrowerRepository,
            BankAccountRepository bankAccountRepository,
            LoanRepository loanRepository,
            InstallmentRepository installmentRepository,
            PaymentRepository paymentRepository
    ) {
        this.borrowerRepository = borrowerRepository;
        this.bankAccountRepository = bankAccountRepository;
        this.loanRepository = loanRepository;
        this.installmentRepository = installmentRepository;
        this.paymentRepository = paymentRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public BorrowerHistoryResponse getHistory(Long customerId) {
        Borrower borrower = borrowerRepository.findByCustomerIdAndStatus(customerId, BorrowerStatus.ACTIVE)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Borrower history not found"));

        Long borrowerId = borrower.getId();
        BigDecimal currentBalance = sumActiveBalances(borrowerId);
        BigDecimal usedCredit = sumUsedCredit(borrowerId);
        long totalTransactions = paymentRepository.countByLoanBorrowerIdAndStatus(borrowerId, PaymentStatus.SUCCESS);
        long onTimePayments = installmentRepository.countOnTimePayments(borrowerId);
        long missedPayments = installmentRepository.countMissedPayments(borrowerId);
        int maxDaysPastDue = installmentRepository.maxDaysPastDue(borrowerId);

        return new BorrowerHistoryResponse(
                borrower.getCustomerId(),
                totalTransactions,
                onTimePayments,
                missedPayments,
                maxDaysPastDue,
                currentBalance,
                usedCredit
        );
    }

    private BigDecimal sumActiveBalances(Long borrowerId) {
        return bankAccountRepository.findByBorrowerIdAndStatus(borrowerId, BankAccountStatus.ACTIVE).stream()
                .map(BankAccount::getCurrentBalance)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private BigDecimal sumUsedCredit(Long borrowerId) {
        List<LoanStatus> activeStatuses = List.of(LoanStatus.ACTIVE, LoanStatus.OVERDUE, LoanStatus.RESTRUCTURED);
        return loanRepository.findByBorrowerIdAndStatusIn(borrowerId, activeStatuses).stream()
                .map(Loan::getOutstandingPrincipal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}
