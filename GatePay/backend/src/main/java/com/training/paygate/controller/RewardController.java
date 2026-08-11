package com.training.paygate.controller;

import com.training.paygate.common.ApiResponse;
import com.training.paygate.common.PageResponse;
import com.training.paygate.dto.response.PointTransactionResponse;
import com.training.paygate.dto.response.PointsResponse;
import com.training.paygate.security.CustomUserDetails;
import com.training.paygate.service.RewardService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/rewards")
@RequiredArgsConstructor
@Tag(name = "Rewards", description = "APIs quản lý điểm thưởng và lịch sử tích điểm")
public class RewardController {

    private final RewardService rewardService;

    @GetMapping("/my-points")
    @PreAuthorize("hasRole('USER')")
    @Operation(summary = "Xem tổng điểm thưởng hiện tại của User")
    public ApiResponse<PointsResponse> getMyPoints(@AuthenticationPrincipal CustomUserDetails currentUser) {
        PointsResponse response = rewardService.getMyPoints(currentUser.getId());
        return ApiResponse.success(response);
    }

    @GetMapping("/history")
    @PreAuthorize("hasRole('USER')")
    @Operation(summary = "Xem lịch sử biến động điểm thưởng")
    public ApiResponse<PageResponse<PointTransactionResponse>> getHistory(
            @AuthenticationPrincipal CustomUserDetails currentUser,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        Pageable pageable = PageRequest.of(page, size);
        Page<PointTransactionResponse> pointPage = rewardService.getHistory(currentUser.getId(), pageable);
        return ApiResponse.success(PageResponse.from(pointPage, pt -> pt));
    }
}
