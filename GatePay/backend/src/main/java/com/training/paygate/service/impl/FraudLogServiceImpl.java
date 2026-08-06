package com.training.paygate.service.impl;

import com.training.paygate.entity.FraudLog;
import com.training.paygate.repository.FraudLogRepository;
import com.training.paygate.service.FraudLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class FraudLogServiceImpl implements FraudLogService {

    private final FraudLogRepository fraudLogRepository;

    @Override
    public List<FraudLog> getRecentFraudLogs() {
        return fraudLogRepository.findTop20ByOrderByCreatedAtDesc();
    }

    @Override
    public Page<FraudLog> getFraudLogs(String riskLevel, String username, int page, int size) {
        PageRequest pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());

        if (riskLevel != null && !riskLevel.trim().isEmpty()) {
            return fraudLogRepository.findByRiskLevel(riskLevel.trim(), pageable);
        }
        if (username != null && !username.trim().isEmpty()) {
            return fraudLogRepository.findByUsernameContainingIgnoreCase(username.trim(), pageable);
        }

        return fraudLogRepository.findAll(pageable);
    }
}
