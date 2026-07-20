package com.training.paygate.service;

import com.training.paygate.dto.response.AccountResponse;
import com.training.paygate.entity.Account;
import com.training.paygate.enums.AccountStatus;
import com.training.paygate.enums.OwnerType;
import com.training.paygate.exception.BadRequestException;
import com.training.paygate.exception.DuplicateResourceException;
import com.training.paygate.exception.ResourceNotFoundException;
import com.training.paygate.mapper.AccountMapper;
import com.training.paygate.repository.AccountRepository;
import com.training.paygate.service.impl.AccountServiceImpl;
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
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AccountServiceTest {

    @Mock
    private AccountRepository accountRepository;

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
        Account account = Account.builder()
                .id(accountId)
                .balance(BigDecimal.valueOf(1000))
                .build();
        AccountResponse response = new AccountResponse(
                12L, 1L, "USER", "AC00000012", BigDecimal.valueOf(1500), "VND", "ACTIVE", LocalDateTime.now(), LocalDateTime.now()
        );

        when(accountRepository.findById(accountId)).thenReturn(Optional.of(account));
        when(accountRepository.save(account)).thenReturn(account);
        when(accountMapper.toResponse(account)).thenReturn(response);

        // When
        AccountResponse result = accountService.topUp(accountId, amount);

        // Then
        assertThat(result.balance()).isEqualTo(BigDecimal.valueOf(1500));
        verify(accountRepository).save(account);
    }

    @Test
    void topUp_invalidAmount_throwsException() {
        // When & Then
        assertThatThrownBy(() -> accountService.topUp(12L, BigDecimal.valueOf(-100)))
                .isInstanceOf(BadRequestException.class);
        verify(accountRepository, never()).save(any());
    }
}
