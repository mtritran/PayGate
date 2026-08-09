package com.training.paygate.controller;

import com.training.paygate.common.ApiResponse;
import com.training.paygate.dto.request.BnplBorrowerProfileRequest;
import com.training.paygate.dto.response.BnplProfileResponse;
import com.training.paygate.service.BnplProfileService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;

@RestController
@RequestMapping("/api/v1/bnpl-profile")
@RequiredArgsConstructor
public class BnplProfileController {

    private final BnplProfileService bnplProfileService;

    @GetMapping("/me")
    public ApiResponse<BnplProfileResponse> getMyProfile(Principal principal) {
        return ApiResponse.success(bnplProfileService.getProfile(principal.getName()));
    }

    @PostMapping("/me")
    public ApiResponse<BnplProfileResponse> updateMyProfile(
            Principal principal,
            @Valid @RequestBody BnplBorrowerProfileRequest request) {
        return ApiResponse.success("Profile updated successfully", bnplProfileService.updateProfile(principal.getName(), request));
    }

    @PostMapping("/me/assess")
    public ApiResponse<BnplProfileResponse> assessCredit(Principal principal) {
        return ApiResponse.success("Credit assessed successfully", bnplProfileService.assessCredit(principal.getName()));
    }
}
