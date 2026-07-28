package com.training.paygate.service;

import com.training.paygate.dto.request.LoanApplyRequest;
import com.training.paygate.dto.request.LoanApprovalRequest;
import com.training.paygate.dto.request.LoanRepayRequest;
import com.training.paygate.dto.response.LoanResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface LoanService {

    LoanResponse applyLoan(Long userId, LoanApplyRequest request);

    Page<LoanResponse> getMyLoans(Long userId, Pageable pageable);

    LoanResponse getLoanById(Long loanId, Long currentUserId, boolean isAdmin);

    LoanResponse repayLoan(Long userId, Long loanId, LoanRepayRequest request);

    Page<LoanResponse> getAllLoansForAdmin(Pageable pageable);

    LoanResponse approveLoan(Long loanId, Long adminId, LoanApprovalRequest request);

    LoanResponse acceptLoanOffer(Long userId, Long loanId);

    byte[] generateLoanContractPdf(Long loanId, Long currentUserId, boolean isAdmin);

    LoanResponse rejectLoan(Long loanId, Long adminId, LoanApprovalRequest request);
}
