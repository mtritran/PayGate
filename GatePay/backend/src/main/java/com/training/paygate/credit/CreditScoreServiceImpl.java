package com.training.paygate.credit;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Optional;

/**
 * CreditScoreServiceImpl — thuật toán chấm điểm tín dụng dài hạn.
 *
 * Thang điểm 0-100, tách riêng khỏi Fraud. Cộng điểm từ các yếu tố "tính cách trả nợ / lịch sử",
 * KHÔNG phải hành vi tức thời của 1 giao dịch:
 *  - thanh toán đúng hạn (onTimePayments)     → + điểm
 *  - trễ/miss (missedPayments)                → − điểm, nặng hơn
 *  - tổng giao dịch (kinh nghiệm)            → + nhẹ (đã có "lý lịch")
 *  - dùng credit/duyệt (usedCredit)          → cân bằng
 *  - fraudScore từ FraudDetection            → 1 đầu vào phụ (hạ uy tín nếu cao)
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CreditScoreServiceImpl implements CreditScoreService {

    private final CreditScoreRepository creditScoreRepository;

    @Override
    @Transactional
    public CreditScore evaluateAndSave(Long userId, String username, CreditInput input) {
        CreditScore evaluated = evaluateOnly(input);
        evaluated.setUserId(userId);
        evaluated.setUsername(username);
        return creditScoreRepository.save(evaluated);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<CreditScore> getLatest(Long userId) {
        return creditScoreRepository.findByUserId(userId);
    }

    @Override
    public CreditScore evaluateOnly(CreditInput input) {
        if (input == null) {
            input = CreditInput.builder().build();
        }
        int score = 0;
        StringBuilder sb = new StringBuilder();

        // --- 1) Kinh nghiệm thanh toán (có "lý lịch") -------------------------
        // Mỗi giao dịch có lịch sử → chứng minh người đáng tin, nhưng bão hòa sau 20 giao dịch.
        long tx = Math.max(0, input.getTotalTransactions());
        int expPoints = (int) Math.min(20, tx);          // tối đa 0-20
        score += expPoints;
        sb.append("Hồ sơ ").append(tx).append(" giao dịch (+").append(expPoints).append("); ");

        // --- 2) Lịch sử trả nợ đúng hạn -------------------------------
        // Mỗi lần trả đúng hạn đều tốt; khuyến khích duy trì, tối đa 30.
        long onTime = Math.max(0, input.getOnTimePayments());
        int onTimePoints = (int) Math.min(30, onTime);
        score += onTimePoints;
        sb.append("Trả đúng hạn ").append(onTime).append(" lần (+").append(onTimePoints).append("); ");

        // --- 3) Trễ hạn / bỏ lỡ (nặng nhất) -----------------------------
        // Mỗi lần miss trừ nhiều hơn cộng của onTime để không incentive lách.
        long missed = Math.max(0, input.getMissedPayments());
        int missedPenalty = (int) Math.min(40, missed * 4L);  // mỗi lần −4, tối đa −40
        score -= missedPenalty;
        sb.append("Missed ").append(missed).append(" (−").append(missedPenalty).append("); ");

        // --- 4) Sức khỏe ví (currentBalance so với usedCredit) ----------
        // Nợ quá cao so với số dư → rủi ro; dùng % thấu chi làm bài chấm.
        BigDecimal used = input.getUsedCredit() != null ? input.getUsedCredit() : BigDecimal.ZERO;
        BigDecimal bal  = input.getCurrentBalance() != null ? input.getCurrentBalance() : BigDecimal.ZERO;
        if (used.compareTo(BigDecimal.ZERO) > 0 && bal.compareTo(BigDecimal.ZERO) >= 0) {
            // utilization = used / (bal + used); mục tiêu thấp
            BigDecimal utilization = used.divide(bal.add(used), 2, java.math.RoundingMode.HALF_UP)
                    .movePointRight(2);  // 0-100 %
            if (utilization.compareTo(new BigDecimal("60")) > 0) {
                int utilPenalty = utilization.compareTo(new BigDecimal("80")) > 0 ? 20 : 10;
                score -= utilPenalty;
                sb.append("Utilization cao ").append(utilization.setScale(0)).append("%/−").append(utilPenalty).append(";");
            } else if (utilization.compareTo(new BigDecimal("30")) <= 0) {
                score += 40;   // nợ thấp so với dòng tiền → rất tốt
                sb.append("Utilization thấp ").append(utilization.setScale(0)).append("% (+40); ");
            } else {
                sb.append("Utilization okay ").append(utilization.setScale(0)).append("%; ");
            }
        }

        // --- 5) Fraud score phụ ---------------------------------
        // Không phải là nguồn chính, nhưng nếu fraud cao → giảm uy tín nhẹ (ngược hướng).
        if (input.getFraudScore() != null) {
            int fs = input.getFraudScore();
            if (fs >= 75) { score -= 15; sb.append("Fraud rất cao (−15); "); }
            else if (fs >= 45) { score -= 8; sb.append("Fraud cao (−8); "); }
        }

        int capped = Math.max(0, Math.min(score, 100));
        String tier = toTier(capped);

        String summary = sb.toString();
        return CreditScore.builder()
                .score(capped)
                .tier(tier)
                .summary(summary)
                .build();
    }

    @Override
    public String toTier(int score) {
        if (score >= 75) return "HIGH";
        if (score >= 55) return "GOOD";
        if (score >= 35) return "FAIR";
        return "POOR";
    }
}