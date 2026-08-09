package com.training.paygate.service;

import com.training.paygate.dto.response.PointTransactionResponse;
import com.training.paygate.dto.response.PointsResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface RewardService {
    PointsResponse getMyPoints(Long userId);
    Page<PointTransactionResponse> getHistory(Long userId, Pageable pageable);
}
