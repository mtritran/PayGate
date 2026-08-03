package com.training.paygate.service.impl;

import com.training.paygate.cache.BalanceCacheService;
import com.training.paygate.dto.request.CreateVaultRequest;
import com.training.paygate.dto.request.DepositVaultRequest;
import com.training.paygate.dto.request.UpdateVaultRequest;
import com.training.paygate.dto.request.WithdrawVaultRequest;
import com.training.paygate.dto.response.AccountResponse;
import com.training.paygate.dto.response.VaultResponse;
import com.training.paygate.dto.response.VaultTransactionResponse;
import com.training.paygate.entity.Account;
import com.training.paygate.entity.LedgerEntry;
import com.training.paygate.entity.Transaction;
import com.training.paygate.entity.User;
import com.training.paygate.entity.Vault;
import com.training.paygate.enums.AccountStatus;
import com.training.paygate.enums.EntryType;
import com.training.paygate.enums.OwnerType;
import com.training.paygate.enums.TransactionStatus;
import com.training.paygate.enums.TransactionType;
import com.training.paygate.enums.VaultStatus;
import com.training.paygate.exception.BadRequestException;
import com.training.paygate.exception.InsufficientBalanceException;
import com.training.paygate.exception.ResourceNotFoundException;
import com.training.paygate.mapper.VaultMapper;
import com.training.paygate.messaging.event.PaymentCompletedEvent;
import com.training.paygate.repository.AccountRepository;
import com.training.paygate.repository.LedgerEntryRepository;
import com.training.paygate.repository.TransactionRepository;
import com.training.paygate.repository.UserRepository;
import com.training.paygate.repository.VaultRepository;
import com.training.paygate.service.AccountService;
import com.training.paygate.service.VaultService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.core.AmqpTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import com.training.paygate.service.NotificationService;

@Service
@RequiredArgsConstructor
@Slf4j
public class VaultServiceImpl implements VaultService {

    private final VaultRepository vaultRepository;
    private final UserRepository userRepository;
    private final AccountRepository accountRepository;
    private final TransactionRepository transactionRepository;
    private final LedgerEntryRepository ledgerEntryRepository;
    private final BalanceCacheService balanceCacheService;
    private final AccountService accountService;
    private final VaultMapper vaultMapper;
    private final AmqpTemplate amqpTemplate;
    private final NotificationService notificationService;

