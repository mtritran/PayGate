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
import com.training.paygate.entity.UserVoucher;
import com.training.paygate.entity.Voucher;
import com.training.paygate.enums.AccountStatus;
import com.training.paygate.enums.BillStatus;
import com.training.paygate.enums.BillType;
import com.training.paygate.enums.EntryType;
import com.training.paygate.enums.OwnerType;
import com.training.paygate.enums.TransactionStatus;
import com.training.paygate.enums.TransactionType;
import com.training.paygate.enums.UserVoucherStatus;
import com.training.paygate.enums.VoucherApplicableType;
import com.training.paygate.exception.BadRequestException;
import com.training.paygate.exception.BillAlreadyPaidException;
import com.training.paygate.exception.BillNotFoundException;
import com.training.paygate.exception.InsufficientBalanceException;
import com.training.paygate.exception.ResourceNotFoundException;
import com.training.paygate.exception.SavedBillLimitException;
import com.training.paygate.messaging.event.PaymentCompletedEvent;
import com.training.paygate.repository.AccountRepository;
import com.training.paygate.repository.BillProviderRepository;
import com.training.paygate.repository.BillRepository;
import com.training.paygate.repository.LedgerEntryRepository;
import com.training.paygate.repository.MerchantRepository;
import com.training.paygate.repository.SavedBillRepository;
import com.training.paygate.repository.TransactionRepository;
import com.training.paygate.repository.UserRepository;
import com.training.paygate.repository.UserVoucherRepository;
import com.training.paygate.integration.provider.BillProviderClient;
import com.training.paygate.integration.provider.ProviderBillDto;
import com.training.paygate.service.BillService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.core.AmqpTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import com.training.paygate.service.NotificationService;

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
    private final AmqpTemplate amqpTemplate;
    private final UserVoucherRepository userVoucherRepository;
    private final NotificationService notificationService;

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
        UserVoucher appliedVoucher = null;

        if (request.voucherCode() != null && !request.voucherCode().isBlank()) {
            appliedVoucher = userVoucherRepository.findByUserIdAndVoucherCodeAndStatus(
                            user.getId(), request.voucherCode().trim(), UserVoucherStatus.AVAILABLE)
                    .orElseThrow(() -> new BadRequestException("Voucher code not found or not available in your collection"));

            Voucher voucher = appliedVoucher.getVoucher();
            if (voucher.getExpiresAt().isBefore(LocalDateTime.now())) {
                throw new BadRequestException("Voucher has expired");
            }
            if (originalAmount.compareTo(voucher.getMinOrderAmount()) < 0) {
                throw new BadRequestException("Order amount is below minimum order requirement of " + voucher.getMinOrderAmount());
            }
            if (voucher.getApplicableType() != VoucherApplicableType.ALL
                    && voucher.getApplicableType() != VoucherApplicableType.BILL_PAYMENT
                    && voucher.getApplicableType() != VoucherApplicableType.PAYMENT) {
                throw new BadRequestException("Voucher is not applicable for bill payment");
            }
            discountAmount = voucher.getDiscountAmount().min(originalAmount);
        }

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
                    "Insufficient wallet balance. Please top up and try again.");
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

        if (appliedVoucher != null) {
            appliedVoucher.setStatus(UserVoucherStatus.USED);
            appliedVoucher.setUsedAt(paidAt);
            userVoucherRepository.save(appliedVoucher);
        }

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

        // Publish event để tích điểm
        PaymentCompletedEvent event = new PaymentCompletedEvent(
                transaction.getTransactionRef(),
                merchant.getId(),
                merchant.getWebhookUrl(),
                transaction.getAmount(),
                transaction.getStatus().name(),
                user.getEmail(),
                user.getUsername(),
                lockedDest.getAccountNumber(),
                transaction.getDescription(),
                transaction.getType(),
                user.getId());
        try {
            amqpTemplate.convertAndSend("payment.exchange", "payment.completed", event);
            log.info("[BILL PAYMENT] Published PaymentCompletedEvent for txRef {}", transaction.getTransactionRef());
        } catch (Exception e) {
            log.warn("Could not publish PaymentCompletedEvent for bill payment: {}", e.getMessage());
        }

        // Save real-time notification for bill payment
        try {
            String billMsg = String.format("Thanh toán thành công hóa đơn %s (Mã KH: %s). Số tiền: -%,.0f VND. Giao dịch: %s.",
                    provider.getName(), bill.getCustomerCode(), paidAmount.doubleValue(), transaction.getTransactionRef());
            notificationService.createNotification(user.getId(), "Thanh toán hóa đơn thành công", billMsg, "BILL_PAYMENT");
        } catch (Exception ne) {
            log.error("Failed to create bill payment notification: {}", ne.getMessage());
        }

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
