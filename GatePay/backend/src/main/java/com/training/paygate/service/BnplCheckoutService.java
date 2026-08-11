package com.training.paygate.service;

import com.training.paygate.dto.client.CicCreditCheckRequest;
import com.training.paygate.dto.client.CicCreditCheckResponse;
import com.training.paygate.dto.request.BnplBorrowerProfileRequest;
import com.training.paygate.dto.request.BnplProposalCreateRequest;
import com.training.paygate.dto.response.BnplCheckoutResponse;
import com.training.paygate.dto.response.BnplProposalResponse;
import com.training.paygate.entity.Account;
import com.training.paygate.entity.BnplProposal;
import com.training.paygate.entity.CheckoutSession;
import com.training.paygate.entity.Loan;
import com.training.paygate.entity.LoanSchedule;
import com.training.paygate.entity.Transaction;
import com.training.paygate.entity.User;
import com.training.paygate.enums.AccountStatus;
import com.training.paygate.enums.LoanScheduleStatus;
import com.training.paygate.enums.LoanStatus;
import com.training.paygate.enums.OwnerType;
import com.training.paygate.enums.TransactionStatus;
import com.training.paygate.enums.TransactionType;
import com.training.paygate.exception.BadRequestException;
import com.training.paygate.exception.ResourceNotFoundException;
import com.training.paygate.integration.cic.CicClient;
import com.training.paygate.repository.AccountRepository;
import com.training.paygate.repository.BnplProposalRepository;
import com.training.paygate.repository.CheckoutSessionRepository;
import com.training.paygate.repository.LoanRepository;
import com.training.paygate.repository.LoanScheduleRepository;
import com.training.paygate.repository.TransactionRepository;
import com.training.paygate.repository.UserRepository;
import com.training.paygate.messaging.publisher.PaymentEventPublisher;
import com.training.paygate.messaging.event.PaymentCompletedEvent;
import com.training.paygate.repository.MerchantRepository;
import com.training.paygate.entity.Merchant;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import com.training.paygate.entity.BnplProfile;
import com.training.paygate.repository.BnplProfileRepository;

import com.training.paygate.service.NotificationService;

@Service
@RequiredArgsConstructor
public class BnplCheckoutService {

    private static final BigDecimal ZERO = BigDecimal.ZERO.setScale(2);
    private static final String STATUS_CREDIT_APPROVED = "CREDIT_APPROVED";
    private static final String STATUS_PENDING_CONFIRMATION = "PENDING_CONFIRMATION";
    private static final String STATUS_APPROVED = "APPROVED";
    private static final String STATUS_SUCCESS = "SUCCESS";
    private static final Set<String> TERMINAL_CHECKOUT_STATUSES = Set.of(
            STATUS_SUCCESS, "CANCELLED", "EXPIRED", "FAILED");

    private final CheckoutSessionRepository checkoutSessionRepository;
    private final BnplProposalRepository proposalRepository;
    private final UserRepository userRepository;
    private final AccountRepository accountRepository;
    private final LoanRepository loanRepository;
    private final LoanScheduleRepository loanScheduleRepository;
    private final TransactionRepository transactionRepository;
    private final CicClient cicClient;
    private final AccountService accountService;
    private final BnplProfileRepository bnplProfileRepository;
    private final NotificationService notificationService;
    private final PaymentEventPublisher paymentEventPublisher;
    private final MerchantRepository merchantRepository;

