package com.training.paygate.service.impl;

import com.training.paygate.dto.request.LoanApplyRequest;
import com.training.paygate.dto.request.LoanApprovalRequest;
import com.training.paygate.dto.request.LoanRepayRequest;
import com.training.paygate.dto.request.PaymentRequest;
import com.training.paygate.dto.response.LoanResponse;
import com.training.paygate.dto.response.LoanScheduleResponse;
import com.training.paygate.dto.response.TransactionResponse;
import com.training.paygate.entity.Account;
import com.training.paygate.entity.Loan;
import com.training.paygate.entity.LoanSchedule;
import com.training.paygate.entity.User;
import com.training.paygate.enums.LoanScheduleStatus;
import com.training.paygate.enums.LoanStatus;
import com.training.paygate.enums.OwnerType;
import com.training.paygate.enums.RepayType;
import com.training.paygate.enums.TransactionType;
import com.training.paygate.exception.BadRequestException;
import com.training.paygate.exception.ResourceNotFoundException;
import com.training.paygate.messaging.event.PaymentCompletedEvent;
import com.training.paygate.repository.AccountRepository;
import com.training.paygate.repository.LoanRepository;
import com.training.paygate.repository.LoanScheduleRepository;
import com.training.paygate.service.LoanService;
import com.training.paygate.service.TransactionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.amqp.core.AmqpTemplate;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class LoanServiceImpl implements LoanService {

    private final LoanRepository loanRepository;
    private final LoanScheduleRepository loanScheduleRepository;
    private final AccountRepository accountRepository;
    private final com.training.paygate.repository.UserRepository userRepository;
    private final TransactionService transactionService;
    private final com.training.paygate.service.EmailService emailService;
    private final AmqpTemplate amqpTemplate;
    private final com.training.paygate.service.NotificationService notificationService;
    private final com.training.paygate.repository.BnplProfileRepository bnplProfileRepository;

    private static final BigDecimal FIXED_MONTHLY_INTEREST_RATE = new BigDecimal("0.015"); // 1.5% per month

    @Override
    @Transactional
    public LoanResponse applyLoan(Long userId, LoanApplyRequest request) {
        // Validate term months (must be 1, 3, 6, or 12)
        if (!List.of(1, 3, 6, 12).contains(request.termMonths())) {
            throw new BadRequestException("Term months must be 1, 3, 6, or 12");
        }

        // Validate user does not already have an active or pending loan
        boolean hasActiveOrPending = loanRepository.existsByUserIdAndStatusIn(
                userId,
                List.of(LoanStatus.PENDING_APPROVAL, LoanStatus.OFFERED, LoanStatus.ACTIVE, LoanStatus.OVERDUE));
        if (hasActiveOrPending) {
            throw new BadRequestException(
                    "Bạn đang có một khoản vay chưa hoàn tất (đang duyệt, chờ ký hoặc đang hoạt động). Vui lòng hoàn tất hoặc trả nợ khoản vay hiện tại trước khi tạo đơn mới.");
        }

        Account userAccount = accountRepository.findByOwnerIdAndOwnerType(userId, OwnerType.USER)
                .orElseThrow(() -> new ResourceNotFoundException("Account for user", userId));

        // Calculations
        BigDecimal totalInterest = request.amount()
                .multiply(FIXED_MONTHLY_INTEREST_RATE)
                .multiply(new BigDecimal(request.termMonths()));
        BigDecimal totalRepayable = request.amount().add(totalInterest);
        BigDecimal monthlyAmount = totalRepayable.divide(new BigDecimal(request.termMonths()), 2, RoundingMode.HALF_UP);

        String loanRef = "LOAN-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();

        Loan loan = Loan.builder()
                .userId(userId)
                .accountId(userAccount.getId())
                .loanRef(loanRef)
                .amount(request.amount())
                .interestRate(FIXED_MONTHLY_INTEREST_RATE.multiply(new BigDecimal("100")))
                .termMonths(request.termMonths())
                .monthlyAmount(monthlyAmount)
                .totalRepayable(totalRepayable)
                .remainingAmount(totalRepayable)
                .reason(request.reason())
                .status(LoanStatus.PENDING_APPROVAL)
                .build();

        Loan saved = loanRepository.save(loan);
        log.info("[LOAN] User {} applied for loan {} of amount {}", userId, loanRef, request.amount());

        return mapToLoanResponse(saved, List.of());
    }

    @Override
    @Transactional(readOnly = true)
    public Page<LoanResponse> getMyLoans(Long userId, Pageable pageable) {
        return loanRepository.findByUserId(userId, pageable)
                .map(loan -> mapToLoanResponse(loan, getSchedulesForLoan(loan.getId())));
    }

    @Override
    @Transactional(readOnly = true)
    public LoanResponse getLoanById(Long loanId, Long currentUserId, boolean isAdmin) {
        Loan loan = loanRepository.findById(loanId)
                .orElseThrow(() -> new ResourceNotFoundException("Loan", loanId));

        if (!isAdmin && !loan.getUserId().equals(currentUserId)) {
            throw new BadRequestException("Access denied to loan details");
        }

        return mapToLoanResponse(loan, getSchedulesForLoan(loan.getId()));
    }

    @Override
    @Transactional
    public LoanResponse approveLoan(Long loanId, Long adminId, LoanApprovalRequest request) {
        Loan loan = loanRepository.findById(loanId)
                .orElseThrow(() -> new ResourceNotFoundException("Loan", loanId));

        if (loan.getStatus() != LoanStatus.PENDING_APPROVAL) {
            throw new BadRequestException("Loan is not in PENDING_APPROVAL status");
        }

        // Generate Loan Schedules
        List<LoanSchedule> schedules = new ArrayList<>();
        LocalDate now = LocalDate.now();
        for (int i = 1; i <= loan.getTermMonths(); i++) {
            LoanSchedule schedule = LoanSchedule.builder()
                    .loan(loan)
                    .periodNumber(i)
                    .amountDue(loan.getMonthlyAmount())
                    .dueDate(now.plusMonths(i))
                    .status(LoanScheduleStatus.PENDING)
                    .build();
            schedules.add(schedule);
        }
        loanScheduleRepository.saveAll(schedules);

        loan.setStatus(LoanStatus.OFFERED);
        loan.setApprovedBy(adminId);
        loan.setAdminNote(request != null ? request.adminNote()
                : "Approved loan offer. Waiting for borrower agreement signature.");

        Loan saved = loanRepository.save(loan);
        log.info("[LOAN] Admin {} approved offer for loan {}. Status: OFFERED", adminId, loan.getLoanRef());

        return mapToLoanResponse(saved, getSchedulesForLoan(saved.getId()));
    }

    @Override
    @Transactional
    public LoanResponse acceptLoanOffer(Long userId, Long loanId) {
        Loan loan = loanRepository.findById(loanId)
                .orElseThrow(() -> new ResourceNotFoundException("Loan", loanId));

        if (!loan.getUserId().equals(userId)) {
            throw new BadRequestException("Access denied to loan");
        }

        if (loan.getStatus() != LoanStatus.OFFERED && loan.getStatus() != LoanStatus.PENDING_APPROVAL) {
            throw new BadRequestException(
                    "Khoản vay không ở trạng thái chờ ký hợp đồng (Trạng thái hiện tại: " + loan.getStatus() + ")");
        }

        // Generate schedule if not already present
        List<LoanSchedule> existingSchedules = loanScheduleRepository.findByLoanIdOrderByPeriodNumberAsc(loanId);
        if (existingSchedules.isEmpty()) {
            List<LoanSchedule> schedules = new ArrayList<>();
            LocalDate now = LocalDate.now();
            for (int i = 1; i <= loan.getTermMonths(); i++) {
                LoanSchedule schedule = LoanSchedule.builder()
                        .loan(loan)
                        .periodNumber(i)
                        .amountDue(loan.getMonthlyAmount())
                        .dueDate(now.plusMonths(i))
                        .status(LoanScheduleStatus.PENDING)
                        .build();
                schedules.add(schedule);
            }
            loanScheduleRepository.saveAll(schedules);
        }

        Account systemAccount = accountRepository.findByOwnerIdAndOwnerType(0L, OwnerType.SYSTEM)
                .orElseGet(() -> accountRepository.findAll().stream()
                        .filter(a -> a.getOwnerType() == OwnerType.SYSTEM).findFirst()
                        .orElseThrow(() -> new ResourceNotFoundException("SYSTEM Account not found")));

        // Ensure SYSTEM account has ample liquidity reserve for disbursement
        if (systemAccount.getBalance() == null || systemAccount.getBalance().compareTo(loan.getAmount()) < 0) {
            systemAccount.setBalance(new BigDecimal("10000000000.00"));
            systemAccount = accountRepository.save(systemAccount);
            log.info("[LOAN DISBURSEMENT] Provided 10 Billion VND liquidity reserve to SYSTEM Account {}",
                    systemAccount.getAccountNumber());
        }

        Account userAccount = accountRepository.findById(loan.getAccountId())
                .orElseThrow(() -> new ResourceNotFoundException("User Account not found", loan.getAccountId()));

        User borrower = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));

        // 1. Perform Disbursement Transfer: SYSTEM -> USER
        PaymentRequest disbursePaymentReq = new PaymentRequest(
                "IDEM-DISBURSE-" + loan.getLoanRef(),
                userAccount.getId(),
                loan.getAmount(),
                "Giải ngân khoản vay " + loan.getLoanRef(),
                null,
                null);

        User systemUser = userRepository.findById(systemAccount.getOwnerId())
                .orElseGet(() -> userRepository.findAll().stream()
                        .filter(u -> u.getRole() == com.training.paygate.enums.Role.ADMIN).findFirst()
                        .orElseThrow(() -> new ResourceNotFoundException("SYSTEM User not found")));

        TransactionResponse txResponse = transactionService.processPayment(disbursePaymentReq,
                systemUser.getUsername(), "internal");
        log.info("[LOAN] Disbursement completed for loan {}: transaction ref {}", loan.getLoanRef(),
                txResponse.transactionRef());

        // 2. Activate Loan
        loan.setStatus(LoanStatus.ACTIVE);
        loan.setDisbursedAt(LocalDateTime.now());
        Loan saved = loanRepository.save(loan);

        // 3. Generate PDF Agreement & Send Email to User's Gmail
        try {
            List<LoanSchedule> schedules = loanScheduleRepository.findByLoanIdOrderByPeriodNumberAsc(saved.getId());
            byte[] pdfBytes = com.training.paygate.util.LoanContractPdfGenerator.generateContractPdf(saved, borrower,
                    schedules);
            String fileName = "HopDongVay_PayGate_" + saved.getLoanRef() + ".pdf";

            if (borrower.getEmail() != null && !borrower.getEmail().isBlank()) {
                emailService.sendLoanContractEmail(
                        borrower.getEmail(),
                        borrower.getFullName() != null ? borrower.getFullName() : borrower.getUsername(),
                        saved.getLoanRef(),
                        saved.getAmount(),
                        pdfBytes,
                        fileName);
            }
        } catch (Exception e) {
            log.error("[LOAN CONTRACT PDF] Error generating or emailing PDF contract for loan {}: {}",
                    loan.getLoanRef(), e.getMessage());
        }

        return mapToLoanResponse(saved, getSchedulesForLoan(saved.getId()));
    }

    @Override
    @Transactional(readOnly = true)
    public byte[] generateLoanContractPdf(Long loanId, Long currentUserId, boolean isAdmin) {
        Loan loan = loanRepository.findById(loanId)
                .orElseThrow(() -> new ResourceNotFoundException("Loan", loanId));

        User currentUser = userRepository.findById(currentUserId).orElse(null);
        boolean userIsAdmin = isAdmin
                || (currentUser != null && currentUser.getRole() == com.training.paygate.enums.Role.ADMIN);

        if (!userIsAdmin && !loan.getUserId().equals(currentUserId)) {
            throw new BadRequestException("Access denied to loan contract");
        }

        User user = userRepository.findById(loan.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User", loan.getUserId()));

        try {
            List<LoanSchedule> schedules = loanScheduleRepository.findByLoanIdOrderByPeriodNumberAsc(loanId);
            return com.training.paygate.util.LoanContractPdfGenerator.generateContractPdf(loan, user, schedules);
        } catch (Exception e) {
            log.error("Failed to generate PDF for loan {}: {}", loanId, e.getMessage(), e);
            throw new BadRequestException("Could not generate loan contract PDF: " + e.getMessage());
        }
    }

    @Override
    @Transactional
    public LoanResponse rejectLoan(Long loanId, Long adminId, LoanApprovalRequest request) {
        Loan loan = loanRepository.findById(loanId)
                .orElseThrow(() -> new ResourceNotFoundException("Loan", loanId));

        if (loan.getStatus() != LoanStatus.PENDING_APPROVAL) {
            throw new BadRequestException("Loan is not in PENDING_APPROVAL status");
        }

        loan.setStatus(LoanStatus.REJECTED);
        loan.setApprovedBy(adminId);
        loan.setAdminNote(request != null ? request.adminNote() : "Rejected by admin");

        Loan saved = loanRepository.save(loan);
        return mapToLoanResponse(saved, List.of());
    }

    @Override
    @Transactional
    public LoanResponse repayLoan(Long userId, Long loanId, LoanRepayRequest request) {
        Loan loan = loanRepository.findById(loanId)
                .orElseThrow(() -> new ResourceNotFoundException("Loan", loanId));

        if (!loan.getUserId().equals(userId)) {
            throw new BadRequestException("Access denied to loan");
        }

        if (loan.getStatus() != LoanStatus.ACTIVE && loan.getStatus() != LoanStatus.OVERDUE) {
            throw new BadRequestException("Loan is not active or overdue for repayment");
        }

        Account systemAccount = accountRepository.findByOwnerIdAndOwnerType(0L, OwnerType.SYSTEM)
                .orElseThrow(() -> new ResourceNotFoundException("SYSTEM Account not found", 0L));

        BigDecimal amountToPay;
        LoanSchedule scheduleToPay = null;

        if (request.repayType() == RepayType.NEXT_PERIOD) {
            scheduleToPay = loanScheduleRepository
                    .findFirstByLoanIdAndStatusOrderByPeriodNumberAsc(loanId, LoanScheduleStatus.PENDING)
                    .orElseThrow(() -> new BadRequestException("No pending schedule found to pay"));
            amountToPay = scheduleToPay.getAmountDue();
        } else {
            // FULL_SETTLEMENT
            amountToPay = loan.getRemainingAmount();
        }

        // Perform repayment: USER -> SYSTEM via processPayment
        PaymentRequest repayPaymentReq = new PaymentRequest(
                "IDEM-REPAY-" + loan.getLoanRef() + "-" + System.currentTimeMillis(),
                systemAccount.getId(),
                amountToPay,
                "Trả nợ khoản vay " + loan.getLoanRef(),
                null,
                TransactionType.LOAN_REPAYMENT);

        User borrower = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));

        TransactionResponse txResponse = transactionService.processPayment(repayPaymentReq, borrower.getUsername(), "internal");
        log.info("[LOAN] Repayment transaction completed: ref {}", txResponse.transactionRef());


        // Update schedule status
        if (request.repayType() == RepayType.NEXT_PERIOD && scheduleToPay != null) {
            scheduleToPay.setStatus(LoanScheduleStatus.PROCESSING);
            scheduleToPay.setTransactionRef(txResponse.transactionRef());
            loanScheduleRepository.save(scheduleToPay);
        } else {
            // Mark all remaining pending schedules as PROCESSING
            List<LoanSchedule> pendingSchedules = loanScheduleRepository.findByLoanIdOrderByPeriodNumberAsc(loanId);
            for (LoanSchedule s : pendingSchedules) {
                if (s.getStatus() == LoanScheduleStatus.PENDING) {
                    s.setStatus(LoanScheduleStatus.PROCESSING);
                    s.setTransactionRef(txResponse.transactionRef());
                }
            }
            loanScheduleRepository.saveAll(pendingSchedules);
        }
        String notifMsg = String.format("Bạn đã thanh toán thành công %s VND cho khoản vay %s.", 
                amountToPay, loan.getLoanRef());
        notificationService.createNotification(userId, "Thanh toán khoản vay", notifMsg, "LOAN_REPAYMENT");

        return mapToLoanResponse(loan, getSchedulesForLoan(loan.getId()));
    }

    @Override
    @Transactional(readOnly = true)
    public Page<LoanResponse> getAllLoansForAdmin(Pageable pageable) {
        return loanRepository.findAll(pageable)
                .map(loan -> mapToLoanResponse(loan, getSchedulesForLoan(loan.getId())));
    }

    @RabbitListener(queues = "${rabbitmq.queue.loan:loan.queue}")
    @Transactional
    public void handlePaymentCompleted(PaymentCompletedEvent event) {
        if (event == null || event.transactionType() != TransactionType.LOAN_REPAYMENT) {
            return;
        }

        List<LoanSchedule> schedules = loanScheduleRepository.findByTransactionRef(event.transactionRef());
        if (schedules.isEmpty()) {
            return;
        }

        Loan loan = schedules.get(0).getLoan();

        if ("COMPLETED".equalsIgnoreCase(event.status())) {
            for (LoanSchedule s : schedules) {
                if (s.getStatus() == LoanScheduleStatus.PROCESSING) {
                    s.setStatus(LoanScheduleStatus.PAID);
                    s.setPaidAt(LocalDateTime.now());
                }
            }
            loanScheduleRepository.saveAll(schedules);

            BigDecimal newRemaining = loan.getRemainingAmount().subtract(event.amount());
            if (newRemaining.compareTo(BigDecimal.ZERO) <= 0) {
                newRemaining = BigDecimal.ZERO;
                loan.setStatus(LoanStatus.PAID_OFF);
            }
            loan.setRemainingAmount(newRemaining);
            loanRepository.save(loan);

            // Auto-increase approved limit by the repaid amount
            bnplProfileRepository.findByUserId(loan.getUserId()).ifPresent(profile -> {
                profile.setApprovedLimit(profile.getApprovedLimit().add(event.amount()));
                bnplProfileRepository.save(profile);
                log.info("[LOAN] Increased BNPL limit for user {} by {}", loan.getUserId(), event.amount());
            });
        } else if ("FAILED".equalsIgnoreCase(event.status())) {
            for (LoanSchedule s : schedules) {
                if (s.getStatus() == LoanScheduleStatus.PROCESSING) {
                    s.setStatus(LoanScheduleStatus.PENDING);
                    s.setTransactionRef(null);
                }
            }
            loanScheduleRepository.saveAll(schedules);
        }
    }

    private List<LoanScheduleResponse> getSchedulesForLoan(Long loanId) {
        return loanScheduleRepository.findByLoanIdOrderByPeriodNumberAsc(loanId).stream()
                .map(s -> LoanScheduleResponse.builder()
                        .id(s.getId())
                        .periodNumber(s.getPeriodNumber())
                        .amountDue(s.getAmountDue())
                        .dueDate(s.getDueDate())
                        .status(s.getStatus())
                        .paidAt(s.getPaidAt())
                        .transactionRef(s.getTransactionRef())
                        .build())
                .toList();
    }

    private LoanResponse mapToLoanResponse(Loan loan, List<LoanScheduleResponse> schedules) {
        return LoanResponse.builder()
                .id(loan.getId())
                .loanRef(loan.getLoanRef())
                .amount(loan.getAmount())
                .interestRate(loan.getInterestRate())
                .termMonths(loan.getTermMonths())
                .monthlyAmount(loan.getMonthlyAmount())
                .totalRepayable(loan.getTotalRepayable())
                .remainingAmount(loan.getRemainingAmount())
                .reason(loan.getReason())
                .status(loan.getStatus())
                .adminNote(loan.getAdminNote())
                .disbursedAt(loan.getDisbursedAt())
                .createdAt(loan.getCreatedAt())
                .schedules(schedules)
                .build();
    }
}
