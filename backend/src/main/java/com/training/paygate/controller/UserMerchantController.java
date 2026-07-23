package com.training.paygate.controller;

import com.training.paygate.common.ApiResponse;
import com.training.paygate.dto.request.UserMerchantRequest;
import com.training.paygate.dto.response.MerchantResponse;
import com.training.paygate.repository.UserRepository;
import com.training.paygate.service.MerchantService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/v1/merchants")
@RequiredArgsConstructor
@Tag(name = "User Merchant Self-Service", description = "APIs for users to request merchant registration and view active merchants")
public class UserMerchantController {

    private final MerchantService merchantService;
    private final UserRepository userRepository;

    @PostMapping("/request")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Request merchant registration", description = "Submits a merchant registration request for the currently authenticated user.")
    public ApiResponse<MerchantResponse> requestMerchant(@Valid @RequestBody UserMerchantRequest request, Principal principal) {
        Long userId = userRepository.findByUsername(principal.getName())
                .orElseThrow(() -> new RuntimeException("User not found"))
                .getId();
        return ApiResponse.success("Merchant request submitted successfully. Pending admin approval.", merchantService.requestMerchant(userId, request));
    }

    @GetMapping("/me")
    @Operation(summary = "Get current user's merchant profile", description = "Retrieves merchant request status for the currently authenticated user.")
    public ApiResponse<MerchantResponse> getMyMerchant(Principal principal) {
        Long userId = userRepository.findByUsername(principal.getName())
                .orElseThrow(() -> new RuntimeException("User not found"))
                .getId();
        return ApiResponse.success(merchantService.getByUserId(userId));
    }

    @GetMapping("/active")
    @Operation(summary = "Get list of active merchants", description = "Retrieves active merchants for checkout / payment dropdown selector.")
    public ApiResponse<List<MerchantResponse>> getActiveMerchants() {
        var page = merchantService.getAll(PageRequest.of(0, 100));
        var activeList = page.getContent().stream().filter(m -> m.active()).toList();
        return ApiResponse.success(activeList);
    }
}
