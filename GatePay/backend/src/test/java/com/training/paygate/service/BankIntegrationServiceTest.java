package com.training.paygate.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.training.paygate.cache.BalanceCacheService;
import com.training.paygate.dto.request.BankWebhookRequest;
import com.training.paygate.dto.response.TransactionResponse;
import com.training.paygate.entity.Account;
import com.training.paygate.entity.CheckoutSession;
import com.training.paygate.entity.Merchant;
import com.training.paygate.entity.Transaction;
import com.training.paygate.entity.WebhookLog;
import com.training.paygate.enums.AccountStatus;
import com.training.paygate.enums.OwnerType;
import com.training.paygate.exception.BadRequestException;
import com.training.paygate.exception.ResourceNotFoundException;
import com.training.paygate.repository.AccountRepository;
import com.training.paygate.repository.CheckoutSessionRepository;
import com.training.paygate.repository.LedgerEntryRepository;
import com.training.paygate.repository.MerchantRepository;
import com.training.paygate.repository.TransactionRepository;
import com.training.paygate.repository.WebhookLogRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BankIntegrationServiceTest {

    @Mock private CheckoutSessionRepository checkoutSessionRepository;
    @Mock private MerchantRepository merchantRepository;
    @Mock private AccountRepository accountRepository;
    @Mock private TransactionRepository transactionRepository;
    @Mock private LedgerEntryRepository ledgerEntryRepository;
    @Mock private WebhookLogRepository webhookLogRepository;
    @Mock private BalanceCacheService balanceCacheService;
    @Mock private WebhookRetryService webhookRetryService;
    @Mock private ObjectMapper objectMapper;

    @InjectMocks
    private BankIntegrationService bankIntegrationService;

    private CheckoutSession pendingSession;
    private Account sysAccount;
    private Merchant merchant;

    @BeforeEach
    void setUp() {
        pendingSession = CheckoutSession.builder()
                .token("CHK_TEST_123")
                .merchantId(5L)
                .merchantCode("MC_TEST")
                .merchantName("Test Merchant")
                .orderId("ORD-100234")
                .amount(new BigDecimal("500000.00"))
                .status("PENDING")
                .returnUrl("http://localhost:8082/?callback=true")
                .expiresAt(LocalDateTime.now().plusMinutes(15))
                .build();

        sysAccount = Account.builder()
                .id(1L)
                .ownerId(0L)
                .ownerType(OwnerType.SYSTEM)
                .balance(new BigDecimal("99000000000.00"))
                .status(AccountStatus.ACTIVE)
                .build();

        merchant = Merchant.builder()
                .merchantCode("MC_TEST")
                .merchantName("Test Merchant")
                .apiKey("KEY_123")
                .webhookUrl("http://localhost:8082/api/paygate-webhook")
                .active(true)
                .build();
        merchant.setId(5L);
    }

    @Test
    @DisplayName("processBankWebhook_Success: Process bank settlement, credit system escrow balance, create ledger and trigger webhook")
    void processBankWebhook_Success() throws Exception {
        BankWebhookRequest request = new BankWebhookRequest("MB", "FT12345", "099988887777", new BigDecimal("500000.00"), "PAYGATE ORD-100234", LocalDateTime.now().toString());

        when(checkoutSessionRepository.findFirstByOrderIdAndStatusOrderByCreatedAtDesc("ORD-100234", "PENDING")).thenReturn(Optional.of(pendingSession));
        when(accountRepository.findByOwnerIdAndOwnerType(0L, OwnerType.SYSTEM)).thenReturn(Optional.of(sysAccount));
        when(accountRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(sysAccount));
        when(transactionRepository.save(any(Transaction.class))).thenAnswer(i -> {
            Transaction tx = i.getArgument(0);
            tx.setId(100L);
            return tx;
        });
        when(merchantRepository.findById(5L)).thenReturn(Optional.of(merchant));
        when(objectMapper.writeValueAsString(any())).thenReturn("{}");
        when(webhookLogRepository.save(any(WebhookLog.class))).thenAnswer(i -> i.getArgument(0));

        TransactionResponse response = bankIntegrationService.processBankWebhook(request);

        assertThat(response).isNotNull();
        assertThat(response.status()).isEqualTo("COMPLETED");
        assertThat(sysAccount.getBalance()).isEqualByComparingTo("99000500000.00");
        assertThat(pendingSession.getStatus()).isEqualTo("COMPLETED");

        verify(ledgerEntryRepository).save(any());
        verify(balanceCacheService).evictBalance(1L);
    }

    @Test
    @DisplayName("processBankWebhook_InvalidTransferContent: Throws BadRequestException")
    void processBankWebhook_InvalidContent() {
        BankWebhookRequest request = new BankWebhookRequest("MB", "FT12345", "099988887777", new BigDecimal("500000.00"), "   ", LocalDateTime.now().toString());

        assertThatThrownBy(() -> bankIntegrationService.processBankWebhook(request))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Transfer content cannot be blank");
    }

    @Test
    @DisplayName("processBankWebhook_SessionNotFound: Throws ResourceNotFoundException")
    void processBankWebhook_SessionNotFound() {
        BankWebhookRequest request = new BankWebhookRequest("MB", "FT12345", "099988887777", new BigDecimal("500000.00"), "PAYGATE ORD-UNKNOWN", LocalDateTime.now().toString());
        when(checkoutSessionRepository.findFirstByOrderIdAndStatusOrderByCreatedAtDesc("ORD-UNKNOWN", "PENDING")).thenReturn(Optional.empty());
        when(checkoutSessionRepository.findFirstByOrderIdOrderByCreatedAtDesc("ORD-UNKNOWN")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> bankIntegrationService.processBankWebhook(request))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("No checkout session found matching orderId");
    }
}
