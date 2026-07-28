package com.training.providermock.service;

import com.training.providermock.dto.RegisterCustomerRequest;
import com.training.providermock.model.CustomerRecord;
import com.training.providermock.model.ProviderInfo;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

@Service
@RequiredArgsConstructor
public class CustomerService {

    private static final DateTimeFormatter PERIOD = DateTimeFormatter.ofPattern("MM/yyyy");

    private final ProviderRegistry registry;
    private final Map<String, CustomerRecord> customers = new ConcurrentHashMap<>();
    private final Map<String, AtomicLong> providerSeqs = new ConcurrentHashMap<>();

    public CustomerRecord register(RegisterCustomerRequest req) {
        ProviderInfo provider = registry.find(req.providerCode())
                .orElseThrow(() -> new IllegalArgumentException("Unknown provider: " + req.providerCode()));

        String customerCode = generateCustomerCode(provider);
        CustomerRecord rec = new CustomerRecord(
                customerCode,
                req.customerName(),
                req.address(),
                provider.code(),
                provider.type(),
                req.cycleAmount(),
                LocalDateTime.now()
        );
        customers.put(customerCode, rec);
        return rec;
    }

    private String generateCustomerCode(ProviderInfo provider) {
        AtomicLong seq = providerSeqs.computeIfAbsent(provider.code(), k -> new AtomicLong(100000));
        long n = seq.incrementAndGet();
        return provider.customerCodePrefix() + n;
    }

    public Optional<CustomerRecord> find(String customerCode) {
        if (customerCode == null) return Optional.empty();
        return Optional.ofNullable(customers.get(customerCode));
    }

    public List<CustomerRecord> listByProvider(String providerCode) {
        if (providerCode == null) return List.of();
        return customers.values().stream()
                .filter(c -> c.getProviderCode().equalsIgnoreCase(providerCode))
                .toList();
    }

    /**
     * Sinh mot bill cho ky hien tai (theo cycleAmount cua khach hang, +/- 5% de trong nhu that).
     * Neu ky da sinh roi thi tra ve so tien cu; khong ghi lai.
     */
    public BillSnapshot generateCurrentBill(String customerCode) {
        CustomerRecord rec = find(customerCode)
                .orElseThrow(() -> new IllegalArgumentException("Unknown customer: " + customerCode));

        String period = LocalDateTime.now().format(PERIOD);
        BigDecimal amount = jitter(rec.getCycleAmount());
        rec.setLastBillPeriod(period);
        return new BillSnapshot(rec, period, amount);
    }

    private BigDecimal jitter(BigDecimal base) {
        double factor = 0.95 + Math.random() * 0.10;
        return base.multiply(BigDecimal.valueOf(factor)).setScale(0, java.math.RoundingMode.HALF_UP);
    }

    public record BillSnapshot(CustomerRecord customer, String period, BigDecimal amount) {}
}
