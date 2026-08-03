package com.training.paygate.controller;

import com.training.paygate.common.ApiResponse;
import com.training.paygate.common.PageResponse;
import com.training.paygate.dto.response.PointTransactionResponse;
import com.training.paygate.dto.response.PointsResponse;
import com.training.paygate.entity.User;
import com.training.paygate.exception.ResourceNotFoundException;
import com.training.paygate.repository.PointTransactionRepository;
import com.training.paygate.repository.UserRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;

@RestController
@RequestMapping("/api/v1/rewards")
@RequiredArgsConstructor
@Tag(name = "Rewards", description = "APIs quản lý điểm thưởng và lịch sử tích điểm")
public class RewardController {

    private final PointTransactionRepository pointTransactionRepository;
    private final UserRepository userRepository;

    @GetMapping("/my-points")
    @PreAuthorize("hasRole('USER')")
    @Operation(summary = "Xem tổng điểm thưởng hiện tại của User")
    public ApiResponse<PointsResponse> getMyPoints(Principal principal) {
        User user = userRepository.findByUsername(principal.getName())
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + principal.getName()));

        Integer totalPoints = pointTransactionRepository.getTotalPointsByUserId(user.getId());
        String tier = "BRONZE";
        if (totalPoints >= 500) {
            tier = "GOLD";
        } else if (totalPoints >= 100) {
            tier = "SILVER";
        }

        PointsResponse response = PointsResponse.builder()
                .totalPoints(totalPoints)
                .earnedThisMonth(totalPoints) // simplify for MVP
                .tier(tier)
                .build();

        return ApiResponse.success(response);
    }

    @GetMapping("/history")
    @PreAuthorize("hasRole('USER')")
    @Operation(summary = "Xem lịch sử biến động điểm thưởng")
    public ApiResponse<PageResponse<PointTransactionResponse>> getHistory(
            Principal principal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        User user = userRepository.findByUsername(principal.getName())
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + principal.getName()));

        Pageable pageable = PageRequest.of(page, size);
        Page<PointTransactionResponse> pointPage = pointTransactionRepository.findByUserIdOrderByCreatedAtDesc(user.getId(), pageable)
                .map(pt -> PointTransactionResponse.builder()
                        .id(pt.getId())
                        .points(pt.getPoints())
                        .type(pt.getType())
                        .description(pt.getDescription())
                        .transactionRef(pt.getTransactionRef())
                        .createdAt(pt.getCreatedAt())
                        .build());

        return ApiResponse.success(PageResponse.from(pointPage, pt -> pt));
    }
}
