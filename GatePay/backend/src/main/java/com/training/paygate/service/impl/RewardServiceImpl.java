package com.training.paygate.service.impl;

import com.training.paygate.dto.response.PointTransactionResponse;
import com.training.paygate.dto.response.PointsResponse;
import com.training.paygate.repository.PointTransactionRepository;
import com.training.paygate.service.RewardService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RewardServiceImpl implements RewardService {

    private final PointTransactionRepository pointTransactionRepository;

    @Override
    public PointsResponse getMyPoints(Long userId) {
        Integer totalPoints = pointTransactionRepository.getTotalPointsByUserId(userId);
        if (totalPoints == null) {
            totalPoints = 0;
        }
        
        String tier = "BRONZE";
        if (totalPoints >= 500) {
            tier = "GOLD";
        } else if (totalPoints >= 100) {
            tier = "SILVER";
        }

        return PointsResponse.builder()
                .totalPoints(totalPoints)
                .earnedThisMonth(totalPoints) // simplify for MVP
                .tier(tier)
                .build();
    }

    @Override
    public Page<PointTransactionResponse> getHistory(Long userId, Pageable pageable) {
        return pointTransactionRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable)
                .map(pt -> PointTransactionResponse.builder()
                        .id(pt.getId())
                        .points(pt.getPoints())
                        .type(pt.getType())
                        .description(pt.getDescription())
                        .transactionRef(pt.getTransactionRef())
                        .createdAt(pt.getCreatedAt())
                        .build());
    }
}
