package com.training.paygate.service;

import com.training.paygate.dto.request.BnplProposalCreateRequest;
import com.training.paygate.dto.response.BnplProposalResponse;
import com.training.paygate.entity.Account;
import com.training.paygate.entity.BnplProfile;
import com.training.paygate.entity.BnplProposal;
import com.training.paygate.entity.CheckoutSession;
import com.training.paygate.entity.Loan;
import com.training.paygate.entity.User;
import com.training.paygate.exception.BadRequestException;
import com.training.paygate.integration.cic.CicClient;
import com.training.paygate.messaging.publisher.PaymentEventPublisher;
import com.training.paygate.repository.AccountRepository;
import com.training.paygate.repository.BnplProfileRepository;
import com.training.paygate.repository.BnplProposalRepository;
import com.training.paygate.repository.CheckoutSessionRepository;
import com.training.paygate.repository.LoanRepository;
import com.training.paygate.repository.LoanScheduleRepository;
import com.training.paygate.repository.MerchantRepository;
import com.training.paygate.repository.TransactionRepository;
import com.training.paygate.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BnplCheckoutServiceTest {

    @Mock private CheckoutSessionRepository checkoutSessionRepository;
    @Mock private BnplProposalRepository proposalRepository;
    @Mock private UserRepository userRepository;
    @Mock private AccountRepository accountRepository;
    @Mock private LoanRepository loanRepository;
    @Mock private LoanScheduleRepository loanScheduleRepository;
    @Mock private TransactionRepository transactionRepository;
    @Mock private CicClient cicClient;
    @Mock private AccountService accountService;
    @Mock private BnplProfileRepository bnplProfileRepository;
    @Mock private NotificationService notificationService;
    @Mock private PaymentEventPublisher paymentEventPublisher;
    @Mock private MerchantRepository merchantRepository;

    @InjectMocks private BnplCheckoutService service;

    private User borrower;

    @BeforeEach
    void setUp() {
        borrower = User.builder().username("borrower").active(true).build();
        borrower.setId(1L);
    }

    @Test
    void confirmProposalRejectsDifferentAuthenticatedUserBeforeCheckoutMutation() {
        User attacker = User.builder().username("attacker").active(true).build();
        attacker.setId(2L);
        BnplProposal proposal = proposal("PENDING_CONFIRMATION");
        when(proposalRepository.findByProposalRefForUpdate("PROP_1")).thenReturn(Optional.of(proposal));
        when(userRepository.findByUsername("attacker")).thenReturn(Optional.of(attacker));

        assertThatThrownBy(() -> service.confirmProposal("PROP_1", "attacker"))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("do not own");

        verify(proposalRepository).findByProposalRefForUpdate("PROP_1");
        verifyNoInteractions(checkoutSessionRepository);
    }

    @Test
    void confirmApprovedProposalReturnsExistingLoanIdempotently() {
        BnplProposal proposal = proposal("APPROVED");
        proposal.setLoanId(9L);
        proposal.setTransactionRef("TXN_1");
        Loan loan = Loan.builder().loanRef("LOAN_1").build();
        loan.setId(9L);
        when(proposalRepository.findByProposalRefForUpdate("PROP_1")).thenReturn(Optional.of(proposal));
        when(userRepository.findByUsername("borrower")).thenReturn(Optional.of(borrower));
        when(loanRepository.findById(9L)).thenReturn(Optional.of(loan));

        BnplProposalResponse response = service.confirmProposal("PROP_1", "borrower");

        assertThat(response.status()).isEqualTo("APPROVED");
        assertThat(response.loanRef()).isEqualTo("LOAN_1");
        assertThat(response.transactionRef()).isEqualTo("TXN_1");
        verifyNoInteractions(checkoutSessionRepository);
    }

    @Test
    void confirmProposalRechecksTotalExposureUnderProfileLock() {
        BnplProposal proposal = proposal("PENDING_CONFIRMATION");
        CheckoutSession session = session("CREDIT_APPROVED");
        BnplProfile profile = BnplProfile.builder()
                .userId(1L)
                .approvedLimit(new BigDecimal("10000000"))
                .build();
        when(proposalRepository.findByProposalRefForUpdate("PROP_1")).thenReturn(Optional.of(proposal));
        when(userRepository.findByUsername("borrower")).thenReturn(Optional.of(borrower));
        when(checkoutSessionRepository.findByTokenForUpdate("CHK_1")).thenReturn(Optional.of(session));
        when(bnplProfileRepository.findByUserIdForUpdate(1L)).thenReturn(Optional.of(profile));
        when(loanRepository.sumActiveBnplRemainingAmount(1L, List.of(
                com.training.paygate.enums.LoanStatus.ACTIVE,
                com.training.paygate.enums.LoanStatus.OVERDUE)))
                .thenReturn(new BigDecimal("8000000"));
        when(proposalRepository.sumPendingFinancedAmountByUserId(1L))
                .thenReturn(new BigDecimal("3000000"));

        assertThatThrownBy(() -> service.confirmProposal("PROP_1", "borrower"))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("LIMIT_CHANGED");

        verify(bnplProfileRepository).findByUserIdForUpdate(1L);
        verifyNoInteractions(transactionRepository);
    }

    @Test
    void createProposalRejectsSuccessfulCheckoutSession() {
        CheckoutSession session = session("SUCCESS");
        when(checkoutSessionRepository.findByTokenForUpdate("CHK_1")).thenReturn(Optional.of(session));

        assertThatThrownBy(() -> service.createProposal(
                "CHK_1", new BnplProposalCreateRequest(new BigDecimal("1000000"), 3), "borrower"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("already SUCCESS");

        verifyNoInteractions(userRepository, bnplProfileRepository, proposalRepository);
    }

    @Test
    void createProposalSubtractsActiveAndPendingExposureFromApprovedLimit() {
        CheckoutSession session = session("CREDIT_APPROVED");
        BnplProfile profile = BnplProfile.builder()
                .userId(1L)
                .approvedLimit(new BigDecimal("10000000"))
                .build();
        stubProposalCreation(session, profile);
        when(loanRepository.sumActiveBnplRemainingAmount(1L, List.of(
                com.training.paygate.enums.LoanStatus.ACTIVE,
                com.training.paygate.enums.LoanStatus.OVERDUE)))
                .thenReturn(new BigDecimal("7000000"));
        when(proposalRepository.sumPendingFinancedAmountByUserId(1L))
                .thenReturn(new BigDecimal("1000000"));

        assertThatThrownBy(() -> service.createProposal(
                "CHK_1", new BnplProposalCreateRequest(new BigDecimal("5000000"), 3), "borrower"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("maximum financed amount");

        assertThat(session.getMaximumFinancedAmount()).isEqualByComparingTo("2000000");
        verify(proposalRepository, never()).save(any(BnplProposal.class));
    }

    @Test
    void createProposalReservesOnlyAvailableCreditAndPreventsSecondProposalForSession() {
        CheckoutSession session = session("CREDIT_APPROVED");
        BnplProfile profile = BnplProfile.builder()
                .userId(1L)
                .approvedLimit(new BigDecimal("10000000"))
                .build();
        stubProposalCreation(session, profile);
        when(loanRepository.sumActiveBnplRemainingAmount(1L, List.of(
                com.training.paygate.enums.LoanStatus.ACTIVE,
                com.training.paygate.enums.LoanStatus.OVERDUE)))
                .thenReturn(new BigDecimal("7000000"));
        when(proposalRepository.sumPendingFinancedAmountByUserId(1L)).thenReturn(BigDecimal.ZERO);
        when(proposalRepository.save(any(BnplProposal.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        BnplProposalResponse response = service.createProposal(
                "CHK_1", new BnplProposalCreateRequest(new BigDecimal("3000000"), 3), "borrower");

        assertThat(response.financedAmount()).isEqualByComparingTo("3000000");
        assertThat(response.upfrontAmount()).isEqualByComparingTo("7000000");
        assertThat(session.getMaximumFinancedAmount()).isEqualByComparingTo("3000000");
        verify(bnplProfileRepository).findByUserIdForUpdate(1L);
    }

    private void stubProposalCreation(CheckoutSession session, BnplProfile profile) {
        Account account = Account.builder().ownerId(1L).build();
        when(checkoutSessionRepository.findByTokenForUpdate("CHK_1")).thenReturn(Optional.of(session));
        when(userRepository.findByUsername("borrower")).thenReturn(Optional.of(borrower));
        when(accountRepository.findByOwnerIdAndOwnerType(1L, com.training.paygate.enums.OwnerType.USER))
                .thenReturn(Optional.of(account));
        when(bnplProfileRepository.findByUserIdForUpdate(1L)).thenReturn(Optional.of(profile));
        when(proposalRepository.existsByCheckoutToken("CHK_1")).thenReturn(false);
    }

    private CheckoutSession session(String status) {
        return CheckoutSession.builder()
                .token("CHK_1")
                .merchantId(5L)
                .orderId("ORD-1")
                .amount(new BigDecimal("10000000"))
                .customerId(1L)
                .status(status)
                .expiresAt(LocalDateTime.now().plusMinutes(10))
                .build();
    }

    private BnplProposal proposal(String status) {
        return BnplProposal.builder()
                .proposalRef("PROP_1")
                .checkoutToken("CHK_1")
                .userId(1L)
                .merchantId(5L)
                .financedAmount(new BigDecimal("3000000"))
                .upfrontAmount(new BigDecimal("7000000"))
                .tenorMonths(3)
                .monthlyInstallment(new BigDecimal("1045000"))
                .status(status)
                .build();
    }
}
