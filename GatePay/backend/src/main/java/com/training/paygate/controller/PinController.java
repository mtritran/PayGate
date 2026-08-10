package com.training.paygate.controller;

import com.training.paygate.common.ApiResponse;
import com.training.paygate.dto.request.PinSetupRequest;
import com.training.paygate.dto.request.PinVerifyRequest;
import com.training.paygate.dto.response.PinStatusResponse;
import com.training.paygate.security.CustomUserDetails;
import com.training.paygate.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/users/pin")
@RequiredArgsConstructor
@Tag(name = "Transaction PIN", description = "APIs thiết lập và xác nhận Mã PIN giao dịch 6 số")
public class PinController {

    private final UserService userService;

    @GetMapping("/status")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Kiểm tra trạng thái thiết lập Mã PIN của người dùng")
    public ApiResponse<PinStatusResponse> getPinStatus(@AuthenticationPrincipal CustomUserDetails currentUser) {
        return ApiResponse.success(userService.getPinStatus(currentUser.getId()));
    }

    @PostMapping("/setup")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Thiết lập hoặc đổi Mã PIN giao dịch 6 số")
    public ApiResponse<Void> setupPin(
            @AuthenticationPrincipal CustomUserDetails currentUser,
            @Valid @RequestBody PinSetupRequest request
    ) {
        userService.setupPin(currentUser.getId(), request);
        return ApiResponse.success("Mã PIN giao dịch đã được cập nhật thành công!", null);
    }

    @PostMapping("/verify")
    @PreAuthorize("isAuthenticated()")
    @com.training.paygate.annotation.RateLimit(limit = 5, windowSeconds = 60, key = "pin_verify")
    @Operation(summary = "Xác thực Mã PIN giao dịch 6 số")
    public ApiResponse<Boolean> verifyPin(
            @AuthenticationPrincipal CustomUserDetails currentUser,
            @Valid @RequestBody PinVerifyRequest request
    ) {
        boolean isValid = userService.verifyPin(currentUser.getId(), request.pin());
        if (!isValid) {
            return ApiResponse.error("Mã PIN giao dịch không chính xác");
        }
        return ApiResponse.success("Mã PIN chính xác", true);
    }
}
