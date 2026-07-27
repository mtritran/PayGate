package com.training.paygate.service.impl;

import com.training.paygate.cache.BalanceCacheService;
import com.training.paygate.dto.request.CreateSavedBillRequest;
import com.training.paygate.dto.request.LookupBillRequest;
import com.training.paygate.dto.request.PayBillRequest;
import com.training.paygate.dto.response.BillLookupResponse;
import com.training.paygate.dto.response.BillPayResponse;
import com.training.paygate.dto.response.BillProviderResponse;
import com.training.paygate.dto.response.SavedBillResponse;
import com.training.paygate.entity.Account;
import com.training.paygate.entity.Bill;
import com.training.paygate.entity.BillProvider;
import com.training.paygate.entity.LedgerEntry;
import com.training.paygate.entity.Merchant;
import com.training.paygate.entity.SavedBill;
import com.training.paygate.entity.Transaction;
import com.training.paygate.entity.User;
import com.training.paygate.enums.AccountStatus;
import com.training.paygate.enums.BillStatus;
import com.training.paygate.enums.BillType;
import com.training.paygate.enums.EntryType;
import com.training.paygate.enums.OwnerType;
import com.training.paygate.enums.TransactionStatus;
import com.training.paygate.enums.TransactionType;
import com.training.paygate.exception.BadRequestException;
import com.training.paygate.exception.BillAlreadyPaidException;
import com.training.paygate.exception.BillNotFoundException;
import com.training.paygate.exception.InsufficientBalanceException;
import com.training.paygate.exception.ResourceNotFoundException;
import com.training.paygate.exception.SavedBillLimitException;
import com.training.paygate.repository.AccountRepository;
import com.training.paygate.repository.BillProviderRepository;
import com.training.paygate.repository.BillRepository;
import com.training.paygate.repository.LedgerEntryRepository;
import com.training.paygate.repository.MerchantRepository;
import com.training.paygate.repository.SavedBillRepository;
import com.training.paygate.repository.TransactionRepository;
import com.training.paygate.repository.UserRepository;
import com.training.paygate.integration.provider.BillProviderClient;
import com.training.paygate.integration.provider.ProviderBillDto;
import com.training.paygate.service.BillService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class BillServiceImpl implements BillService {

    private static final int MAX_SAVED_BILLS_PER_USER = 10;

    private final BillProviderRepository billProviderRepository;
    private final BillRepository billRepository;
    private final SavedBillRepository savedBillRepository;
    private final AccountRepository accountRepository;
    private final UserRepository userRepository;
    private final MerchantRepository merchantRepository;
    private final TransactionRepository transactionRepository;
    private final LedgerEntryRepository ledgerEntryRepository;
    private final BalanceCacheService balanceCacheService;
    private final BillProviderClient billProviderClient;

    @Override
    @Transactional(readOnly = true)
    public List<BillProviderResponse> getProviders(BillType type) {
        List<BillProvider> providers = (type == null)
                ? billProviderRepository.findByActiveTrue()
                : billProviderRepository.findByTypeAndActiveTrue(type);
        return providers.stream()
                .map(p -> new BillProviderResponse(p.getId(), p.getCode(), p.getName(), p.getType().name()))
                .toList();
    }

    @Override
    @Transactional
    public BillLookupResponse lookup(LookupBillRequest request) {
        BillProvider provider = billProviderRepository.findByCode(request.providerCode())
                .orElseThrow(() -> new BillNotFoundException("Provider not found with code: " + request.providerCode()));

        Bill bill = billRepository.findFirstByProviderIdAndCustomerCodeAndStatusOrderByIdDesc(
                        provider.getId(), request.customerCode(), BillStatus.UNPAID)
                .orElseGet(() -> {
                    ProviderBillDto pb = billProviderClient.currentBill(request.customerCode())
                            .orElseThrow(() -> new BillNotFoundException(
                                    "Bill not found with customer code: " + request.customerCode()));
                    if (!provider.getCode().equalsIgnoreCase(pb.providerCode())) {
                        throw new BillNotFoundException(
                                "Customer code " + request.customerCode() + " belongs to provider " + pb.providerCode()
                                        + ", not " + provider.getCode());
                    }
                    Bill created = Bill.builder()
                            .providerId(provider.getId())
                            .customerCode(pb.customerCode())
                            .customerName(pb.customerName())
                            .address(pb.address())
                            .amount(pb.amount())
                            .period(pb.period())
                            .status(BillStatus.UNPAID)
                            .build();
                    Bill saved = billRepository.save(created);
                    log.info("Created bill #{} from provider gateway lookup: {} / {}",
                            saved.getId(), provider.getCode(), pb.customerCode());
                    return saved;
                });

        return new BillLookupResponse(
                bill.getId(),
                provider.getCode(),
                provider.getName(),
                bill.getCustomerCode(),
                bill.getCustomerName(),
                bill.getAddress(),
                bill.getPeriod(),
                bill.getAmount(),
                bill.getStatus().name()
        );
    }

    @Override
    @Transactional(isolation = Isolation.SERIALIZABLE)
    public BillPayResponse pay(PayBillRequest request, String currentUsername) {
        Bill bill = billRepository.findById(request.billId())
                .orElseThrow(() -> new BillNotFoundException("Bill not found with id: " + request.billId()));

        if (bill.getStatus() == BillStatus.PAID) {
            throw new BillAlreadyPaidException("Bill #" + bill.getId() + " has already been paid");
        }

        BillProvider provider = billProviderRepository.findById(bill.getProviderId())
                .orElseThrow(() -> new ResourceNotFoundException("BillProvider", bill.getProviderId()));

        Merchant merchant = merchantRepository.findById(provider.getMerchantId())
                .orElseThrow(() -> new ResourceNotFoundException("Merchant", provider.getMerchantId()));
        if (!merchant.isActive()) {
            throw new BadRequestException("Provider merchant is inactive");
        }

        User user = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with username: " + currentUsername));
        Account sourceAccount = accountRepository.findByOwnerIdAndOwnerType(user.getId(), OwnerType.USER)
                .orElseThrow(() -> new ResourceNotFoundException("Source account not found for user: " + currentUsername));
        Account destAccount = accountRepository.findByOwnerIdAndOwnerType(merchant.getId(), OwnerType.MERCHANT)
                .orElseThrow(() -> new ResourceNotFoundException("Provider merchant account not found"));

        java.math.BigDecimal originalAmount = bill.getAmount();
        java.math.BigDecimal discountAmount = java.math.BigDecimal.ZERO;
        java.math.BigDecimal paidAmount = originalAmount.subtract(discountAmount);

        Long firstId = Math.min(sourceAccount.getId(), destAccount.getId());
        Long secondId = Math.max(sourceAccount.getId(), destAccount.getId());

        Account firstLocked = accountRepository.findByIdForUpdate(firstId)
                .orElseThrow(() -> new ResourceNotFoundException("Account", firstId));
        Account secondLocked = accountRepository.findByIdForUpdate(secondId)
                .orElseThrow(() -> new ResourceNotFoundException("Account", secondId));

        Account lockedSource = firstLocked.getId().equals(sourceAccount.getId()) ? firstLocked : secondLocked;
        Account lockedDest = firstLocked.getId().equals(destAccount.getId()) ? firstLocked : secondLocked;

        if (lockedSource.getStatus() != AccountStatus.ACTIVE) {
            throw new BadRequestException("Source account is not active");
        }
        if (lockedDest.getStatus() != AccountStatus.ACTIVE) {
            throw new BadRequestException("Provider merchant account is not active");
        }
        if (lockedSource.getBalance().compareTo(paidAmount) < 0) {
            throw new InsufficientBalanceException(
                    "Insufficient balance in account: " + lockedSource.getAccountNumber());
        }

        lockedSource.setBalance(lockedSource.getBalance().subtract(paidAmount));
        lockedDest.setBalance(lockedDest.getBalance().add(paidAmount));
        accountRepository.save(lockedSource);
        accountRepository.save(lockedDest);

        Transaction transaction = Transaction.builder()
                .transactionRef("TXN-BILL-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase())
                .idempotencyKey("BILL-" + bill.getId() + "-" + UUID.randomUUID())
                .sourceAccountId(lockedSource.getId())
                .destAccountId(lockedDest.getId())
                .amount(paidAmount)
                .currency("VND")
                .type(TransactionType.BILL_PAYMENT)
                .status(TransactionStatus.COMPLETED)
                .merchantId(merchant.getId())
                .description("Bill Payment: " + provider.getName() + " - " + bill.getCustomerCode() + " (" + bill.getPeriod() + ")")
                .build();
        transaction = transactionRepository.save(transaction);

        LedgerEntry debit = LedgerEntry.builder()
                .transactionId(transaction.getId())
                .accountId(lockedSource.getId())
                .entryType(EntryType.DEBIT)
                .amount(paidAmount)
                .balanceAfter(lockedSource.getBalance())
                .build();
        LedgerEntry credit = LedgerEntry.builder()
                .transactionId(transaction.getId())
                .accountId(lockedDest.getId())
                .entryType(EntryType.CREDIT)
                .amount(paidAmount)
                .balanceAfter(lockedDest.getBalance())
                .build();
        ledgerEntryRepository.save(debit);
        ledgerEntryRepository.save(credit);

        LocalDateTime paidAt = LocalDateTime.now();
        bill.setStatus(BillStatus.PAID);
        bill.setTransactionRef(transaction.getTransactionRef());
        bill.setPaidAt(paidAt);
        billRepository.save(bill);

        final Long sourceIdToEvict = lockedSource.getId();
        final Long destIdToEvict = lockedDest.getId();
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    balanceCacheService.evictBalance(sourceIdToEvict);
                    balanceCacheService.evictBalance(destIdToEvict);
                }
            });
        } else {
            balanceCacheService.evictBalance(sourceIdToEvict);
            balanceCacheService.evictBalance(destIdToEvict);
        }

        log.info("Bill #{} paid by user {} via txRef {}", bill.getId(), currentUsername, transaction.getTransactionRef());

        return new BillPayResponse(
                bill.getId(),
                bill.getStatus().name(),
                originalAmount,
                discountAmount,
                paidAmount,
                transaction.getTransactionRef(),
                paidAt
        );
    }

    @Override
    @Transactional(readOnly = true)
    public List<SavedBillResponse> getSavedBills(String currentUsername) {
        User user = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + currentUsername));
        return savedBillRepository.findByUserIdOrderByCreatedAtDesc(user.getId()).stream()
                .map(this::toSavedBillResponse)
                .toList();
    }

    @Override
    @Transactional
    public SavedBillResponse saveBill(CreateSavedBillRequest request, String currentUsername) {
        User user = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + currentUsername));

        BillProvider provider = billProviderRepository.findByCode(request.providerCode())
                .orElseThrow(() -> new ResourceNotFoundException("Provider not found with code: " + request.providerCode()));

        if (savedBillRepository.existsByUserIdAndProviderIdAndCustomerCode(user.getId(), provider.getId(), request.customerCode())) {
            throw new com.training.paygate.exception.DuplicateResourceException(
                    "Bill already saved for provider " + request.providerCode() + " and customer " + request.customerCode());
        }
        if (savedBillRepository.countByUserId(user.getId()) >= MAX_SAVED_BILLS_PER_USER) {
            throw new SavedBillLimitException("Maximum saved bills limit (" + MAX_SAVED_BILLS_PER_USER + ") reached");
        }

        SavedBill saved = SavedBill.builder()
                .userId(user.getId())
                .providerId(provider.getId())
                .customerCode(request.customerCode())
                .nickname(request.nickname())
                .build();
        saved = savedBillRepository.save(saved);
        return toSavedBillResponse(saved);
    }

    private SavedBillResponse toSavedBillResponse(SavedBill saved) {
        BillProvider p = billProviderRepository.findById(saved.getProviderId()).orElse(null);
        return new SavedBillResponse(
                saved.getId(),
                saved.getProviderId(),
                p != null ? p.getCode() : null,
                p != null ? p.getName() : null,
                p != null ? p.getType().name() : null,
                saved.getCustomerCode(),
                saved.getNickname()
        );
    }
}
