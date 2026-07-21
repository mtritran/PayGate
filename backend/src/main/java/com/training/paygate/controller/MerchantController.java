package com.training.paygate.controller;

import com.training.paygate.common.ApiResponse;
import com.training.paygate.common.PageResponse;
import com.training.paygate.dto.request.CreateMerchantRequest;
import com.training.paygate.dto.request.UpdateMerchantRequest;
import com.training.paygate.dto.response.MerchantResponse;
import com.training.paygate.service.MerchantService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/merchants")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Merchant Admin API", description = "Quản lý đối tác Merchant dành cho Admin")
public class MerchantController {

    private final MerchantService merchantService;

    @GetMapping
    @Operation(summary = "Lấy danh sách đối tác Merchant phân trang")
    public ApiResponse<PageResponse<MerchantResponse>> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "DESC") String sortDir) {
        Sort sort = Sort.by(Sort.Direction.fromString(sortDir), sortBy);
        var result = merchantService.getAll(PageRequest.of(page, size, sort));
        return ApiResponse.success(PageResponse.from(result, r -> r));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Lấy thông tin Merchant theo ID")
    public ApiResponse<MerchantResponse> getById(@PathVariable Long id) {
        return ApiResponse.success(merchantService.getById(id));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Đăng ký đối tác Merchant mới")
    public ApiResponse<MerchantResponse> create(@Valid @RequestBody CreateMerchantRequest request) {
        return ApiResponse.success("Merchant registered successfully", merchantService.create(request));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Cập nhật thông tin Merchant")
    public ApiResponse<MerchantResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody UpdateMerchantRequest request) {
        return ApiResponse.success("Merchant updated successfully", merchantService.update(id, request));
    }
}