    @Transactional
    public BnplCheckoutResponse selectCustomer(String token, Long customerId) {
        CheckoutSession session = checkout(token);
        userRepository.findById(customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer", customerId));
        accountRepository.findByOwnerIdAndOwnerType(customerId, OwnerType.USER)
                .orElseThrow(() -> new ResourceNotFoundException("Customer account", customerId));

        session.setCustomerId(customerId);
        checkoutSessionRepository.save(session);
        return checkoutResponse(session);
    }

    @Transactional
    public BnplCheckoutResponse submitBorrowerProfile(String token, BnplBorrowerProfileRequest request, String username) {
        CheckoutSession session = checkout(token);
        if (!"BNPL".equalsIgnoreCase(session.getMethod())) {
            throw new BadRequestException("Checkout is not BNPL");
        }
        if (session.getMerchantCustomerRef() == null || session.getMerchantCustomerRef().isBlank()) {
            throw new BadRequestException("Checkout has no Marketplace customer reference");
        }

        if (username == null || username.isBlank()) {
            throw new BadRequestException("PayGate login is required before BNPL assessment");
        }

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new BadRequestException("Authenticated PayGate user not found"));
        if (!user.isActive()) {
            throw new BadRequestException("PayGate user account is inactive");
        }
        checkoutSessionRepository
                .findFirstByMerchantIdAndMerchantCustomerRefAndCustomerIdIsNotNullOrderByCreatedAtDesc(
                        session.getMerchantId(),
                        session.getMerchantCustomerRef()
                )
                .filter(linked -> !linked.getToken().equals(session.getToken()))
                .ifPresent(linked -> {
                    if (!linked.getCustomerId().equals(user.getId())) {
                        throw new BadRequestException("Marketplace customer is already linked to another PayGate account");
                    }
                });

        ensureCustomerAccount(user.getId());

        session.setCustomerId(user.getId());
        session.setCustomerName(request.fullName());
        session.setOccupation(request.occupation());
        session.setCompanyName(request.companyName());
        session.setMonthlyIncome(request.monthlyIncome());
        session.setRelative1Name(request.relative1Name());
        session.setRelative1Phone(request.relative1Phone());
        session.setRelative1Relationship(request.relative1Relationship());
        session.setRelative2Name(request.relative2Name());
        session.setRelative2Phone(request.relative2Phone());
        session.setRelative2Relationship(request.relative2Relationship());
        checkoutSessionRepository.save(session);
        
        // Save to BnplProfile as well so it is persisted across checkouts
        BnplProfile profile = bnplProfileRepository.findByUserId(user.getId())
                .orElseGet(() -> BnplProfile.builder().userId(user.getId()).build());
        profile.setOccupation(request.occupation());
        profile.setCompanyName(request.companyName());
        profile.setMonthlyIncome(request.monthlyIncome());
        profile.setRelative1Name(request.relative1Name());
        profile.setRelative1Phone(request.relative1Phone());
        profile.setRelative1Relationship(request.relative1Relationship());
        profile.setRelative2Name(request.relative2Name());
        profile.setRelative2Phone(request.relative2Phone());
        profile.setRelative2Relationship(request.relative2Relationship());
        bnplProfileRepository.save(profile);

        return checkoutResponse(session);
    }

    @Transactional
    public BnplCheckoutResponse assessCredit(String token) {
        CheckoutSession session = checkout(token);
        if (session.getCustomerId() == null) {
            throw new BadRequestException("Checkout has no customer");
        }

        session.setStatus("CREDIT_CHECKING");
        checkoutSessionRepository.save(session);

        CicCreditCheckResponse cic = cicClient.checkCredit(new CicCreditCheckRequest(
                session.getCustomerId(),
                requestedFinanceAmount(session),
                "BNPL"
        ));
        if (cic == null) {
            throw new BadRequestException("CIC did not return assessment");
        }

        BigDecimal finalApprovedLimit = nullToZero(cic.approvedLimit());

        // Apply the 70% income rule to get the true limit, matching BnplProfileService
        java.util.Optional<com.training.paygate.entity.BnplProfile> profileOpt = bnplProfileRepository.findByUserId(session.getCustomerId());
        if (profileOpt.isPresent()) {
            com.training.paygate.entity.BnplProfile profile = profileOpt.get();
            BigDecimal calculatedLimit = profile.getMonthlyIncome() != null ? 
                    profile.getMonthlyIncome().multiply(new BigDecimal("0.70")) : BigDecimal.ZERO;
            finalApprovedLimit = finalApprovedLimit.max(calculatedLimit);
            if (profile.getApprovedLimit() != null) {
                finalApprovedLimit = finalApprovedLimit.max(profile.getApprovedLimit());
            }

            profile.setCreditScore(cic.score());
            profile.setRiskGrade(cic.tier());
            profile.setApprovedLimit(finalApprovedLimit);
            profile.setAssessmentReason(cic.reason());
            bnplProfileRepository.save(profile);
        }

        session.setCreditScore(cic.score());
        session.setRiskGrade(cic.tier());
        session.setApprovedLimit(finalApprovedLimit);
        session.setMaximumFinancedAmount(requestedFinanceAmount(session).min(finalApprovedLimit));
        session.setAssessmentReason(cic.reason());
        session.setStatus(cic.approved() || requestedFinanceAmount(session).min(finalApprovedLimit).compareTo(ZERO) > 0 ? "CREDIT_APPROVED" : "CREDIT_DECLINED");
        checkoutSessionRepository.save(session);

        if ("CREDIT_DECLINED".equals(session.getStatus())) {
            throw new BadRequestException("Credit declined: " + cic.reason());
        }
        return checkoutResponse(session);
    }

