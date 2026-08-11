package com.training.paygate.service;

import com.training.paygate.entity.FraudLog;
import org.springframework.data.domain.Page;

import java.util.List;

public interface FraudLogService {
    List<FraudLog> getRecentFraudLogs();
    Page<FraudLog> getFraudLogs(String riskLevel, String username, int page, int size);
}
