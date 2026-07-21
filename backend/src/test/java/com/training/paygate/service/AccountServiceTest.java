package com.training.paygate.service;

import com.training.paygate.dto.response.AccountResponse;
import com.training.paygate.dto.response.TransactionResponse;
import com.training.paygate.entity.Account;
import com.training.paygate.entity.LedgerEntry;
import com.training.paygate.entity.Transaction;
import com.training.paygate.entity.User;
import com.training.paygate.enums.AccountStatus;
import com.training.paygate.enums.OwnerType;
import com.training.paygate.enums.Role;
import com.training.paygate.enums.TransactionStatus;
import com.training.paygate.enums.TransactionType;
import com.training.paygate.exception.BadRequestException;
import com.training.paygate.exception.DuplicateResourceException;
import com.training.paygate.exception.ResourceNotFoundException;
import com.training.paygate.mapper.AccountMapper;
import com.training.paygate.repository.AccountRepository;
import com.training.paygate.repository.LedgerEntryRepository;
import com.training.paygate.repository.TransactionRepository;
import com.training.paygate.repository.UserRepository;
import com.training.paygate.service.impl.AccountServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AccountServiceTest {

    @Mock
    private AccountRepository accountRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private TransactionRepository transactionRepository;

    @Mock
    private LedgerEntryRepository ledgerEntryRepository;

    @Mock
    private AccountMapper accountMapper;

    @InjectMocks
    private AccountServiceImpl accountService;

    @Test
    void createAccount_success() {
        // Given
        Long ownerId = 1L;
        OwnerType ownerType = OwnerType.USER;

        Account tempAccount = Account.builder()
                .id(12L)
                .ownerId(ownerId)
                .ownerType(ownerType)
                .balance(BigDecimal.ZERO)
                .currency("VND")
                .status(AccountStatus.ACTIVE)
                .accountNumber("TEMP-1-12345")
                .build();

        AccountResponse response = new AccountResponse(
                12L, ownerId, ownerType.name(), "AC00000012", BigDecimal.ZERO, "VND", "ACTIVE", LocalDateTime.now(), LocalDateTime.now()
        );

        when(accountRepository.findByOwnerIdAndOwnerType(ownerId, ownerType)).thenReturn(Optional.empty());
        when(accountRepository.save(any(Account.class))).thenReturn(tempAccount);
        when(accountMapper.toResponse(any(Account.class))).thenReturn(response);

        // When
        AccountResponse result = accountService.createAccount(ownerId, ownerType);

        // Then
        assertThat(result.id()).isEqualTo(12L);
        assertThat(result.accountNumber()).isEqualTo("AC00000012");
        verify(accountRepository, times(2)).save(any(Account.class));
    }

    @Test
    void createAccount_duplicate_throwsException() {
        // Given
        Long ownerId = 1L;
        OwnerType ownerType = OwnerType.USER;
        Account existingAccount = new Account();

        when(accountRepository.findByOwnerIdAndOwnerType(ownerId, ownerType)).thenReturn(Optional.of(existingAccount));

        // When & Then
        assertThatThrownBy(() -> accountService.createAccount(ownerId, ownerType))
                .isInstanceOf(DuplicateResourceException.class);
        verify(accountRepository, never()).save(any());
    }

    @Test
    void getBalance_success() {
        // Given
        Long accountId = 12L;
        Account account = Account.builder()
                .id(accountId)
                .balance(BigDecimal.valueOf(1000))
                .build();
        AccountResponse response = new AccountResponse(
                12L, 1L, "USER", "AC00000012", BigDecimal.valueOf(1000), "VND", "ACTIVE", LocalDateTime.now(), LocalDateTime.now()
        );

        when(accountRepository.findById(accountId)).thenReturn(Optional.of(account));
        when(accountMapper.toResponse(account)).thenReturn(response);

        // When
        AccountResponse result = accountService.getBalance(accountId);

        // Then
        assertThat(result.balance()).isEqualTo(BigDecimal.valueOf(1000));
    }

    @Test
    void getBalance_notFound_throwsException() {
        // Given
        Long accountId = 12L;
        when(accountRepository.findById(accountId)).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> accountService.getBalance(accountId))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void topUp_success() {
        // Given
        Long accountId = 12L;
        BigDecimal amount = BigDecimal.valueOf(500);
        String desc = "Nạp tiền demo";

        Account userAccount = Account.builder()
                .id(accountId)
                .balance(BigDecimal.valueOf(1000))
                .currency("VND")
                .build();

        Account systemAccount = Account.builder()
                .id(99L)
                .ownerId(0L)
                .ownerType(OwnerType.SYSTEM)
                .balance(BigDecimal.valueOf(10000000))
                .currency("VND")
                .build();

        Transaction transaction = Transaction.builder()
                .id(1L)
                .transactionRef("TXN-TOPUP-12345")
                .sourceAccountId(99L)
                .destAccountId(12L)
                .amount(amount)
                .type(TransactionType.TOPUP)
                .status(TransactionStatus.COMPLETED)
                .description(desc)
                .createdAt(LocalDateTime.now())
                .build();

        when(accountRepository.findById(accountId)).thenReturn(Optional.of(userAccount));
        when(accountRepository.findByOwnerIdAndOwnerType(0L, OwnerType.SYSTEM)).thenReturn(Optional.of(systemAccount));
        when(transactionRepository.save(any(Transaction.class))).thenReturn(transaction);

        // When
        TransactionResponse result = accountService.topUp(accountId, amount, desc);

        // Then
        assertThat(result.transactionRef()).isEqualTo("TXN-TOPUP-12345");
        assertThat(result.amount()).isEqualTo(amount);
        verify(accountRepository, times(2)).save(any(Account.class));
        verify(transactionRepository).save(any(Transaction.class));
        verify(ledgerEntryRepository, times(2)).save(any(LedgerEntry.class));
    }

    @Test
    void topUp_invalidAmount_throwsException() {
        // When & Then
        assertThatThrownBy(() -> accountService.topUp(12L, BigDecimal.valueOf(-100), "Fail"))
                .isInstanceOf(BadRequestException.class);
        verify(accountRepository, never()).save(any());
    }

    @Test
    void getAccountByUsername_success() {
        // Given
        String username = "user1";
        User user = User.builder().username(username).role(Role.USER).build();
        user.setId(5L);
        Account account = Account.builder().ownerId(5L).ownerType(OwnerType.USER).build();
        AccountResponse response = new AccountResponse(12L, 5L, "USER", "AC00000012", BigDecimal.ZERO, "VND", "ACTIVE", null, null);

        when(userRepository.findByUsername(username)).thenReturn(Optional.of(user));
        when(accountRepository.findByOwnerIdAndOwnerType(5L, OwnerType.USER)).thenReturn(Optional.of(account));
        when(accountMapper.toResponse(account)).thenReturn(response);

        // When
        AccountResponse result = accountService.getAccountByUsername(username);

        // Then
        assertThat(result.ownerId()).isEqualTo(5L);
    }

    @Test
    void getBalanceChecked_asOwner_success() {
        // Given
        String username = "user1";
        User user = User.builder().username(username).role(Role.USER).build();
        user.setId(5L);
        Account account = Account.builder().ownerId(5L).ownerType(OwnerType.USER).build();
        AccountResponse response = new AccountResponse(12L, 5L, "USER", "AC00000012", BigDecimal.valueOf(100), "VND", "ACTIVE", null, null);

        when(userRepository.findByUsername(username)).thenReturn(Optional.of(user));
        when(accountRepository.findById(12L)).thenReturn(Optional.of(account));
        when(accountMapper.toResponse(account)).thenReturn(response);

        // When
        AccountResponse result = accountService.getBalanceChecked(12L, username);

        // Then
        assertThat(result.balance()).isEqualTo(BigDecimal.valueOf(100));
    }

    @Test
    void getBalanceChecked_asStranger_throwsAccessDenied() {
        // Given
        String username = "stranger";
        User user = User.builder().username(username).role(Role.USER).build();
        user.setId(9L);
        Account account = Account.builder().ownerId(5L).ownerType(OwnerType.USER).build();

        when(userRepository.findByUsername(username)).thenReturn(Optional.of(user));
        when(accountRepository.findById(12L)).thenReturn(Optional.of(account));

        // When & Then
        assertThatThrownBy(() -> accountService.getBalanceChecked(12L, username))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void getBalanceChecked_asAdmin_success() {
        // Given
        String username = "admin";
        User user = User.builder().username(username).role(Role.ADMIN).build();
        user.setId(9L);
        Account account = Account.builder().ownerId(5L).ownerType(OwnerType.USER).build();
        AccountResponse response = new AccountResponse(12L, 5L, "USER", "AC00000012", BigDecimal.valueOf(100), "VND", "ACTIVE", null, null);

        when(userRepository.findByUsername(username)).thenReturn(Optional.of(user));
        when(accountRepository.findById(12L)).thenReturn(Optional.of(account));
        when(accountMapper.toResponse(account)).thenReturn(response);

        // When
        AccountResponse result = accountService.getBalanceChecked(12L, username);

        // Then
        assertThat(result.balance()).isEqualTo(BigDecimal.valueOf(100));
    }
}
