package com.training.paygate.controller;

import com.training.paygate.common.ApiResponse;
import com.training.paygate.dto.request.CreateRecurringPaymentRequest;
import com.training.paygate.dto.request.UpdateRecurringPaymentStatusRequest;
import com.training.paygate.dto.response.RecurringPaymentLogResponse;
import com.training.paygate.dto.response.RecurringPaymentResponse;
import com.training.paygate.service.RecurringPaymentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/v1/recurring-payments")
@RequiredArgsConstructor
@Tag(name = "Recurring Payments & Bill Management", description = "Endpoints for scheduled transfers and automatic bill payments")
public class RecurringPaymentController {

    private final RecurringPaymentService recurringPaymentService;

    @PostMapping
    @Operation(summary = "Create a recurring payment or scheduled bill payment")
    public ResponseEntity<ApiResponse<RecurringPaymentResponse>> create(
            @Valid @RequestBody CreateRecurringPaymentRequest request,
            Principal principal) {
        RecurringPaymentResponse response = recurringPaymentService.create(request, principal.getName());
        return ResponseEntity.ok(ApiResponse.success("Created scheduled payment successfully", response));
    }

    @GetMapping
    @Operation(summary = "Get user's recurring payments list")
    public ResponseEntity<ApiResponse<List<RecurringPaymentResponse>>> getMyPayments(Principal principal) {
        List<RecurringPaymentResponse> list = recurringPaymentService.getMyRecurringPayments(principal.getName());
        return ResponseEntity.ok(ApiResponse.success("Fetched recurring payments successfully", list));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get recurring payment schedule detail")
    public ResponseEntity<ApiResponse<RecurringPaymentResponse>> getById(
            @PathVariable Long id,
            Principal principal) {
        RecurringPaymentResponse response = recurringPaymentService.getById(id, principal.getName());
        return ResponseEntity.ok(ApiResponse.success("Fetched schedule detail successfully", response));
    }

    @PatchMapping("/{id}/status")
    @Operation(summary = "Pause, resume, or cancel a recurring payment schedule")
    public ResponseEntity<ApiResponse<RecurringPaymentResponse>> updateStatus(
            @PathVariable Long id,
            @Valid @RequestBody UpdateRecurringPaymentStatusRequest request,
            Principal principal) {
        RecurringPaymentResponse response = recurringPaymentService.updateStatus(id, request, principal.getName());
        return ResponseEntity.ok(ApiResponse.success("Updated schedule status successfully", response));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a recurring payment schedule")
    public ResponseEntity<ApiResponse<Void>> delete(
            @PathVariable Long id,
            Principal principal) {
        recurringPaymentService.delete(id, principal.getName());
        return ResponseEntity.ok(ApiResponse.success("Deleted recurring payment schedule successfully", null));
    }

    @GetMapping("/{id}/logs")
    @Operation(summary = "Get execution logs for a recurring payment schedule")
    public ResponseEntity<ApiResponse<List<RecurringPaymentLogResponse>>> getLogs(
            @PathVariable Long id,
            Principal principal) {
        List<RecurringPaymentLogResponse> logs = recurringPaymentService.getLogs(id, principal.getName());
        return ResponseEntity.ok(ApiResponse.success("Fetched execution logs successfully", logs));
    }

    @PostMapping("/{id}/execute-now")
    @Operation(summary = "Manually trigger immediate execution of a recurring payment schedule")
    public ResponseEntity<ApiResponse<RecurringPaymentResponse>> executeNow(
            @PathVariable Long id,
            Principal principal) {
        RecurringPaymentResponse response = recurringPaymentService.executeNow(id, principal.getName());
        return ResponseEntity.ok(ApiResponse.success("Triggered payment execution successfully", response));
    }
}
