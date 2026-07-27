package com.training.paygate.service.impl;

import com.training.paygate.dto.request.CreateBillSubscriptionRequest;
import com.training.paygate.dto.response.BillLookupResponse;
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

        ProviderCustomerDto customerDto;

        boolean isLinkExisting = request.customerCode() != null && !request.customerCode().isBlank();

        if (isLinkExisting) {
            // LINK_EXISTING mode: verify the customerCode exists in provider gateway
            customerDto = billProviderClient.findCustomer(request.customerCode())
                    .orElseThrow(() -> new BadRequestException(
                            "Customer code '" + request.customerCode() + "' not found in provider " + request.providerCode() +
                            ". Please check your code or register a new account."));
        } else {
            // REGISTER_NEW mode: create a new customer in provider gateway
            if (request.customerName() == null || request.customerName().isBlank()) {
                throw new BadRequestException("customerName is required when registering a new account");
            }
            if (request.address() == null || request.address().isBlank()) {
                throw new BadRequestException("address is required when registering a new account");
            }
            if (request.cycleAmount() == null) {
                throw new BadRequestException("cycleAmount is required when registering a new account");
            }
            try {
                customerDto = billProviderClient.register(new ProviderRegisterRequest(
                        provider.getCode(),
                        request.customerName(),
                        request.address(),
                        request.cycleAmount()
                ));
            } catch (RuntimeException e) {
                log.error("Provider register failed for user {}: {}", currentUsername, e.getMessage());
                throw new BadRequestException("Provider gateway unavailable, please try again later");
            }
            if (customerDto == null || customerDto.customerCode() == null) {
                throw new BadRequestException("Provider gateway returned empty response");
            }
        }

        // Check for duplicate subscription
        if (subscriptionRepository.existsByUserIdAndProviderIdAndCustomerCode(
                user.getId(), provider.getId(), customerDto.customerCode())) {
            throw new DuplicateResourceException(
                    "You already have a linked account for provider " + provider.getCode() +
                    " with code " + customerDto.customerCode());
        }

        LocalDateTime now = LocalDateTime.now();
        BillSubscription sub = BillSubscription.builder()
                .userId(user.getId())
                .providerId(provider.getId())
                .customerCode(customerDto.customerCode())
                .customerName(customerDto.customerName())
                .address(customerDto.address())
                .cycleAmount(customerDto.cycleAmount())
                .frequency(request.frequency())
                .status(BillSubscriptionStatus.ACTIVE)
                .nextBillAt(request.frequency().advance(now))
                .lastBillAt(now)
                .build();
        sub = subscriptionRepository.save(sub);

        // Immediately fetch the current bill from provider
        ProviderBillDto firstBill = billProviderClient.currentBill(customerDto.customerCode()).orElse(null);
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
            log.info("Subscription #{} created ({}) + first bill fetched (provider={}, customer={}, amount={})",
                    sub.getId(), isLinkExisting ? "LINK_EXISTING" : "REGISTER_NEW",
                    provider.getCode(), customerDto.customerCode(), firstBill.amount());
        } else {
            log.warn("Subscription #{} created but provider returned no current bill", sub.getId());
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
    @Transactional(readOnly = true)
    public List<BillLookupResponse> getBillsForSubscription(Long subscriptionId, String currentUsername) {
        User user = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + currentUsername));
        BillSubscription sub = subscriptionRepository.findById(subscriptionId)
                .orElseThrow(() -> new ResourceNotFoundException("Subscription", subscriptionId));
        if (!sub.getUserId().equals(user.getId())) {
            throw new BadRequestException("Subscription does not belong to current user");
        }
        BillProvider provider = billProviderRepository.findById(sub.getProviderId())
                .orElseThrow(() -> new ResourceNotFoundException("BillProvider", sub.getProviderId()));

        return billRepository.findByProviderIdAndCustomerCodeOrderByCreatedAtDesc(
                        sub.getProviderId(), sub.getCustomerCode()).stream()
                .map(b -> toBillLookupResponse(b, provider))
                .toList();
    }

    @Override
    @Transactional
    public BillLookupResponse refreshCurrentBill(Long subscriptionId, String currentUsername) {
        User user = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + currentUsername));
        BillSubscription sub = subscriptionRepository.findById(subscriptionId)
                .orElseThrow(() -> new ResourceNotFoundException("Subscription", subscriptionId));
        if (!sub.getUserId().equals(user.getId())) {
            throw new BadRequestException("Subscription does not belong to current user");
        }
        BillProvider provider = billProviderRepository.findById(sub.getProviderId())
                .orElseThrow(() -> new ResourceNotFoundException("BillProvider", sub.getProviderId()));

        ProviderBillDto providerBill = billProviderClient.currentBill(sub.getCustomerCode())
                .orElseThrow(() -> new BadRequestException("Provider returned no current bill for customer " + sub.getCustomerCode()));

        // Upsert: check if this period's bill already exists
        Bill bill = billRepository.findFirstByProviderIdAndCustomerCodeAndStatusOrderByIdDesc(
                        sub.getProviderId(), sub.getCustomerCode(), BillStatus.UNPAID)
                .filter(b -> b.getPeriod().equals(providerBill.period()))
                .orElseGet(() -> {
                    Bill newBill = Bill.builder()
                            .providerId(provider.getId())
                            .customerCode(providerBill.customerCode())
                            .customerName(providerBill.customerName())
                            .address(providerBill.address())
                            .amount(providerBill.amount())
                            .period(providerBill.period())
                            .status(BillStatus.UNPAID)
                            .build();
                    return billRepository.save(newBill);
                });

        return toBillLookupResponse(bill, provider);
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

    private BillLookupResponse toBillLookupResponse(Bill b, BillProvider provider) {
        return new BillLookupResponse(
                b.getId(),
                provider.getCode(),
                provider.getName(),
                b.getCustomerCode(),
                b.getCustomerName(),
                b.getAddress(),
                b.getPeriod(),
                b.getAmount(),
                b.getStatus().name()
        );
    }
}
