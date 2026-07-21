package com.training.paygate.service;

import com.training.paygate.cache.BalanceCacheService;
import com.training.paygate.cache.IdempotencyCacheService;
import com.training.paygate.dto.request.PaymentRequest;
import com.training.paygate.dto.response.TransactionResponse;
import com.training.paygate.entity.Account;
import com.training.paygate.entity.LedgerEntry;
import com.training.paygate.entity.Merchant;
import com.training.paygate.entity.Transaction;
import com.training.paygate.entity.User;
import com.training.paygate.enums.AccountStatus;
import com.training.paygate.enums.OwnerType;
import com.training.paygate.enums.TransactionStatus;
import com.training.paygate.enums.TransactionType;
import com.training.paygate.exception.BadRequestException;
import com.training.paygate.exception.InsufficientBalanceException;
import com.training.paygate.exception.InvalidTransactionStateException;
import com.training.paygate.repository.AccountRepository;
import com.training.paygate.repository.LedgerEntryRepository;
import com.training.paygate.repository.MerchantRepository;
import com.training.paygate.repository.TransactionRepository;
import com.training.paygate.repository.UserRepository;
import com.training.paygate.service.impl.TransactionServiceImpl;
import com.training.paygate.messaging.event.PaymentCompletedEvent;
import com.training.paygate.enums.Role;
import com.training.paygate.dto.response.TransactionDetailResponse;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.amqp.core.AmqpTemplate;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TransactionServiceTest {

    @Mock
    private AccountRepository accountRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private MerchantRepository merchantRepository;

    @Mock
    private TransactionRepository transactionRepository;

    @Mock
    private LedgerEntryRepository ledgerEntryRepository;

    @Mock
    private BalanceCacheService balanceCacheService;

    @Mock
    private IdempotencyCacheService idempotencyCacheService;

    @Mock
    private AmqpTemplate amqpTemplate;

    @InjectMocks
    private TransactionServiceImpl transactionService;

    @Test
    void processPayment_success() {
        // Given
        String username = "user1";
        String idKey = "idem-key-123";
        PaymentRequest request = new PaymentRequest(idKey, 2L, BigDecimal.valueOf(100), "Thanh toan", 5L);

        User user = User.builder().username(username).build();
        user.setId(1L);

        Account sourceAccount = Account.builder()
                .id(1L)
                .ownerId(1L)
                .ownerType(OwnerType.USER)
                .accountNumber("AC00000001")
                .balance(BigDecimal.valueOf(1000))
                .status(AccountStatus.ACTIVE)
                .build();

        Account destAccount = Account.builder()
                .id(2L)
                .ownerId(5L)
                .ownerType(OwnerType.MERCHANT)
                .accountNumber("AC00000002")
                .balance(BigDecimal.valueOf(500))
                .status(AccountStatus.ACTIVE)
                .build();

        Merchant merchant = Merchant.builder().merchantName("Shop A").active(true).build();
        merchant.setId(5L);

        Transaction transaction = Transaction.builder()
                .id(100L)
                .transactionRef("TXN-PAY-12345")
                .sourceAccountId(1L)
                .destAccountId(2L)
                .amount(BigDecimal.valueOf(100))
                .type(TransactionType.PAYMENT)
                .status(TransactionStatus.COMPLETED)
                .description("Thanh toan")
                .createdAt(LocalDateTime.now())
                .build();

        when(idempotencyCacheService.get(idKey)).thenReturn(null);
        when(transactionRepository.findByIdempotencyKey(idKey)).thenReturn(Optional.empty());
        when(userRepository.findByUsername(username)).thenReturn(Optional.of(user));
        when(accountRepository.findByOwnerIdAndOwnerType(1L, OwnerType.USER)).thenReturn(Optional.of(sourceAccount));
        when(accountRepository.findById(2L)).thenReturn(Optional.of(destAccount));
        when(merchantRepository.findById(5L)).thenReturn(Optional.of(merchant));

        // Mock Lock ordering: 1L locked first, 2L locked second
        when(accountRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(sourceAccount));
        when(accountRepository.findByIdForUpdate(2L)).thenReturn(Optional.of(destAccount));
        when(transactionRepository.save(any(Transaction.class))).thenReturn(transaction);

        // When
        TransactionResponse result = transactionService.processPayment(request, username);

        // Then
        assertThat(result.transactionRef()).isEqualTo("TXN-PAY-12345");
        assertThat(result.status()).isEqualTo("COMPLETED");
        verify(accountRepository).save(sourceAccount);
        verify(accountRepository).save(destAccount);
        verify(ledgerEntryRepository, times(2)).save(any(LedgerEntry.class));
        verify(balanceCacheService).evictBalance(1L);
        verify(balanceCacheService).evictBalance(2L);
        verify(idempotencyCacheService).set(idKey, "TXN-PAY-12345");
        verify(amqpTemplate).convertAndSend(eq("payment.exchange"), eq("payment.completed"), any(PaymentCompletedEvent.class));
    }

    @Test
    void processPayment_idempotentReplay_returnsCachedResponse() {
        // Given
        String username = "user1";
        String idKey = "idem-key-123";
        PaymentRequest request = new PaymentRequest(idKey, 2L, BigDecimal.valueOf(100), "Thanh toan", 5L);

        Transaction transaction = Transaction.builder()
                .id(100L)
                .transactionRef("TXN-PAY-12345")
                .sourceAccountId(1L)
                .destAccountId(2L)
                .amount(BigDecimal.valueOf(100))
                .type(TransactionType.PAYMENT)
                .status(TransactionStatus.COMPLETED)
                .description("Thanh toan")
                .createdAt(LocalDateTime.now())
                .build();

        // Scenario 1: Redis cache hit
        when(idempotencyCacheService.get(idKey)).thenReturn("TXN-PAY-12345");
        when(transactionRepository.findByTransactionRef("TXN-PAY-12345")).thenReturn(Optional.of(transaction));

        // When
        TransactionResponse result = transactionService.processPayment(request, username);

        // Then
        assertThat(result.transactionRef()).isEqualTo("TXN-PAY-12345");
        verify(transactionRepository, never()).save(any());
    }

    @Test
    void processPayment_insufficientBalance_throwsException() {
        // Given
        String username = "user1";
        String idKey = "idem-key-123";
        PaymentRequest request = new PaymentRequest(idKey, 2L, BigDecimal.valueOf(10000), "Thanh toan", 5L);

        User user = User.builder().username(username).build();
        user.setId(1L);

        Account sourceAccount = Account.builder()
                .id(1L)
                .ownerId(1L)
                .ownerType(OwnerType.USER)
                .accountNumber("AC00000001")
                .balance(BigDecimal.valueOf(100))
                .status(AccountStatus.ACTIVE)
                .build();

        Account destAccount = Account.builder()
                .id(2L)
                .ownerId(5L)
                .ownerType(OwnerType.MERCHANT)
                .accountNumber("AC00000002")
                .balance(BigDecimal.valueOf(500))
                .status(AccountStatus.ACTIVE)
                .build();

        Merchant merchant = Merchant.builder().merchantName("Shop A").active(true).build();
        merchant.setId(5L);

        when(idempotencyCacheService.get(idKey)).thenReturn(null);
        when(transactionRepository.findByIdempotencyKey(idKey)).thenReturn(Optional.empty());
        when(userRepository.findByUsername(username)).thenReturn(Optional.of(user));
        when(accountRepository.findByOwnerIdAndOwnerType(1L, OwnerType.USER)).thenReturn(Optional.of(sourceAccount));
        when(accountRepository.findById(2L)).thenReturn(Optional.of(destAccount));
        when(merchantRepository.findById(5L)).thenReturn(Optional.of(merchant));
        when(accountRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(sourceAccount));
        when(accountRepository.findByIdForUpdate(2L)).thenReturn(Optional.of(destAccount));

        // When & Then
        assertThatThrownBy(() -> transactionService.processPayment(request, username))
                .isInstanceOf(InsufficientBalanceException.class);
        verify(transactionRepository, never()).save(any());
    }

    @Test
    void processPayment_inactiveMerchant_throwsException() {
        // Given
        String username = "user1";
        String idKey = "idem-key-123";
        PaymentRequest request = new PaymentRequest(idKey, 2L, BigDecimal.valueOf(100), "Thanh toan", 5L);

        User user = User.builder().username(username).build();
        user.setId(1L);

        Account sourceAccount = Account.builder()
                .id(1L)
                .ownerId(1L)
                .ownerType(OwnerType.USER)
                .balance(BigDecimal.valueOf(1000))
                .build();

        Account destAccount = Account.builder()
                .id(2L)
                .ownerId(5L)
                .ownerType(OwnerType.MERCHANT)
                .build();

        Merchant merchant = Merchant.builder().merchantName("Shop A").active(false).build();
        merchant.setId(5L);

        when(idempotencyCacheService.get(idKey)).thenReturn(null);
        when(transactionRepository.findByIdempotencyKey(idKey)).thenReturn(Optional.empty());
        when(userRepository.findByUsername(username)).thenReturn(Optional.of(user));
        when(accountRepository.findByOwnerIdAndOwnerType(1L, OwnerType.USER)).thenReturn(Optional.of(sourceAccount));
        when(accountRepository.findById(2L)).thenReturn(Optional.of(destAccount));
        when(merchantRepository.findById(5L)).thenReturn(Optional.of(merchant));

        // When & Then
        assertThatThrownBy(() -> transactionService.processPayment(request, username))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Merchant is inactive");
        verify(accountRepository, never()).findByIdForUpdate(anyLong());
    }

    @Test
    void getTransactionByRef_success() {
        // Given
        String ref = "TXN-123";
        String username = "user1";
        User user = User.builder().username(username).role(Role.USER).build();
        user.setId(5L);
        Account userAccount = Account.builder().id(1L).ownerId(5L).ownerType(OwnerType.USER).build();

        Transaction tx = Transaction.builder()
                .id(10L)
                .transactionRef(ref)
                .sourceAccountId(1L)
                .destAccountId(2L)
                .amount(BigDecimal.valueOf(100))
                .type(TransactionType.PAYMENT)
                .status(TransactionStatus.COMPLETED)
                .build();

        when(transactionRepository.findByTransactionRef(ref)).thenReturn(Optional.of(tx));
        when(userRepository.findByUsername(username)).thenReturn(Optional.of(user));
        when(accountRepository.findByOwnerIdAndOwnerType(5L, OwnerType.USER)).thenReturn(Optional.of(userAccount));
        when(ledgerEntryRepository.findByTransactionId(10L)).thenReturn(java.util.Collections.emptyList());

        // When
        TransactionDetailResponse result = transactionService.getTransactionByRef(ref, username);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.transactionRef()).isEqualTo(ref);
    }

    @Test
    void refund_success() {
        // Given
        String originalRef = "TXN-PAY-123";
        String username = "admin";
        User user = User.builder().username(username).role(Role.ADMIN).build();

        Transaction originalTx = Transaction.builder()
                .id(100L)
                .transactionRef(originalRef)
                .sourceAccountId(1L)
                .destAccountId(2L)
                .amount(BigDecimal.valueOf(100))
                .type(TransactionType.PAYMENT)
                .status(TransactionStatus.COMPLETED)
                .currency("VND")
                .merchantId(5L)
                .build();

        Account sourceAccount = Account.builder()
                .id(1L)
                .ownerId(12L)
                .ownerType(OwnerType.USER)
                .balance(BigDecimal.valueOf(500))
                .build();

        Account destAccount = Account.builder()
                .id(2L)
                .ownerId(5L)
                .ownerType(OwnerType.MERCHANT)
                .balance(BigDecimal.valueOf(1000))
                .build();

        Transaction refundTx = Transaction.builder()
                .id(101L)
                .transactionRef("TXN-REFUND-123")
                .sourceAccountId(2L)
                .destAccountId(1L)
                .amount(BigDecimal.valueOf(100))
                .type(TransactionType.REFUND)
                .status(TransactionStatus.COMPLETED)
                .createdAt(LocalDateTime.now())
                .build();

        when(transactionRepository.findByTransactionRef(originalRef)).thenReturn(Optional.of(originalTx));
        when(userRepository.findByUsername(username)).thenReturn(Optional.of(user));
        when(accountRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(sourceAccount));
        when(accountRepository.findByIdForUpdate(2L)).thenReturn(Optional.of(destAccount));
        when(transactionRepository.save(any(Transaction.class))).thenReturn(refundTx);

        // When
        TransactionResponse result = transactionService.refund(originalRef, username);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.type()).isEqualTo("REFUND");
        verify(ledgerEntryRepository, times(2)).save(any(LedgerEntry.class));
        verify(balanceCacheService).evictBalance(1L);
        verify(balanceCacheService).evictBalance(2L);
    }

    @Test
    void refund_notAdmin_throwsAccessDenied() {
        // Given
        String originalRef = "TXN-PAY-123";
        String username = "user1";
        User user = User.builder().username(username).role(Role.USER).build();

        Transaction originalTx = Transaction.builder()
                .transactionRef(originalRef)
                .type(TransactionType.PAYMENT)
                .status(TransactionStatus.COMPLETED)
                .build();

        when(transactionRepository.findByTransactionRef(originalRef)).thenReturn(Optional.of(originalTx));
        when(userRepository.findByUsername(username)).thenReturn(Optional.of(user));

        // When & Then
        assertThatThrownBy(() -> transactionService.refund(originalRef, username))
                .isInstanceOf(org.springframework.security.access.AccessDeniedException.class)
                .hasMessageContaining("Only an ADMIN can request a refund");
    }

    @Test
    void refund_alreadyRefunded_throwsInvalidTransactionState() {
        // Given
        String originalRef = "TXN-PAY-123";
        String username = "admin";
        User user = User.builder().username(username).role(Role.ADMIN).build();

        Transaction originalTx = Transaction.builder()
                .transactionRef(originalRef)
                .type(TransactionType.PAYMENT)
                .status(TransactionStatus.COMPLETED)
                .build();

        when(transactionRepository.findByTransactionRef(originalRef)).thenReturn(Optional.of(originalTx));
        when(transactionRepository.existsByDescription("Refund for: " + originalRef)).thenReturn(true);

        // When & Then
        assertThatThrownBy(() -> transactionService.refund(originalRef, username))
                .isInstanceOf(InvalidTransactionStateException.class)
                .hasMessageContaining("has already been refunded");
    }
}