    @Transactional
    public BnplProposalResponse createProposal(String token, BnplProposalCreateRequest request, String username) {
        CheckoutSession session = checkout(token);
        User user = authenticatedUser(username);
        bindSessionToAuthenticatedUser(session, user);
        ensureCustomerAccount(user.getId());

        BnplProfile profile = bnplProfileRepository.findByUserIdForUpdate(user.getId())
                .orElseThrow(() -> new BadRequestException(
                        "No pre-approved credit profile found. Please complete the borrower profile first."));
        if (profile.getApprovedLimit() == null || profile.getApprovedLimit().compareTo(ZERO) <= 0) {
            throw new BadRequestException("No pre-approved credit limit found. Please complete credit assessment first.");
        }
        if (proposalRepository.existsByCheckoutToken(session.getToken())) {
            throw new BadRequestException("A BNPL proposal already exists for this checkout session");
        }

        BigDecimal availableCredit = availableCredit(user.getId(), profile.getApprovedLimit());
        BigDecimal maxFinanced = availableCredit.min(session.getAmount());
        session.setStatus(STATUS_CREDIT_APPROVED);
        session.setApprovedLimit(profile.getApprovedLimit());
        session.setMaximumFinancedAmount(maxFinanced);
        session.setRiskGrade(profile.getRiskGrade());
        session.setCreditScore(profile.getCreditScore());
        session.setAssessmentReason("Pre-approved — available credit checked");
        checkoutSessionRepository.save(session);

        if (request.financedAmount().compareTo(maxFinanced) > 0) {
            throw new BadRequestException("Financed amount exceeds maximum financed amount");
        }
        if (request.financedAmount().compareTo(session.getAmount()) > 0) {
            throw new BadRequestException("Financed amount exceeds order amount");
        }

        BigDecimal upfrontAmount = session.getAmount().subtract(request.financedAmount()).max(ZERO);
        
        BigDecimal interestRate = new BigDecimal("0.015");
        BigDecimal totalInterest = request.financedAmount().multiply(interestRate).multiply(BigDecimal.valueOf(request.tenorMonths()));
        BigDecimal totalRepayable = request.financedAmount().add(totalInterest);
        BigDecimal monthlyInstallment = totalRepayable
                .divide(BigDecimal.valueOf(request.tenorMonths()), 2, RoundingMode.HALF_UP);

        BnplProposal proposal = BnplProposal.builder()
                .proposalRef("PROP_" + UUID.randomUUID().toString().substring(0, 8).toUpperCase())
                .checkoutToken(session.getToken())
                .userId(session.getCustomerId())
                .merchantId(session.getMerchantId())
                .financedAmount(request.financedAmount())
                .upfrontAmount(upfrontAmount)
                .tenorMonths(request.tenorMonths())
                .monthlyInstallment(monthlyInstallment)
                .status(STATUS_PENDING_CONFIRMATION)
                .build();

        return proposalResponse(proposalRepository.save(proposal), null);
    }

