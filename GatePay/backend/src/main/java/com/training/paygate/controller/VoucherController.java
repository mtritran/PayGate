package com.training.paygate.controller;

import com.training.paygate.common.ApiResponse;
import com.training.paygate.common.PageResponse;
import com.training.paygate.dto.request.VoucherApplyRequest;
import com.training.paygate.dto.request.VoucherCreateRequest;
import com.training.paygate.dto.request.VoucherRedeemRequest;
import com.training.paygate.dto.response.UserVoucherResponse;
import com.training.paygate.dto.response.VoucherApplyResponse;
import com.training.paygate.dto.response.VoucherResponse;
import com.training.paygate.entity.User;
import com.training.paygate.exception.ResourceNotFoundException;
import com.training.paygate.repository.UserRepository;
import com.training.paygate.service.VoucherService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Tag(name = "Vouchers", description = "APIs quản lý kho voucher và đổi/áp dụng voucher")
public class VoucherController {

    private final VoucherService voucherService;
    private final UserRepository userRepository;

    // --- USER ENDPOINTS ---

    @GetMapping("/vouchers/shop")
    @PreAuthorize("hasRole('USER')")
    @Operation(summary = "Xem danh sách Voucher có thể đổi")
    public ApiResponse<PageResponse<VoucherResponse>> getShopVouchers(Pageable pageable) {
        return ApiResponse.success(PageResponse.from(voucherService.getShopVouchers(pageable), v -> v));
    }

    @PostMapping("/vouchers/redeem")
    @PreAuthorize("hasRole('USER')")
    @Operation(summary = "Đổi điểm thưởng lấy Voucher")
    public ApiResponse<UserVoucherResponse> redeemVoucher(
            Principal principal,
            @Valid @RequestBody VoucherRedeemRequest request
    ) {
        User user = userRepository.findByUsername(principal.getName())
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + principal.getName()));
        return ApiResponse.success("Voucher redeemed successfully", voucherService.redeemVoucher(user.getId(), request));
    }

    @GetMapping("/vouchers/my-vouchers")
    @PreAuthorize("hasRole('USER')")
    @Operation(summary = "Xem danh sách Voucher cá nhân")
    public ApiResponse<List<UserVoucherResponse>> getMyVouchers(Principal principal) {
        User user = userRepository.findByUsername(principal.getName())
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + principal.getName()));
        return ApiResponse.success(voucherService.getMyVouchers(user.getId()));
    }

    @PostMapping("/vouchers/apply")
    @PreAuthorize("hasRole('USER')")
    @Operation(summary = "Kiểm tra và áp dụng Voucher trước khi thanh toán")
    public ApiResponse<VoucherApplyResponse> applyVoucher(
            Principal principal,
            @Valid @RequestBody VoucherApplyRequest request
    ) {
        User user = userRepository.findByUsername(principal.getName())
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + principal.getName()));
        return ApiResponse.success(voucherService.applyVoucher(user.getId(), request));
    }

    // --- ADMIN ENDPOINTS ---

    @PostMapping("/admin/vouchers")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Admin tạo Voucher mới vào hệ thống")
    public ApiResponse<VoucherResponse> createVoucher(@Valid @RequestBody VoucherCreateRequest request) {
        return ApiResponse.success("Voucher created successfully", voucherService.createVoucher(request));
    }

    @GetMapping("/admin/vouchers")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Admin xem tất cả Voucher trong hệ thống")
    public ApiResponse<PageResponse<VoucherResponse>> getAllVouchersForAdmin(Pageable pageable) {
        return ApiResponse.success(PageResponse.from(voucherService.getAllVouchersForAdmin(pageable), v -> v));
    }

    @PutMapping("/admin/vouchers/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Admin cập nhật thông tin Voucher")
    public ApiResponse<VoucherResponse> updateVoucher(
            @PathVariable Long id,
            @Valid @RequestBody VoucherCreateRequest request
    ) {
        return ApiResponse.success(voucherService.updateVoucher(id, request));
    }
}