    @Override
    @Transactional(readOnly = true)
    public List<VaultResponse> getAll(String username) {
        User user = getUser(username);
        return vaultRepository.findByUserIdOrderByCreatedAtDesc(user.getId())
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public VaultResponse getById(Long id, String username) {
        return toResponse(getOwnedVault(id, username));
    }

    @Override
    @Transactional
    public VaultResponse create(CreateVaultRequest request, String username) {
        User user = getUser(username);
        Vault vault = vaultMapper.toEntity(request);
        vault.setUserId(user.getId());
        vault.setStatus(VaultStatus.ACTIVE);
        vault = vaultRepository.save(vault);

        AccountResponse account = accountService.createAccount(vault.getId(), OwnerType.VAULT);
        vault.setAccountId(account.id());
        return toResponse(vaultRepository.save(vault));
    }

    @Override
    @Transactional
    public VaultResponse update(Long id, UpdateVaultRequest request, String username) {
        Vault vault = getOwnedVault(id, username);
        vault.setName(request.name());
        vault.setDescription(request.description());
        vault.setTargetAmount(request.targetAmount());
        vault.setDeadline(request.deadline());

        if (vault.getStatus() != VaultStatus.CLOSED) {
            BigDecimal balance = accountRepository.findById(vault.getAccountId())
                    .map(Account::getBalance)
                    .orElse(BigDecimal.ZERO);
            boolean completed = balance.compareTo(vault.getTargetAmount()) >= 0;
            vault.setStatus(completed ? VaultStatus.COMPLETED : VaultStatus.ACTIVE);
            vault.setCompletedAt(completed ? LocalDateTime.now() : null);
        }

        return toResponse(vaultRepository.save(vault));
    }

    @Override
    @Transactional(isolation = Isolation.SERIALIZABLE)
    public VaultTransactionResponse deposit(Long id, DepositVaultRequest request, String username) {
        Vault vault = getOwnedVault(id, username);
        ensureOpen(vault);

        User user = getUser(username);
        Account userAccount = findAccount(user.getId(), OwnerType.USER);
        Account vaultAccount = findAccount(vault.getId(), OwnerType.VAULT);
        LockedAccounts locked = lock(userAccount.getId(), vaultAccount.getId());

        if (locked.user.getStatus() != AccountStatus.ACTIVE || locked.vault.getStatus() != AccountStatus.ACTIVE) {
            throw new BadRequestException("Account is not active");
        }
        if (locked.user.getBalance().compareTo(request.amount()) < 0) {
            throw new InsufficientBalanceException("Insufficient balance in wallet");
        }

        locked.user.setBalance(locked.user.getBalance().subtract(request.amount()));
        locked.vault.setBalance(locked.vault.getBalance().add(request.amount()));
        accountRepository.save(locked.user);
        accountRepository.save(locked.vault);

        Transaction tx = saveTransaction("TXN-VDEP-", locked.user.getId(), locked.vault.getId(), request.amount(),
                TransactionType.VAULT_DEPOSIT, request.description());
        saveLedger(tx.getId(), locked.user, locked.vault, request.amount());
        evictAfterCommit(locked.user.getId(), locked.vault.getId());

        if (vault.getStatus() == VaultStatus.ACTIVE && locked.vault.getBalance().compareTo(vault.getTargetAmount()) >= 0) {
            vault.setStatus(VaultStatus.COMPLETED);
            vault.setCompletedAt(LocalDateTime.now());
            vaultRepository.save(vault);
        }

        // Publish event để tích điểm cho VAULT_DEPOSIT
        PaymentCompletedEvent vaultDepositEvent = new PaymentCompletedEvent(
                tx.getTransactionRef(),
                null,
                null,
                request.amount(),
                tx.getStatus().name(),
                user.getEmail(),
                user.getUsername(),
                locked.vault.getAccountNumber(),
                tx.getDescription(),
                tx.getType(),
                user.getId());
        try {
            amqpTemplate.convertAndSend("payment.exchange", "payment.completed", vaultDepositEvent);
            log.info("[VAULT DEPOSIT] Published PaymentCompletedEvent for txRef {}", tx.getTransactionRef());
        } catch (Exception e) {
            log.warn("Could not publish PaymentCompletedEvent for vault deposit: {}", e.getMessage());
        }

        // Save real-time notification for vault deposit
        try {
            String depMsg = String.format("Bạn đã tích lũy vào Heo Đất '%s' số tiền +%,.0f VND. Giao dịch: %s.",
                    vault.getName(), request.amount().doubleValue(), tx.getTransactionRef());
            notificationService.createNotification(user.getId(), "Tích lũy Heo Đất thành công", depMsg, "VAULT_DEPOSIT");
        } catch (Exception ne) {
            log.error("Failed to create vault deposit notification: {}", ne.getMessage());
        }

        return new VaultTransactionResponse(tx.getTransactionRef(), request.amount(), locked.vault.getBalance(), vault.getStatus().name());
    }

    @Override
    @Transactional(isolation = Isolation.SERIALIZABLE)
    public VaultTransactionResponse withdraw(Long id, WithdrawVaultRequest request, String username) {
        Vault vault = getOwnedVault(id, username);
        ensureOpen(vault);

        User user = getUser(username);
        Account userAccount = findAccount(user.getId(), OwnerType.USER);
        Account vaultAccount = findAccount(vault.getId(), OwnerType.VAULT);
        LockedAccounts locked = lock(userAccount.getId(), vaultAccount.getId());

        if (locked.vault.getBalance().compareTo(request.amount()) < 0) {
            throw new InsufficientBalanceException("Insufficient balance in vault");
        }

        locked.vault.setBalance(locked.vault.getBalance().subtract(request.amount()));
        locked.user.setBalance(locked.user.getBalance().add(request.amount()));
        accountRepository.save(locked.vault);
        accountRepository.save(locked.user);

        Transaction tx = saveTransaction("TXN-VWITH-", locked.vault.getId(), locked.user.getId(), request.amount(),
                TransactionType.VAULT_WITHDRAW, request.description());
        saveLedger(tx.getId(), locked.vault, locked.user, request.amount());
        evictAfterCommit(locked.user.getId(), locked.vault.getId());

        // Save real-time notification for vault withdrawal
        try {
            String withMsg = String.format("Bạn đã rút tiền từ Heo Đất '%s' số tiền -%,.0f VND về ví. Giao dịch: %s.",
                    vault.getName(), request.amount().doubleValue(), tx.getTransactionRef());
            notificationService.createNotification(user.getId(), "Rút tiền Heo Đất thành công", withMsg, "VAULT_WITHDRAW");
        } catch (Exception ne) {
            log.error("Failed to create vault withdraw notification: {}", ne.getMessage());
        }

        return new VaultTransactionResponse(tx.getTransactionRef(), request.amount(), locked.vault.getBalance(), vault.getStatus().name());
    }

    @Override
    @Transactional
    public VaultResponse close(Long id, String username) {
        Vault vault = getOwnedVault(id, username);
        if (vault.getStatus() == VaultStatus.CLOSED) {
            throw new BadRequestException("Vault is already closed");
        }
        vault.setStatus(VaultStatus.CLOSED);
        vault.setClosedAt(LocalDateTime.now());
        return toResponse(vaultRepository.save(vault));
    }

    @Override
    @Transactional
    public VaultResponse reopen(Long id, String username) {
        Vault vault = getOwnedVault(id, username);
        if (vault.getStatus() != VaultStatus.CLOSED) {
            throw new BadRequestException("Vault is not closed");
        }
        BigDecimal balance = accountRepository.findById(vault.getAccountId())
                .map(Account::getBalance)
                .orElse(BigDecimal.ZERO);
        vault.setStatus(balance.compareTo(vault.getTargetAmount()) >= 0 ? VaultStatus.COMPLETED : VaultStatus.ACTIVE);
        vault.setClosedAt(null);
        return toResponse(vaultRepository.save(vault));
    }

    private User getUser(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with username: " + username));
    }

    private Vault getOwnedVault(Long id, String username) {
        User user = getUser(username);
        return vaultRepository.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Vault", id));
    }

    private Account findAccount(Long ownerId, OwnerType ownerType) {
        return accountRepository.findByOwnerIdAndOwnerType(ownerId, ownerType)
                .orElseThrow(() -> new ResourceNotFoundException("Account for owner ID: " + ownerId + ", type: " + ownerType + " not found"));
    }

    private LockedAccounts lock(Long userAccountId, Long vaultAccountId) {
        Long firstId = Math.min(userAccountId, vaultAccountId);
        Long secondId = Math.max(userAccountId, vaultAccountId);
        Account first = accountRepository.findByIdForUpdate(firstId)
                .orElseThrow(() -> new ResourceNotFoundException("Account", firstId));
        Account second = accountRepository.findByIdForUpdate(secondId)
                .orElseThrow(() -> new ResourceNotFoundException("Account", secondId));
        Account user = first.getId().equals(userAccountId) ? first : second;
        Account vault = first.getId().equals(vaultAccountId) ? first : second;
        return new LockedAccounts(user, vault);
    }

    private Transaction saveTransaction(String prefix, Long sourceId, Long destId, BigDecimal amount, TransactionType type, String description) {
        Transaction tx = Transaction.builder()
                .transactionRef(prefix + UUID.randomUUID().toString().substring(0, 8).toUpperCase())
                .sourceAccountId(sourceId)
                .destAccountId(destId)
                .amount(amount)
                .currency("VND")
                .type(type)
                .status(TransactionStatus.COMPLETED)
                .description(description)
                .build();
        return transactionRepository.save(tx);
    }

    private void saveLedger(Long transactionId, Account debit, Account credit, BigDecimal amount) {
        ledgerEntryRepository.save(LedgerEntry.builder()
                .transactionId(transactionId)
                .accountId(debit.getId())
                .entryType(EntryType.DEBIT)
                .amount(amount)
                .balanceAfter(debit.getBalance())
                .build());
        ledgerEntryRepository.save(LedgerEntry.builder()
                .transactionId(transactionId)
                .accountId(credit.getId())
                .entryType(EntryType.CREDIT)
                .amount(amount)
                .balanceAfter(credit.getBalance())
                .build());
    }

    private void evictAfterCommit(Long firstAccountId, Long secondAccountId) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    balanceCacheService.evictBalance(firstAccountId);
                    balanceCacheService.evictBalance(secondAccountId);
                }
            });
        } else {
            balanceCacheService.evictBalance(firstAccountId);
            balanceCacheService.evictBalance(secondAccountId);
        }
    }

    private void ensureOpen(Vault vault) {
        if (vault.getStatus() == VaultStatus.CLOSED) {
            throw new BadRequestException("Vault is closed");
        }
    }

    private VaultResponse toResponse(Vault vault) {
        BigDecimal balance = accountRepository.findById(vault.getAccountId())
                .map(Account::getBalance)
                .orElse(BigDecimal.ZERO);
        BigDecimal progress = vault.getTargetAmount().compareTo(BigDecimal.ZERO) == 0
                ? BigDecimal.ZERO
                : balance.multiply(BigDecimal.valueOf(100)).divide(vault.getTargetAmount(), 2, RoundingMode.HALF_UP);
        return new VaultResponse(
                vault.getId(),
                vault.getName(),
                vault.getDescription(),
                vault.getTargetAmount(),
                balance,
                progress,
                vault.getDeadline(),
                vault.getStatus(),
                vault.getCreatedAt(),
                vault.getUpdatedAt()
        );
    }

    private record LockedAccounts(Account user, Account vault) {}
}