    @Transactional
    public BnplProposalResponse confirmProposal(String proposalRef, String username) {
        BnplProposal proposal = proposalRepository.findByProposalRefForUpdate(proposalRef)
                .orElseThrow(() -> new ResourceNotFoundException("BNPL proposal not found"));
        User user = authenticatedUser(username);
        if (!proposal.getUserId().equals(user.getId())) {
            throw new AccessDeniedException("You do not own this BNPL proposal");
        }
        if (STATUS_APPROVED.equals(proposal.getStatus())) {
            Loan existingLoan = loanRepository.findById(proposal.getLoanId())
                    .orElseThrow(() -> new ResourceNotFoundException("BNPL loan not found"));
            return proposalResponse(proposal, existingLoan.getLoanRef());
        }
        if (!STATUS_PENDING_CONFIRMATION.equals(proposal.getStatus())) {
            throw new BadRequestException("Proposal is not pending confirmation");
        }

        CheckoutSession session = checkout(proposal.getCheckoutToken());
        if (!proposal.getUserId().equals(session.getCustomerId())) {
            throw new AccessDeniedException("Checkout session does not belong to the proposal borrower");
        }

        BnplProfile profile = bnplProfileRepository.findByUserIdForUpdate(user.getId())
                .orElseThrow(() -> new BadRequestException("BNPL credit profile not found"));
        BigDecimal approvedLimit = nullToZero(profile.getApprovedLimit());
        BigDecimal activeExposure = activeBnplExposure(user.getId());
        BigDecimal pendingExposure = pendingProposalExposure(user.getId());
        if (activeExposure.add(pendingExposure).compareTo(approvedLimit) > 0) {
            throw new BadRequestException("LIMIT_CHANGED");
        }

        Account userAccount = accountRepository.findByOwnerIdAndOwnerType(proposal.getUserId(), OwnerType.USER)
                .orElseThrow(() -> new ResourceNotFoundException("Customer account", proposal.getUserId()));
        Account merchantAccount = accountRepository.findByOwnerIdAndOwnerType(proposal.getMerchantId(), OwnerType.MERCHANT)
                .orElseThrow(() -> new ResourceNotFoundException("Merchant account", proposal.getMerchantId()));
        Account systemAccount = accountRepository.findByOwnerIdAndOwnerType(0L, OwnerType.SYSTEM)
                .orElseThrow(() -> new ResourceNotFoundException("SYSTEM Account not found"));

        if (proposal.getUpfrontAmount().compareTo(ZERO) > 0) {
            if (userAccount.getBalance().compareTo(proposal.getUpfrontAmount()) < 0) {
                throw new BadRequestException("INSUFFICIENT_FUNDS_FOR_UPFRONT");
            }
            Transaction upfrontTx = new Transaction();
            upfrontTx.setSourceAccountId(userAccount.getId());
            upfrontTx.setDestAccountId(systemAccount.getId());
            upfrontTx.setAmount(proposal.getUpfrontAmount());
            upfrontTx.setType(TransactionType.PAYMENT);
            upfrontTx.setStatus(TransactionStatus.COMPLETED);
            upfrontTx.setDescription("Thanh toán trả trước cho đơn hàng BNPL " + session.getOrderId());
            upfrontTx.setTransactionRef("TX_" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
            transactionRepository.save(upfrontTx);

            userAccount.setBalance(userAccount.getBalance().subtract(proposal.getUpfrontAmount()));
            accountRepository.save(userAccount);
        }

        Loan loan = createLoan(proposal, userAccount);
        createSchedules(loan);
        Transaction transaction = disburseToMerchant(proposal, session, systemAccount, merchantAccount);

        proposal.setStatus(STATUS_APPROVED);
        proposal.setLoanId(loan.getId());
        proposal.setTransactionRef(transaction.getTransactionRef());
        proposalRepository.save(proposal);

        session.setStatus(STATUS_SUCCESS);
        session.setTransactionRef(transaction.getTransactionRef());
        checkoutSessionRepository.save(session);

        String merchantWebhookUrl = null;
        if (session.getMerchantId() != null) {
            Merchant merchant = merchantRepository.findById(session.getMerchantId()).orElse(null);
            if (merchant != null) {
                merchantWebhookUrl = merchant.getWebhookUrl();
            }
        }

        User eventUser = userRepository.findById(proposal.getUserId()).orElse(null);

        // Publish the webhook event AFTER the DB transaction commits. Publishing inside the
        // @Transactional method would let the RabbitMQ consumer receive the message before the
        // checkout session's transactionRef is visible in the DB — the consumer's
        // findByTransactionRef would return empty → orderId null → webhook skipped.
        final PaymentCompletedEvent event = new PaymentCompletedEvent(
                transaction.getTransactionRef(),
                transaction.getMerchantId(),
                merchantWebhookUrl,
                transaction.getAmount(),
                "COMPLETED",
                eventUser != null ? eventUser.getEmail() : null,
                eventUser != null ? eventUser.getUsername() : null,
                merchantAccount.getAccountNumber(),
                transaction.getDescription(),
                transaction.getType(),
                eventUser != null ? eventUser.getId() : null);

        final String notifMsg = String.format("Khoản vay BNPL %s đã được tạo thành công cho đơn hàng %s. Số tiền: %s VND.",
                loan.getLoanRef(), session.getOrderId(), loan.getAmount());
        final Long notifUserId = proposal.getUserId();

        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                paymentEventPublisher.publishPaymentCompleted(event);
                notificationService.createNotification(notifUserId, "Tạo khoản vay thành công", notifMsg, "BNPL_LOAN_CREATED");
            }
        });

        return proposalResponse(proposal, loan.getLoanRef());
    }

    private CheckoutSession checkout(String token) {
        CheckoutSession session = checkoutSessionRepository.findByTokenForUpdate(token)
                .orElseThrow(() -> new ResourceNotFoundException("Checkout session not found"));
        if (TERMINAL_CHECKOUT_STATUSES.contains(session.getStatus())) {
            throw new BadRequestException("Checkout session is already " + session.getStatus());
        }
        if (LocalDateTime.now().isAfter(session.getExpiresAt())) {
            session.setStatus("EXPIRED");
            checkoutSessionRepository.save(session);
            throw new BadRequestException("Checkout session expired");
        }
        return session;
    }

    private Loan createLoan(BnplProposal proposal, Account userAccount) {
        BigDecimal interestRate = new BigDecimal("0.015");
        BigDecimal totalRepayable = proposal.getMonthlyInstallment().multiply(BigDecimal.valueOf(proposal.getTenorMonths()));
        Loan loan = Loan.builder()
                .userId(proposal.getUserId())
                .accountId(userAccount.getId())
                .loanRef("LOAN_" + UUID.randomUUID().toString().substring(0, 8).toUpperCase())
                .amount(proposal.getFinancedAmount())
                .interestRate(interestRate)
                .termMonths(proposal.getTenorMonths())
                .monthlyAmount(proposal.getMonthlyInstallment())
                .totalRepayable(totalRepayable)
                .remainingAmount(totalRepayable)
                .reason("BNPL checkout " + proposal.getCheckoutToken())
                .status(LoanStatus.ACTIVE)
                .disbursedAt(LocalDateTime.now())
                .build();
        return loanRepository.save(loan);
    }

    private void createSchedules(Loan loan) {
        List<LoanSchedule> schedules = new ArrayList<>();
        for (int i = 1; i <= loan.getTermMonths(); i++) {
            schedules.add(LoanSchedule.builder()
                    .loan(loan)
                    .periodNumber(i)
                    .amountDue(loan.getMonthlyAmount())
                    .dueDate(LocalDate.now().plusMonths(i))
                    .status(LoanScheduleStatus.PENDING)
                    .build());
        }
        loanScheduleRepository.saveAll(schedules);
    }

    private Transaction disburseToMerchant(
            BnplProposal proposal,
            CheckoutSession session,
            Account systemAccount,
            Account merchantAccount
    ) {
        if (systemAccount.getBalance().compareTo(proposal.getFinancedAmount()) < 0) {
            throw new BadRequestException("SYSTEM account has insufficient balance");
        }

        systemAccount.setBalance(systemAccount.getBalance().subtract(proposal.getFinancedAmount()));
        merchantAccount.setBalance(merchantAccount.getBalance().add(proposal.getFinancedAmount()));
        accountRepository.save(systemAccount);
        accountRepository.save(merchantAccount);

        Transaction transaction = Transaction.builder()
                .transactionRef("TXN_" + UUID.randomUUID().toString().substring(0, 8).toUpperCase())
                .idempotencyKey("BNPL_DISBURSE_" + proposal.getProposalRef())
                .sourceAccountId(systemAccount.getId())
                .destAccountId(merchantAccount.getId())
                .amount(proposal.getFinancedAmount())
                .currency("VND")
                .type(TransactionType.LOAN_DISBURSEMENT)
                .status(TransactionStatus.COMPLETED)
                .merchantId(session.getMerchantId())
                .description("BNPL disbursement for checkout " + session.getToken())
                .metadata("{\"checkoutToken\":\"" + session.getToken() + "\",\"proposalRef\":\"" + proposal.getProposalRef() + "\"}")
                .build();
        return transactionRepository.save(transaction);
    }

    private BnplCheckoutResponse checkoutResponse(CheckoutSession session) {
        return new BnplCheckoutResponse(
                session.getToken(),
                session.getOrderId(),
                session.getCustomerId(),
                session.getMerchantCustomerRef(),
                session.getCustomerName(),
                session.getAmount(),
                session.getStatus(),
                session.getCreditScore(),
                session.getRiskGrade(),
                session.getApprovedLimit(),
                session.getMaximumFinancedAmount(),
                session.getAssessmentReason()
        );
    }

    private BnplProposalResponse proposalResponse(BnplProposal proposal, String loanRef) {
        return new BnplProposalResponse(
                proposal.getProposalRef(),
                proposal.getCheckoutToken(),
                proposal.getUserId(),
                proposal.getFinancedAmount(),
                proposal.getUpfrontAmount(),
                proposal.getTenorMonths(),
                proposal.getMonthlyInstallment(),
                proposal.getStatus(),
                loanRef,
                proposal.getTransactionRef()
        );
    }

    private BigDecimal nullToZero(BigDecimal amount) {
        return amount != null ? amount : ZERO;
    }

    private User authenticatedUser(String username) {
        if (username == null || username.isBlank()) {
            throw new AccessDeniedException("PayGate login is required for BNPL checkout");
        }
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new AccessDeniedException("Authenticated PayGate user not found"));
        if (!user.isActive()) {
            throw new AccessDeniedException("PayGate user account is inactive");
        }
        return user;
    }

    private void bindSessionToAuthenticatedUser(CheckoutSession session, User user) {
        if (session.getCustomerId() == null) {
            session.setCustomerId(user.getId());
            return;
        }
        if (!session.getCustomerId().equals(user.getId())) {
            throw new AccessDeniedException("Checkout session belongs to another PayGate user");
        }
    }

    private BigDecimal availableCredit(Long userId, BigDecimal approvedLimit) {
        return approvedLimit
                .subtract(activeBnplExposure(userId))
                .subtract(pendingProposalExposure(userId))
                .max(ZERO);
    }

    private BigDecimal activeBnplExposure(Long userId) {
        return nullToZero(loanRepository.sumActiveBnplRemainingAmount(
                userId, List.of(LoanStatus.ACTIVE, LoanStatus.OVERDUE)));
    }

    private BigDecimal pendingProposalExposure(Long userId) {
        return nullToZero(proposalRepository.sumPendingFinancedAmountByUserId(userId));
    }

    private BigDecimal requestedFinanceAmount(CheckoutSession session) {
        return session.getFinanceAmount() != null ? session.getFinanceAmount() : session.getAmount();
    }

    private void ensureCustomerAccount(Long userId) {
        if (accountRepository.findByOwnerIdAndOwnerType(userId, OwnerType.USER).isEmpty()) {
            accountService.createAccount(userId, OwnerType.USER);
        }
    }
}
