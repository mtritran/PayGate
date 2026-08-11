package com.training.paygate.controller;

import com.training.paygate.common.ApiResponse;
import com.training.paygate.dto.request.OtpRequest;
import com.training.paygate.dto.response.OtpResponse;
import com.training.paygate.service.OtpService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;

@RestController
@RequestMapping("/api/v1/auth/otp")
@RequiredArgsConstructor
@Tag(name = "OTP Verification", description = "APIs gửi và xác thực Mã OTP 6 chữ số qua Gmail người dùng")
public class OtpController {

    private final OtpService otpService;

    @PostMapping("/send")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Yêu cầu gửi Mã OTP 6 chữ số về Email (Gmail) của User")
    public ApiResponse<OtpResponse> sendOtp(
            Principal principal,
            @RequestBody(required = false) OtpRequest request
    ) {
        String action = (request != null && request.getAction() != null) ? request.getAction() : "Xác thực giao dịch";
        OtpResponse response = otpService.sendOtp(principal.getName(), action);
        return ApiResponse.success("Đã gửi mã OTP thành công", response);
    }

    @PostMapping("/verify")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Xác thực Mã OTP 6 chữ số người dùng nhập vào")
    public ApiResponse<Boolean> verifyOtp(
            Principal principal,
            @RequestBody OtpRequest request
    ) {
        String action = (request.getAction() != null) ? request.getAction() : "Xác thực giao dịch";
        boolean verified = otpService.verifyOtp(principal.getName(), action, request.getOtpCode());
        return ApiResponse.success("Xác thực OTP thành công", verified);
    }
}
