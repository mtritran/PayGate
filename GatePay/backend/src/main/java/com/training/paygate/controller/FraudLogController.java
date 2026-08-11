package com.training.paygate.controller;

import com.training.paygate.common.ApiResponse;
import com.training.paygate.entity.FraudLog;
import com.training.paygate.service.FraudLogService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/fraud-logs")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Admin Fraud Logs", description = "Endpoints for Risk Audit & Security Monitoring Console")
public class FraudLogController {

    private final FraudLogService fraudLogService;

    @GetMapping("/recent")
    @Operation(summary = "Get recent fraud alert logs for Admin Dashboard")
    public ApiResponse<List<FraudLog>> getRecentFraudLogs() {
        return ApiResponse.success(fraudLogService.getRecentFraudLogs());
    }

    @GetMapping
    @Operation(summary = "Get paginated fraud logs with optional filtering")
    public ApiResponse<Page<FraudLog>> getFraudLogs(
            @RequestParam(required = false) String riskLevel,
            @RequestParam(required = false) String username,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "15") int size) {
        
        return ApiResponse.success(fraudLogService.getFraudLogs(riskLevel, username, page, size));
    }
}
