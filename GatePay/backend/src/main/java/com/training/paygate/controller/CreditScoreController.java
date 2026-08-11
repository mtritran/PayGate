package com.training.paygate.controller;

import com.training.paygate.common.ApiResponse;
import com.training.paygate.credit.CreditInput;
import com.training.paygate.credit.CreditScore;
import com.training.paygate.credit.CreditScoreService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Optional;

/**
 * Credit Score API — đánh giá tín nhiệm dài hạn (kiểu CIC), tách khỏi Fraud.
 * ADMIN mới được xem/chấm; giữ dữ liệu nhạy cảm an toàn.
 */
@RestController
@RequestMapping("/api/v1/credit")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Credit Score", description = "Đánh giá tín nhiệm khách hàng (khác Fraud — hồ sơ dài hạn)")
public class CreditScoreController {

    private final CreditScoreService creditScoreService;

    @PostMapping("/evaluate")
    @Operation(summary = "Chấm điểm tín dụng từ CreditInput và lưu xuống DB")
    public ApiResponse<CreditScore> evaluate(
            @RequestBody CreditScoreRequest request) {
        CreditScore saved = creditScoreService.evaluateAndSave(
                request.getUserId(),
                request.getUsername(),
                request.getInput());
        return ApiResponse.success("Đánh giá tín dụng hoàn tất", saved);
    }

    @GetMapping("/{userId}")
    @Operation(summary = "Lấy điểm tín dụng mới nhất của khách")
    public ApiResponse<?> getLatest(@PathVariable Long userId) {
        Optional<CreditScore> latest = creditScoreService.getLatest(userId);
        return latest.<ApiResponse<?>>map(ApiResponse::success)
                .orElseGet(() -> ApiResponse.error("Chưa có dữ liệu điểm tín dụng cho user " + userId));
    }

    /** Request body nhẹ, chứa identity + CreditInput. */
    public static class CreditScoreRequest {
        private Long userId;
        private String username;
        private CreditInput input;
        public Long getUserId() { return userId; }
        public void setUserId(Long userId) { this.userId = userId; }
        public String getUsername() { return username; }
        public void setUsername(String username) { this.username = username; }
        public CreditInput getInput() { return input; }
        public void setInput(CreditInput input) { this.input = input; }
    }
}