package com.training.paygate.controller;

import com.training.paygate.common.ApiResponse;
import com.training.paygate.dto.request.CreateBeneficiaryRequest;
import com.training.paygate.dto.response.BeneficiaryResponse;
import com.training.paygate.service.BeneficiaryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/v1/beneficiaries")
@RequiredArgsConstructor
@Tag(name = "Saved Beneficiaries", description = "Endpoints for managing saved transfer contacts / beneficiaries")
public class BeneficiaryController {

    private final BeneficiaryService beneficiaryService;

    @GetMapping
    @Operation(summary = "Get current user's saved beneficiaries list")
    public ResponseEntity<ApiResponse<List<BeneficiaryResponse>>> getMyBeneficiaries(Principal principal) {
        List<BeneficiaryResponse> list = beneficiaryService.getMyBeneficiaries(principal.getName());
        return ResponseEntity.ok(ApiResponse.success("Fetched beneficiaries successfully", list));
    }

    @PostMapping
    @Operation(summary = "Save a new beneficiary contact")
    public ResponseEntity<ApiResponse<BeneficiaryResponse>> create(
            @Valid @RequestBody CreateBeneficiaryRequest request,
            Principal principal) {
        BeneficiaryResponse response = beneficiaryService.create(request, principal.getName());
        return ResponseEntity.ok(ApiResponse.success("Saved beneficiary successfully", response));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a saved beneficiary contact")
    public ResponseEntity<ApiResponse<Void>> delete(
            @PathVariable Long id,
            Principal principal) {
        beneficiaryService.delete(id, principal.getName());
        return ResponseEntity.ok(ApiResponse.success("Deleted beneficiary contact successfully", null));
    }
}
