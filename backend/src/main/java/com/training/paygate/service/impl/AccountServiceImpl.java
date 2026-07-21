package com.training.paygate.service.impl;

import com.training.paygate.dto.response.AccountResponse;
import com.training.paygate.dto.response.TransactionResponse;
import com.training.paygate.entity.Account;
import com.training.paygate.entity.LedgerEntry;
import com.training.paygate.entity.Transaction;
import com.training.paygate.entity.User;
import com.training.paygate.enums.AccountStatus;
import com.training.paygate.enums.EntryType;
import com.training.paygate.enums.OwnerType;
import com.training.paygate.enums.Role;
import com.training.paygate.enums.TransactionStatus;
import com.training.paygate.enums.TransactionType;
import com.training.paygate.exception.BadRequestException;
import com.training.paygate.exception.DuplicateResourceException;
import com.training.paygate.exception.ResourceNotFoundException;
import com.training.paygate.mapper.AccountMapper;
import com.training.paygate.repository.AccountRepository;
import com.training.paygate.repository.UserRepository;
import com.training.paygate.repository.TransactionRepository;
import com.training.paygate.repository.LedgerEntryRepository;
import com.training.paygate.service.AccountService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AccountServiceImpl implements AccountService {

    private final AccountRepository accountRepository;
    private final UserRepository userRepository;
    private final TransactionRepository transactionRepository;
    private final LedgerEntryRepository ledgerEntryRepository;
    private final AccountMapper accountMapper;

    @Override
    @Transactional
    public AccountResponse createAccount(Long ownerId, OwnerType ownerType) {
        if (accountRepository.findByOwnerIdAndOwnerType(ownerId, ownerType).isPresent()) {
            throw new DuplicateResourceException("Account", "ownerId", ownerId);
        }

        Account account = Account.builder()
                .ownerId(ownerId)
                .ownerType(ownerType)
                .balance(BigDecimal.ZERO)
                .currency("VND")
                .status(AccountStatus.ACTIVE)
                .accountNumber("TEMP-" + ownerId + "-" + System.nanoTime())
                .build();

        Account saved = accountRepository.save(account);
        saved.setAccountNumber(String.format("AC%08d", saved.getId()));
        saved = accountRepository.save(saved);

        return accountMapper.toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public AccountResponse getBalance(Long accountId) {
        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Account", accountId));
        return accountMapper.toResponse(account);
    }

    @Override
    @Transactional(readOnly = true)
    public AccountResponse getByOwnerIdAndType(Long ownerId, OwnerType ownerType) {
        Account account = accountRepository.findByOwnerIdAndOwnerType(ownerId, ownerType)
                .orElseThrow(() -> new ResourceNotFoundException("Account for owner ID: " + ownerId + ", type: " + ownerType + " not found"));
        return accountMapper.toResponse(account);
    }

    @Override
    @Transactional
    public TransactionResponse topUp(Long accountId, BigDecimal amount, String description) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BadRequestException("Topup amount must be positive");
        }
        Account userAccount = accountRepository.findById(accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Account", accountId));

        // Get or Create SYSTEM account
        Account systemAccount = accountRepository.findByOwnerIdAndOwnerType(0L, OwnerType.SYSTEM)
                .orElseGet(() -> {
                    Account acc = Account.builder()
                            .ownerId(0L)
                            .ownerType(OwnerType.SYSTEM)
                            .accountNumber("SYS00000000000000001")
                            .balance(BigDecimal.valueOf(1_000_000_000_000.00)) // huge initial balance
                            .currency("VND")
                            .status(AccountStatus.ACTIVE)
                            .build();
                    return accountRepository.save(acc);
                });

        // Update balances
        systemAccount.setBalance(systemAccount.getBalance().subtract(amount));
        userAccount.setBalance(userAccount.getBalance().add(amount));

        accountRepository.save(systemAccount);
        accountRepository.save(userAccount);

        // Save transaction
        Transaction transaction = Transaction.builder()
                .transactionRef("TXN-TOPUP-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase())
                .sourceAccountId(systemAccount.getId())
                .destAccountId(userAccount.getId())
                .amount(amount)
                .currency("VND")
                .type(TransactionType.TOPUP)
                .status(TransactionStatus.COMPLETED)
                .description(description)
                .build();
        transaction = transactionRepository.save(transaction);

        // Save ledger entries
        LedgerEntry debitEntry = LedgerEntry.builder()
                .transactionId(transaction.getId())
                .accountId(systemAccount.getId())
                .entryType(EntryType.DEBIT)
                .amount(amount)
                .balanceAfter(systemAccount.getBalance())
                .build();

        LedgerEntry creditEntry = LedgerEntry.builder()
                .transactionId(transaction.getId())
                .accountId(userAccount.getId())
                .entryType(EntryType.CREDIT)
                .amount(amount)
                .balanceAfter(userAccount.getBalance())
                .build();

        ledgerEntryRepository.save(debitEntry);
        ledgerEntryRepository.save(creditEntry);

        return new TransactionResponse(
                transaction.getTransactionRef(),
                transaction.getStatus().name(),
                transaction.getAmount(),
                transaction.getSourceAccountId(),
                transaction.getDestAccountId(),
                transaction.getType().name(),
                transaction.getDescription(),
                transaction.getCreatedAt()
        );
    }

    @Override
    @Transactional(readOnly = true)
    public AccountResponse getAccountByUsername(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with username: " + username));
        Account account = accountRepository.findByOwnerIdAndOwnerType(user.getId(), OwnerType.USER)
                .orElseThrow(() -> new ResourceNotFoundException("Account for user " + username + " not found"));
        return accountMapper.toResponse(account);
    }

    @Override
    @Transactional(readOnly = true)
    public AccountResponse getBalanceChecked(Long accountId, String currentUsername) {
        User user = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with username: " + currentUsername));

        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Account", accountId));

        if (user.getRole() != Role.ADMIN && !(account.getOwnerId().equals(user.getId()) && account.getOwnerType() == OwnerType.USER)) {
            throw new AccessDeniedException("You do not have permission to access this account's balance");
        }

        return accountMapper.toResponse(account);
    }
}
