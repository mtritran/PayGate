package com.training.paygate.controller;

import com.training.paygate.common.ApiResponse;
import com.training.paygate.dto.request.PinSetupRequest;
import com.training.paygate.dto.request.PinVerifyRequest;
import com.training.paygate.dto.response.PinStatusResponse;
import com.training.paygate.entity.User;
import com.training.paygate.exception.ResourceNotFoundException;
import com.training.paygate.repository.UserRepository;
import com.training.paygate.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;

@RestController
@RequestMapping("/api/v1/users/pin")
@RequiredArgsConstructor
@Tag(name = "Transaction PIN", description = "APIs thiết lập và xác nhận Mã PIN giao dịch 6 số")
public class PinController {

    private final UserService userService;
    private final UserRepository userRepository;

    @GetMapping("/status")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Kiểm tra trạng thái thiết lập Mã PIN của người dùng")
    public ApiResponse<PinStatusResponse> getPinStatus(Principal principal) {
        User user = userRepository.findByUsername(principal.getName())
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + principal.getName()));
        return ApiResponse.success(userService.getPinStatus(user.getId()));
    }

    @PostMapping("/setup")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Thiết lập hoặc đổi Mã PIN giao dịch 6 số")
    public ApiResponse<Void> setupPin(
            Principal principal,
            @Valid @RequestBody PinSetupRequest request
    ) {
        User user = userRepository.findByUsername(principal.getName())
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + principal.getName()));
        userService.setupPin(user.getId(), request);
        return ApiResponse.success("Mã PIN giao dịch đã được cập nhật thành công!", null);
    }

    @PostMapping("/verify")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Xác thực Mã PIN giao dịch 6 số")
    public ApiResponse<Boolean> verifyPin(
            Principal principal,
            @Valid @RequestBody PinVerifyRequest request
    ) {
        User user = userRepository.findByUsername(principal.getName())
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + principal.getName()));
        boolean isValid = userService.verifyPin(user.getId(), request.pin());
        if (!isValid) {
            return ApiResponse.error("Mã PIN giao dịch không chính xác");
        }
        return ApiResponse.success("Mã PIN chính xác", true);
    }
}
