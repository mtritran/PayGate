package com.training.paygate.service.impl;

import com.training.paygate.dto.request.LoanApplyRequest;
import com.training.paygate.dto.response.LoanResponse;
import com.training.paygate.entity.Account;
import com.training.paygate.entity.Loan;
import com.training.paygate.enums.LoanStatus;
import com.training.paygate.enums.OwnerType;
import com.training.paygate.exception.BadRequestException;
import com.training.paygate.repository.AccountRepository;
import com.training.paygate.repository.LoanRepository;
import com.training.paygate.repository.LoanScheduleRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class LoanServiceImplTest {

    @Mock
    private LoanRepository loanRepository;

    @Mock
    private LoanScheduleRepository loanScheduleRepository;

    @Mock
    private AccountRepository accountRepository;

    @InjectMocks
    private LoanServiceImpl loanService;

    private Long testUserId = 100L;
    private Account testAccount;

    @BeforeEach
    void setUp() {
        testAccount = new Account();
        testAccount.setId(10L);
        testAccount.setOwnerId(testUserId);
        testAccount.setOwnerType(OwnerType.USER);
    }

    @Test
    void applyLoan_Success() {
        LoanApplyRequest request = new LoanApplyRequest(new BigDecimal("10000000"), 6, "Mua xe");

        when(loanRepository.existsByUserIdAndStatusIn(eq(testUserId), anyList())).thenReturn(false);
        when(accountRepository.findByOwnerIdAndOwnerType(testUserId, OwnerType.USER)).thenReturn(Optional.of(testAccount));

        Loan savedLoan = new Loan();
        savedLoan.setId(1L);
        savedLoan.setLoanRef("LOAN-12345678");
        savedLoan.setAmount(request.amount());
        savedLoan.setTermMonths(request.termMonths());
        savedLoan.setStatus(LoanStatus.PENDING_APPROVAL);

        when(loanRepository.save(any(Loan.class))).thenReturn(savedLoan);

        LoanResponse response = loanService.applyLoan(testUserId, request);

        assertNotNull(response);
        assertEquals("LOAN-12345678", response.loanRef());
        verify(loanRepository, times(1)).save(any(Loan.class));
    }

    @Test
    void applyLoan_InvalidTermMonths_ThrowsException() {
        LoanApplyRequest request = new LoanApplyRequest(new BigDecimal("10000000"), 5, "Mua xe");

        assertThrows(BadRequestException.class, () -> loanService.applyLoan(testUserId, request));
        verify(loanRepository, never()).save(any(Loan.class));
    }

    @Test
    void applyLoan_UserHasActiveLoan_ThrowsException() {
        LoanApplyRequest request = new LoanApplyRequest(new BigDecimal("10000000"), 6, "Mua xe");

        when(loanRepository.existsByUserIdAndStatusIn(eq(testUserId), anyList())).thenReturn(true);

        assertThrows(BadRequestException.class, () -> loanService.applyLoan(testUserId, request));
        verify(accountRepository, never()).findByOwnerIdAndOwnerType(anyLong(), any());
        verify(loanRepository, never()).save(any(Loan.class));
    }
}
