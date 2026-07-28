package com.training.paygate.controller;

import com.training.paygate.common.ApiResponse;
import com.training.paygate.dto.request.CreateBillSubscriptionRequest;
import com.training.paygate.dto.request.CreateSavedBillRequest;
import com.training.paygate.dto.request.LookupBillRequest;
import com.training.paygate.dto.request.PayBillRequest;
import com.training.paygate.dto.response.BillLookupResponse;
import com.training.paygate.dto.response.BillPayResponse;
import com.training.paygate.dto.response.BillProviderResponse;
import com.training.paygate.dto.response.BillSubscriptionResponse;
import com.training.paygate.dto.response.SavedBillResponse;
import com.training.paygate.enums.BillType;
import com.training.paygate.service.BillService;
import com.training.paygate.service.BillSubscriptionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/v1/bills")
@RequiredArgsConstructor
@Tag(name = "Bills", description = "Bill Payment (Feature 5): providers, lookup, pay, saved bills")
public class BillController {

    private final BillService billService;
    private final BillSubscriptionService billSubscriptionService;

    @GetMapping("/providers")
    @PreAuthorize("hasRole('USER') or hasRole('ADMIN')")
    @Operation(summary = "List active bill providers (optional filter by type)")
    public ApiResponse<List<BillProviderResponse>> providers(@RequestParam(required = false) BillType type) {
        return ApiResponse.success("Providers", billService.getProviders(type));
    }

    @PostMapping("/lookup")
    @PreAuthorize("hasRole('USER') or hasRole('ADMIN')")
    @Operation(summary = "Look up an unpaid bill by provider code + customer code")
    public ApiResponse<BillLookupResponse> lookup(@Valid @RequestBody LookupBillRequest request) {
        return ApiResponse.success("Bill lookup", billService.lookup(request));
    }

    @PostMapping("/pay")
    @PreAuthorize("hasRole('USER') or hasRole('ADMIN')")
    @Operation(summary = "Pay a bill (USER wallet -> provider merchant account)")
    public ApiResponse<BillPayResponse> pay(@Valid @RequestBody PayBillRequest request, Principal principal) {
        return ApiResponse.success("Bill payment successful", billService.pay(request, principal.getName()));
    }

    @GetMapping("/saved")
    @PreAuthorize("hasRole('USER') or hasRole('ADMIN')")
    @Operation(summary = "List saved (frequently used) bills for the current user")
    public ApiResponse<List<SavedBillResponse>> saved(Principal principal) {
        return ApiResponse.success("Saved bills", billService.getSavedBills(principal.getName()));
    }

    @PostMapping("/saved")
    @PreAuthorize("hasRole('USER') or hasRole('ADMIN')")
    @Operation(summary = "Save a frequently used bill (max 10 per user)")
    public ResponseEntity<ApiResponse<SavedBillResponse>> save(
            @Valid @RequestBody CreateSavedBillRequest request,
            Principal principal
    ) {
        SavedBillResponse response = billService.saveBill(request, principal.getName());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Saved bill created", response));
    }

    @PostMapping("/subscriptions")
    @PreAuthorize("hasRole('USER') or hasRole('ADMIN')")
    @Operation(summary = "Register a new bill subscription with a provider (calls provider gateway)")
    public ResponseEntity<ApiResponse<BillSubscriptionResponse>> subscribe(
            @Valid @RequestBody CreateBillSubscriptionRequest request,
            Principal principal
    ) {
        BillSubscriptionResponse response = billSubscriptionService.create(request, principal.getName());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Subscription created", response));
    }

    @GetMapping("/subscriptions")
    @PreAuthorize("hasRole('USER') or hasRole('ADMIN')")
    @Operation(summary = "List my bill subscriptions")
    public ApiResponse<List<BillSubscriptionResponse>> mySubscriptions(Principal principal) {
        return ApiResponse.success("My subscriptions", billSubscriptionService.listMine(principal.getName()));
    }

    @GetMapping("/my-codes")
    @PreAuthorize("hasRole('USER') or hasRole('ADMIN')")
    @Operation(summary = "List my customer codes registered with a given provider")
    public ApiResponse<List<BillSubscriptionResponse>> myCodes(
            @RequestParam String providerCode,
            Principal principal
    ) {
        return ApiResponse.success("My codes",
                billSubscriptionService.listMineByProvider(principal.getName(), providerCode));
    }

    @GetMapping("/subscriptions/{id}/bills")
    @PreAuthorize("hasRole('USER') or hasRole('ADMIN')")
    @Operation(summary = "Get bill history for a specific subscription")
    public ApiResponse<List<BillLookupResponse>> billsForSubscription(
            @PathVariable Long id, Principal principal) {
        return ApiResponse.success("Bills for subscription",
                billSubscriptionService.getBillsForSubscription(id, principal.getName()));
    }

    @PostMapping("/subscriptions/{id}/refresh-bill")
    @PreAuthorize("hasRole('USER') or hasRole('ADMIN')")
    @Operation(summary = "Refresh current bill from provider for a subscription")
    public ApiResponse<BillLookupResponse> refreshBill(
            @PathVariable Long id, Principal principal) {
        return ApiResponse.success("Current bill refreshed",
                billSubscriptionService.refreshCurrentBill(id, principal.getName()));
    }

    @DeleteMapping("/subscriptions/{id}")
    @PreAuthorize("hasRole('USER') or hasRole('ADMIN')")
    @Operation(summary = "Cancel a bill subscription")
    public ApiResponse<Void> cancelSubscription(@PathVariable Long id, Principal principal) {
        billSubscriptionService.cancel(id, principal.getName());
        return ApiResponse.success("Subscription cancelled", null);
    }

}
