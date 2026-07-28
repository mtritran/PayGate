package com.training.providermock.controller;

import com.training.providermock.dto.BillResponse;
import com.training.providermock.dto.CustomerResponse;
import com.training.providermock.dto.ProviderInfoResponse;
import com.training.providermock.dto.RegisterCustomerRequest;
import com.training.providermock.model.CustomerRecord;
import com.training.providermock.service.CustomerService;
import com.training.providermock.service.CustomerService.BillSnapshot;
import com.training.providermock.service.ProviderRegistry;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * Mock provider gateway API. This service represents the "outside world"
 * from PayGate's perspective — EVN/SAWACO/VNPT publish an HTTP contract,
 * PayGate is a client. When we swap this to a real production endpoint,
 * only the base URL changes.
 */
@RestController
@RequestMapping("/provider-api/v1")
@RequiredArgsConstructor
@Tag(name = "Provider Gateway (Mock)", description = "Simulates the utility company API surface (EVN/SAWACO/VNPT/FPT)")
public class ProviderApiController {

    private static final DateTimeFormatter TS = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    private final ProviderRegistry registry;
    private final CustomerService customers;

    @GetMapping("/providers")
    @Operation(summary = "List providers exposed by this gateway")
    public List<ProviderInfoResponse> providers() {
        return registry.all().stream()
                .map(p -> new ProviderInfoResponse(p.code(), p.name(), p.type().name(), p.country(), p.hotline()))
                .toList();
    }

    @PostMapping("/customers/register")
    @Operation(summary = "Register a new customer with a provider — returns the provider-assigned customerCode")
    public ResponseEntity<CustomerResponse> register(@Valid @RequestBody RegisterCustomerRequest req) {
        CustomerRecord rec = customers.register(req);
        return ResponseEntity.status(HttpStatus.CREATED).body(toResponse(rec));
    }

    @GetMapping("/customers")
    @Operation(summary = "List customers registered with a provider (for demo / admin views)")
    public List<CustomerResponse> byProvider(@RequestParam String providerCode) {
        return customers.listByProvider(providerCode).stream()
                .map(this::toResponse)
                .toList();
    }

    @GetMapping("/customers/{customerCode}")
    @Operation(summary = "Look up a registered customer by their provider-assigned code")
    public ResponseEntity<CustomerResponse> getCustomer(@PathVariable String customerCode) {
        return customers.find(customerCode)
                .map(rec -> ResponseEntity.ok(toResponse(rec)))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping("/customers/{customerCode}/current-bill")
    @Operation(summary = "Ask the provider to publish the current-period bill for a customer")
    public ResponseEntity<BillResponse> currentBill(@PathVariable String customerCode) {
        try {
            BillSnapshot snap = customers.generateCurrentBill(customerCode);
            return ResponseEntity.ok(new BillResponse(
                    snap.customer().getCustomerCode(),
                    snap.customer().getCustomerName(),
                    snap.customer().getAddress(),
                    snap.customer().getProviderCode(),
                    snap.customer().getType().name(),
                    snap.period(),
                    snap.amount(),
                    false
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/health")
    public String health() { return "ok"; }

    private CustomerResponse toResponse(CustomerRecord rec) {
        return new CustomerResponse(
                rec.getCustomerCode(),
                rec.getCustomerName(),
                rec.getAddress(),
                rec.getProviderCode(),
                rec.getType().name(),
                rec.getCycleAmount(),
                rec.getRegisteredAt().format(TS)
        );
    }
}
