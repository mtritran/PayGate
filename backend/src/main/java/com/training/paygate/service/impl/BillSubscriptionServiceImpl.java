package com.training.paygate.service.impl;

import com.training.paygate.dto.request.CreateBillSubscriptionRequest;
import com.training.paygate.dto.response.BillSubscriptionResponse;
import com.training.paygate.entity.Bill;
import com.training.paygate.entity.BillProvider;
import com.training.paygate.entity.BillSubscription;
import com.training.paygate.entity.User;
import com.training.paygate.enums.BillStatus;
import com.training.paygate.enums.BillSubscriptionStatus;
import com.training.paygate.exception.BadRequestException;
import com.training.paygate.exception.DuplicateResourceException;
import com.training.paygate.exception.ResourceNotFoundException;
import com.training.paygate.integration.provider.BillProviderClient;
import com.training.paygate.integration.provider.ProviderBillDto;
import com.training.paygate.integration.provider.ProviderCustomerDto;
import com.training.paygate.integration.provider.ProviderRegisterRequest;
import com.training.paygate.repository.BillProviderRepository;
import com.training.paygate.repository.BillRepository;
import com.training.paygate.repository.BillSubscriptionRepository;
import com.training.paygate.repository.UserRepository;
import com.training.paygate.service.BillSubscriptionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class BillSubscriptionServiceImpl implements BillSubscriptionService {

    private final BillSubscriptionRepository subscriptionRepository;
    private final BillProviderRepository billProviderRepository;
    private final BillRepository billRepository;
    private final UserRepository userRepository;
    private final BillProviderClient billProviderClient;

    @Override
    @Transactional
    public BillSubscriptionResponse create(CreateBillSubscriptionRequest request, String currentUsername) {
        User user = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + currentUsername));

        BillProvider provider = billProviderRepository.findByCode(request.providerCode())
                .orElseThrow(() -> new ResourceNotFoundException("Provider not found with code: " + request.providerCode()));

        ProviderCustomerDto registered;
        try {
            registered = billProviderClient.register(new ProviderRegisterRequest(
                    provider.getCode(),
                    request.customerName(),
                    request.address(),
                    request.cycleAmount()
            ));
        } catch (RuntimeException e) {
            log.error("Provider register failed for user {}: {}", currentUsername, e.getMessage());
            throw new BadRequestException("Provider gateway unavailable, please try again later");
        }
        if (registered == null || registered.customerCode() == null) {
            throw new BadRequestException("Provider gateway returned empty response");
        }

        if (subscriptionRepository.existsByUserIdAndProviderIdAndCustomerCode(
                user.getId(), provider.getId(), registered.customerCode())) {
            throw new DuplicateResourceException(
                    "Subscription already exists for provider " + provider.getCode() + " / " + registered.customerCode());
        }

        LocalDateTime now = LocalDateTime.now();
        BillSubscription sub = BillSubscription.builder()
                .userId(user.getId())
                .providerId(provider.getId())
                .customerCode(registered.customerCode())
                .customerName(registered.customerName())
                .address(registered.address())
                .cycleAmount(registered.cycleAmount())
                .frequency(request.frequency())
                .status(BillSubscriptionStatus.ACTIVE)
                .nextBillAt(request.frequency().advance(now))
                .lastBillAt(now)
                .build();
        sub = subscriptionRepository.save(sub);

        ProviderBillDto firstBill = billProviderClient.currentBill(registered.customerCode()).orElse(null);
        if (firstBill != null) {
            Bill bill = Bill.builder()
                    .providerId(provider.getId())
                    .customerCode(firstBill.customerCode())
                    .customerName(firstBill.customerName())
                    .address(firstBill.address())
                    .amount(firstBill.amount())
                    .period(firstBill.period())
                    .status(BillStatus.UNPAID)
                    .build();
            billRepository.save(bill);
            log.info("Subscription #{} created + first bill generated (provider {}, customer {}, amount {})",
                    sub.getId(), provider.getCode(), registered.customerCode(), firstBill.amount());
        } else {
            log.warn("Subscription #{} created but provider did not return a current bill", sub.getId());
        }

        return toResponse(sub, provider);
    }

    @Override
    @Transactional(readOnly = true)
    public List<BillSubscriptionResponse> listMine(String currentUsername) {
        User user = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + currentUsername));
        return subscriptionRepository.findByUserIdOrderByCreatedAtDesc(user.getId()).stream()
                .map(this::toResponseLoadProvider)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<BillSubscriptionResponse> listMineByProvider(String currentUsername, String providerCode) {
        User user = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + currentUsername));
        BillProvider provider = billProviderRepository.findByCode(providerCode)
                .orElseThrow(() -> new ResourceNotFoundException("Provider not found with code: " + providerCode));
        return subscriptionRepository.findByUserIdAndProviderIdAndStatus(
                        user.getId(), provider.getId(), BillSubscriptionStatus.ACTIVE).stream()
                .map(s -> toResponse(s, provider))
                .toList();
    }

    @Override
    @Transactional
    public int runDueSubscriptions() {
        LocalDateTime now = LocalDateTime.now();
        List<BillSubscription> due = subscriptionRepository.findDueSubscriptions(BillSubscriptionStatus.ACTIVE, now);
        int generated = 0;
        for (BillSubscription sub : due) {
            try {
                ProviderBillDto providerBill = billProviderClient.currentBill(sub.getCustomerCode()).orElse(null);
                if (providerBill == null) {
                    log.warn("Subscription #{} due but provider returned no bill (customer {})",
                            sub.getId(), sub.getCustomerCode());
                    sub.setNextBillAt(sub.getFrequency().advance(now));
                    subscriptionRepository.save(sub);
                    continue;
                }
                Bill bill = Bill.builder()
                        .providerId(sub.getProviderId())
                        .customerCode(providerBill.customerCode())
                        .customerName(providerBill.customerName())
                        .address(providerBill.address())
                        .amount(providerBill.amount())
                        .period(providerBill.period())
                        .status(BillStatus.UNPAID)
                        .build();
                billRepository.save(bill);

                sub.setLastBillAt(now);
                sub.setNextBillAt(sub.getFrequency().advance(now));
                subscriptionRepository.save(sub);
                generated++;
                log.info("Subscription #{} generated bill period={} amount={} for customer {}",
                        sub.getId(), providerBill.period(), providerBill.amount(), sub.getCustomerCode());
            } catch (Exception e) {
                log.error("Failed to generate bill for subscription #{}: {}", sub.getId(), e.getMessage());
            }
        }
        return generated;
    }

    @Override
    @Transactional
    public void cancel(Long subscriptionId, String currentUsername) {
        User user = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + currentUsername));
        BillSubscription sub = subscriptionRepository.findById(subscriptionId)
                .orElseThrow(() -> new ResourceNotFoundException("Subscription", subscriptionId));
        if (!sub.getUserId().equals(user.getId())) {
            throw new BadRequestException("Subscription does not belong to current user");
        }
        sub.setStatus(BillSubscriptionStatus.CANCELLED);
        subscriptionRepository.save(sub);
    }

    private BillSubscriptionResponse toResponseLoadProvider(BillSubscription sub) {
        BillProvider p = billProviderRepository.findById(sub.getProviderId()).orElse(null);
        return toResponse(sub, p);
    }

    private BillSubscriptionResponse toResponse(BillSubscription sub, BillProvider provider) {
        return new BillSubscriptionResponse(
                sub.getId(),
                sub.getProviderId(),
                provider != null ? provider.getCode() : null,
                provider != null ? provider.getName() : null,
                provider != null ? provider.getType().name() : null,
                sub.getCustomerCode(),
                sub.getCustomerName(),
                sub.getAddress(),
                sub.getCycleAmount(),
                sub.getFrequency().name(),
                sub.getStatus().name(),
                sub.getNextBillAt(),
                sub.getLastBillAt(),
                sub.getCreatedAt()
        );
    }
}
