package com.training.paygate.service.impl;

import com.training.paygate.dto.request.CreateRecurringPaymentRequest;
import com.training.paygate.dto.request.PaymentRequest;
import com.training.paygate.dto.request.UpdateRecurringPaymentStatusRequest;
import com.training.paygate.dto.response.RecurringPaymentLogResponse;
import com.training.paygate.dto.response.RecurringPaymentResponse;
import com.training.paygate.dto.response.TransactionResponse;
import com.training.paygate.entity.Account;
import com.training.paygate.entity.RecurringPayment;
import com.training.paygate.entity.RecurringPaymentLog;
import com.training.paygate.entity.User;
import com.training.paygate.enums.OwnerType;
import com.training.paygate.enums.RecurringFrequency;
import com.training.paygate.enums.RecurringStatus;
import com.training.paygate.enums.RecurringType;
import com.training.paygate.exception.BadRequestException;
import com.training.paygate.exception.ResourceNotFoundException;
import com.training.paygate.repository.AccountRepository;
import com.training.paygate.repository.RecurringPaymentLogRepository;
import com.training.paygate.repository.RecurringPaymentRepository;
import com.training.paygate.repository.UserRepository;
import com.training.paygate.service.RecurringPaymentService;
import com.training.paygate.service.TransactionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class RecurringPaymentServiceImpl implements RecurringPaymentService {

    private final RecurringPaymentRepository recurringPaymentRepository;
    private final RecurringPaymentLogRepository recurringPaymentLogRepository;
    private final UserRepository userRepository;
    private final AccountRepository accountRepository;
    private final TransactionService transactionService;

    @Override
    @Transactional
    public RecurringPaymentResponse create(CreateRecurringPaymentRequest request, String currentUsername) {
        User user = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + currentUsername));

        if (request.type() == RecurringType.RECURRING_TRANSFER && request.destAccountId() == null) {
            throw new BadRequestException("Destination account ID is required for recurring transfer");
        }

        LocalDateTime start = request.startDate() != null ? request.startDate() : LocalDateTime.now();
        // Set initial nextRunAt to start time so worker picks it up as soon as due
        LocalDateTime nextRun = start;

        RecurringPayment rp = RecurringPayment.builder()
                .userId(user.getId())
                .type(request.type())
                .category(request.category())
                .providerCode(request.providerCode())
                .billCode(request.billCode())
                .destAccountId(request.destAccountId())
                .amount(request.amount())
                .currency("VND")
                .description(request.description())
                .frequency(request.frequency())
                .status(RecurringStatus.ACTIVE)
                .startDate(start)
                .nextRunAt(nextRun)
                .failureCount(0)
                .build();

        recurringPaymentRepository.save(rp);
        log.info("Created recurring payment schedule ID={} for user={}", rp.getId(), currentUsername);
        return mapToResponse(rp);
    }

    @Override
    @Transactional(readOnly = true)
    public List<RecurringPaymentResponse> getMyRecurringPayments(String currentUsername) {
        User user = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + currentUsername));

        return recurringPaymentRepository.findByUserIdOrderByCreatedAtDesc(user.getId())
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public RecurringPaymentResponse getById(Long id, String currentUsername) {
        User user = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + currentUsername));

        RecurringPayment rp = recurringPaymentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Recurring Payment schedule", id));

        if (!rp.getUserId().equals(user.getId())) {
            throw new BadRequestException("Access denied");
        }

        return mapToResponse(rp);
    }

    @Override
    @Transactional
    public RecurringPaymentResponse updateStatus(Long id, UpdateRecurringPaymentStatusRequest request, String currentUsername) {
        User user = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + currentUsername));

        RecurringPayment rp = recurringPaymentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Recurring Payment schedule", id));

        if (!rp.getUserId().equals(user.getId())) {
            throw new BadRequestException("Access denied");
        }

        rp.setStatus(request.status());
        recurringPaymentRepository.save(rp);
        log.info("Updated status of recurring payment ID={} to {}", id, request.status());
        return mapToResponse(rp);
    }

    @Override
    @Transactional
    public void delete(Long id, String currentUsername) {
        User user = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + currentUsername));

        RecurringPayment rp = recurringPaymentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Recurring Payment schedule", id));

        if (!rp.getUserId().equals(user.getId())) {
            throw new BadRequestException("Access denied");
        }

        recurringPaymentRepository.delete(rp);
        log.info("Deleted recurring payment ID={}", id);
    }

    @Override
    @Transactional(readOnly = true)
    public List<RecurringPaymentLogResponse> getLogs(Long id, String currentUsername) {
        User user = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + currentUsername));

        RecurringPayment rp = recurringPaymentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Recurring Payment schedule", id));

        if (!rp.getUserId().equals(user.getId())) {
            throw new BadRequestException("Access denied");
        }

        return recurringPaymentLogRepository.findByRecurringPaymentIdOrderByExecutedAtDesc(id)
                .stream()
                .map(l -> new RecurringPaymentLogResponse(
                        l.getId(),
                        l.getRecurringPaymentId(),
                        l.getTransactionRef(),
                        l.getStatus(),
                        l.getMessage(),
                        l.getExecutedAt()
                ))
                .toList();
    }

    @Override
    public RecurringPaymentResponse executeNow(Long id, String currentUsername) {
        User user = userRepository.findAllByUsernameIgnoreCase(currentUsername).stream().findFirst()
                .orElseGet(() -> userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + currentUsername)));

        RecurringPayment rp = recurringPaymentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Recurring Payment schedule", id));

        if (!rp.getUserId().equals(user.getId())) {
            throw new BadRequestException("Access denied");
        }

        String failureReason = executeSinglePayment(rp, LocalDateTime.now());
        if (failureReason != null) {
            throw new BadRequestException("Payment execution failed: " + failureReason);
        }

        return mapToResponse(recurringPaymentRepository.findById(id).orElse(rp));
    }

    @Override
    public void executeDuePayments() {
        LocalDateTime now = LocalDateTime.now();
        List<RecurringPayment> duePayments = recurringPaymentRepository.findDuePayments(RecurringStatus.ACTIVE, now);

        if (duePayments.isEmpty()) return;

        log.info("Found {} due recurring payments to execute", duePayments.size());

        for (RecurringPayment rp : duePayments) {
            try {
                executeSinglePayment(rp, now);
            } catch (Exception e) {
                log.error("Unhandled error processing recurring payment ID={}: {}", rp.getId(), e.getMessage());
            }
        }
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public String executeSinglePayment(RecurringPayment rp, LocalDateTime now) {
        User user = userRepository.findById(rp.getUserId()).orElse(null);
        if (user == null) {
            log.warn("User ID={} not found for recurring payment ID={}", rp.getUserId(), rp.getId());
            return "User setup failed";
        }

        String idempotencyKey = "REC-" + rp.getId() + "-" + System.currentTimeMillis();
        String errorResult = null;

        try {
            Account userSourceAccount = accountRepository.findByOwnerIdAndOwnerType(user.getId(), OwnerType.USER).orElse(null);

            Long targetDestId = rp.getDestAccountId();
            if (rp.getType() == RecurringType.BILL_PAYMENT || targetDestId == null) {
                Account systemAdminAccount = accountRepository.findByOwnerIdAndOwnerType(1L, OwnerType.USER)
                        .orElse(null);
                if (systemAdminAccount != null) {
                    targetDestId = systemAdminAccount.getId();
                } else {
                    targetDestId = 1L;
                }
            }

            // Ensure source and destination accounts are not identical
            if (userSourceAccount != null && userSourceAccount.getId().equals(targetDestId)) {
                targetDestId = userSourceAccount.getId().equals(1L) ? 2L : 1L;
            }

            PaymentRequest request = new PaymentRequest(
                    idempotencyKey,
                    targetDestId,
                    rp.getAmount(),
                    "[" + rp.getCategory() + "] " + (rp.getDescription() != null ? rp.getDescription() : "Auto payment"),
                    null,
                    null
            );

            TransactionResponse txRes = transactionService.processPayment(request, user.getUsername(), "internal");

            // Log success
            RecurringPaymentLog logEntity = RecurringPaymentLog.builder()
                    .recurringPaymentId(rp.getId())
                    .transactionRef(txRes.transactionRef())
                    .status("SUCCESS")
                    .message("Transaction successful: " + txRes.transactionRef())
                    .executedAt(now)
                    .build();
            recurringPaymentLogRepository.save(logEntity);

            // Update schedule
            rp.setLastRunAt(now);
            rp.setFailureCount(0);

            if (rp.getFrequency() == RecurringFrequency.ONCE) {
                rp.setStatus(RecurringStatus.COMPLETED);
            } else {
                rp.setNextRunAt(calculateNextRun(now, rp.getFrequency()));
            }
            recurringPaymentRepository.save(rp);

            log.info("Successfully executed recurring payment ID={} txRef={}", rp.getId(), txRes.transactionRef());
            return null; // Success!

        } catch (Exception e) {
            errorResult = e.getMessage() != null ? e.getMessage() : "System error";
            log.error("Failed to execute recurring payment ID={}: {}", rp.getId(), errorResult);

            try {
                RecurringPaymentLog logEntity = RecurringPaymentLog.builder()
                        .recurringPaymentId(rp.getId())
                        .status("FAILED")
                        .message("Execution error: " + errorResult)
                        .executedAt(now)
                        .build();
                recurringPaymentLogRepository.save(logEntity);

                rp.setLastRunAt(now);
                rp.setFailureCount(rp.getFailureCount() + 1);

                if (rp.getFailureCount() >= 5) {
                    rp.setStatus(RecurringStatus.PAUSED);
                    log.warn("Recurring payment ID={} paused due to 5 consecutive failures", rp.getId());
                } else if (rp.getFrequency() != RecurringFrequency.ONCE) {
                    rp.setNextRunAt(calculateNextRun(now, rp.getFrequency()));
                }

                recurringPaymentRepository.save(rp);
            } catch (Exception logErr) {
                log.error("Failed to persist recurring payment log error: {}", logErr.getMessage());
            }

            return errorResult;
        }
    }

    private LocalDateTime calculateNextRun(LocalDateTime base, RecurringFrequency frequency) {
        if (frequency == null) return base.plusDays(1);
        return switch (frequency) {
            case MINUTELY -> base.plusMinutes(1);
            case DAILY -> base.plusDays(1);
            case WEEKLY -> base.plusWeeks(1);
            case MONTHLY -> base.plusMonths(1);
            case ONCE -> base;
        };
    }

    private RecurringPaymentResponse mapToResponse(RecurringPayment rp) {
        String destAccNum = null;
        if (rp.getDestAccountId() != null) {
            destAccNum = accountRepository.findById(rp.getDestAccountId())
                    .map(Account::getAccountNumber)
                    .orElse(null);
        }

        return new RecurringPaymentResponse(
                rp.getId(),
                rp.getUserId(),
                rp.getType(),
                rp.getCategory(),
                rp.getProviderCode(),
                rp.getBillCode(),
                rp.getDestAccountId(),
                destAccNum,
                rp.getAmount(),
                rp.getCurrency(),
                rp.getDescription(),
                rp.getFrequency(),
                rp.getStatus(),
                rp.getStartDate(),
                rp.getNextRunAt(),
                rp.getLastRunAt(),
                rp.getFailureCount(),
                rp.getCreatedAt()
        );
    }
}
