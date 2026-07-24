package com.training.paygate.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.training.paygate.dto.request.AiChatRequest;
import com.training.paygate.dto.response.AiChatResponse;
import com.training.paygate.entity.Account;
import com.training.paygate.entity.LinkedBank;
import com.training.paygate.entity.RecurringPayment;
import com.training.paygate.entity.Transaction;
import com.training.paygate.enums.OwnerType;
import com.training.paygate.enums.TransactionStatus;
import com.training.paygate.enums.TransactionType;
import com.training.paygate.repository.*;
import com.training.paygate.service.AiService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@Slf4j
@RequiredArgsConstructor
public class AiServiceImpl implements AiService {

    @Value("${openrouter.api-key:}")
    private String apiKey;

    @Value("${openrouter.model:nvidia/nemotron-3-ultra-550b-a55b:free}")
    private String model;

    @Value("${openrouter.api-url:https://openrouter.ai/api/v1/chat/completions}")
    private String apiUrl;

    private final AccountRepository accountRepository;
    private final TransactionRepository transactionRepository;
    private final UserRepository userRepository;
    private final LinkedBankRepository linkedBankRepository;
    private final RecurringPaymentRepository recurringPaymentRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    private static final DateTimeFormatter VN_DATE_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    @Override
    public AiChatResponse processChat(AiChatRequest request, String username) {
        String prompt = request.getPrompt();
        log.info("Processing AI Chat prompt via OpenRouter model={} for user={}", model, username);

        String financialContext = "";
        try {
            financialContext = buildFinancialContext(username);
        } catch (Exception e) {
            log.warn("Failed to build financial context for user={}: {}", username, e.getMessage());
        }
        String replyText = callOpenRouterApi(prompt, financialContext);

        Long suggestedAmount = extractAmount(prompt);
        String suggestedRecipient = extractRecipient(prompt);
        String action = detectAction(prompt);

        return AiChatResponse.builder()
                .reply(replyText)
                .modelUsed(model)
                .suggestedAmount(suggestedAmount)
                .suggestedRecipient(suggestedRecipient)
                .action(action)
                .build();
    }

    /**
     * Detect user intent to determine which action button to show on frontend.
     */
    private String detectAction(String prompt) {
        if (prompt == null) return null;
        String lower = prompt.toLowerCase();
        if (lower.matches(".*(hóa đơn|hoa don|điện|nước|internet|định kỳ|dinh ky|tự động|tu dong|đặt lịch|dat lich).*")) return "RECURRING";
        if (lower.matches(".*(nạp|nap|top.?up|recharge|deposit|vietqr|nap tien).*")) return "TOPUP";
        if (lower.matches(".*(chuyển|chuyen|transfer|gửi tiền|gui tien|thanh toán|thanh toan|pay|send).*")) return "TRANSFER";
        return null;
    }

    /**
     * Build deep financial & system context for the logged in user.
     */
    private String buildFinancialContext(String username) {
        if (username == null) return "";

        try {
            Optional<com.training.paygate.entity.User> userOpt = userRepository.findByUsername(username);
            if (userOpt.isEmpty()) {
                List<com.training.paygate.entity.User> users = userRepository.findAllByUsernameIgnoreCase(username);
                if (!users.isEmpty()) {
                    userOpt = Optional.of(users.get(0));
                }
            }
            if (userOpt.isEmpty()) {
                log.warn("User not found by username={}", username);
                return "";
            }

            Long userId = userOpt.get().getId();
            String fullName = userOpt.get().getFullName();
            String email = userOpt.get().getEmail();
            String role = userOpt.get().getRole().name();

            Optional<Account> accountOpt = accountRepository.findByOwnerIdAndOwnerType(userId, OwnerType.USER);
            if (accountOpt.isEmpty()) return "";

            Account account = accountOpt.get();
            Long accountId = account.getId();

            // 1. Fetch recent transactions
            List<Transaction> transactions = transactionRepository
                    .findAllWithFiltersAndOwner(accountId, null, null, null, null, null,
                            PageRequest.of(0, 20, Sort.by(Sort.Direction.DESC, "createdAt")))
                    .getContent();

            // Stats
            BigDecimal totalSent = transactions.stream()
                    .filter(t -> t.getSourceAccountId().equals(accountId)
                            && t.getStatus() == TransactionStatus.COMPLETED
                            && t.getType() != TransactionType.TOPUP)
                    .map(Transaction::getAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            BigDecimal totalReceived = transactions.stream()
                    .filter(t -> t.getDestAccountId().equals(accountId)
                            && t.getStatus() == TransactionStatus.COMPLETED)
                    .map(Transaction::getAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            LocalDateTime sevenDaysAgo = LocalDateTime.now().minusDays(7);
            BigDecimal last7DaysSent = transactions.stream()
                    .filter(t -> t.getSourceAccountId().equals(accountId)
                            && t.getStatus() == TransactionStatus.COMPLETED
                            && t.getType() != TransactionType.TOPUP
                            && t.getCreatedAt() != null
                            && t.getCreatedAt().isAfter(sevenDaysAgo))
                    .map(Transaction::getAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            // 2. Fetch linked banks
            List<LinkedBank> linkedBanks = linkedBankRepository.findByUserIdAndStatus(userId, "ACTIVE");

            // 3. Fetch recurring payments & bills
            List<RecurringPayment> recurringPayments = recurringPaymentRepository.findByUserIdOrderByCreatedAtDesc(userId);

            // Build deep context string
            StringBuilder ctx = new StringBuilder();
            ctx.append("THÔNG TIN TÀI KHOẢN & TÀI CHÍNH THỰC TẾ TRÊN PAYGATE:\n");
            ctx.append("👤 Chủ tài khoản: ").append(fullName != null ? fullName : username).append(" (Username: ").append(username).append(", Email: ").append(email).append(", Vai trò: ").append(role).append(")\n");
            ctx.append("🏦 Số tài khoản PayGate: ").append(account.getAccountNumber()).append("\n");
            ctx.append("💰 Số dư khả dụng hiện tại: ").append(formatVnd(account.getBalance())).append("\n");
            ctx.append("📊 Tổng đã chuyển đi (20 GD gần nhất): ").append(formatVnd(totalSent)).append("\n");
            ctx.append("📥 Tổng đã nhận (20 GD gần nhất): ").append(formatVnd(totalReceived)).append("\n");
            ctx.append("📅 Đã chi trong 7 ngày qua: ").append(formatVnd(last7DaysSent)).append("\n\n");

            // Linked Banks Section
            ctx.append("🏦 TÀI KHOẢN NGÂN HÀNG ĐÃ LIÊN KẾT (").append(linkedBanks.size()).append(" ngân hàng):\n");
            if (linkedBanks.isEmpty()) {
                ctx.append("   - Chưa liên kết ngân hàng nào.\n");
            } else {
                for (LinkedBank lb : linkedBanks) {
                    ctx.append(String.format("   - %s | Số TK: %s | Chủ TK: %s | Trạng thái: %s\n",
                            lb.getBankName(), maskAccountNumber(lb.getAccountNumber()), lb.getAccountHolder(), lb.getStatus()));
                }
            }
            ctx.append("\n");

            // Recurring Payments Section
            ctx.append("📅 LỊCH ĐỊNH KỲ & HÓA ĐƠN TỰ ĐỘNG (").append(recurringPayments.size()).append(" lịch):\n");
            if (recurringPayments.isEmpty()) {
                ctx.append("   - Chưa thiết lập lịch định kỳ hoặc hóa đơn tự động nào.\n");
            } else {
                for (RecurringPayment rp : recurringPayments) {
                    String nextRun = rp.getNextRunAt() != null ? rp.getNextRunAt().format(VN_DATE_FMT) : "N/A";
                    ctx.append(String.format("   - [%s] %s | Số tiền: %s | Chu kỳ: %s | Lần chạy tiếp: %s | Trạng thái: %s\n",
                            rp.getCategory(),
                            rp.getBillCode() != null ? "Mã HĐ: " + rp.getBillCode() : (rp.getDescription() != null ? rp.getDescription() : "Chuyển tiền"),
                            formatVnd(rp.getAmount()),
                            rp.getFrequency(),
                            nextRun,
                            rp.getStatus()));
                }
            }
            ctx.append("\n");

            // Transactions Section
            if (!transactions.isEmpty()) {
                ctx.append("📋 DANH SÁCH 20 GIAO DỊCH GẦN NHẤT:\n");
                int idx = 1;
                for (Transaction t : transactions) {
                    String direction = t.getSourceAccountId().equals(accountId) ? "Gửi đi" : "Nhận về";
                    String dateStr = t.getCreatedAt() != null ? t.getCreatedAt().format(VN_DATE_FMT) : "N/A";
                    String typeVi = translateType(t.getType());
                    String statusVi = translateStatus(t.getStatus());
                    ctx.append(String.format("%d. [%s] %s | %s | %s | Ngày: %s | Mã GD: %s\n",
                            idx++, direction, formatVnd(t.getAmount()), typeVi, statusVi, dateStr, t.getTransactionRef()));
                    if (t.getDescription() != null && !t.getDescription().isEmpty()) {
                        ctx.append("   Ghi chú: ").append(t.getDescription()).append("\n");
                    }
                }
            } else {
                ctx.append("📋 GIAO DỊCH: Chưa có lịch sử giao dịch nào.\n");
            }

            // System Capabilities Reference
            ctx.append("\n💡 TÍNH NĂNG & QUY TRÌNH HỆ THỐNG PAYGATE:\n");
            ctx.append("1. Nạp tiền VietQR: Quét mã VietQR động từ cổng thanh toán để nạp tiền tức thì vào ví PayGate.\n");
            ctx.append("2. Chuyển tiền: Chuyển tiền nội bộ giữa các tài khoản PayGate theo ID hoặc Số tài khoản AC000...\n");
            ctx.append("3. Lịch định kỳ & Hóa đơn: Tự động chuyển tiền hoặc đóng tiền Điện (EVN), Nước, Internet hàng ngày/tuần/tháng.\n");
            ctx.append("4. Liên kết ngân hàng: Liên kết tài khoản Vietcombank, MBBank, BIDV, Techcombank, Agribank, VPBank để rút/nạp nhanh.\n");
            ctx.append("5. Cổng Merchant & Ledger: Đã kích hoạt cơ chế Sổ cái kép (Double-Entry Ledger) và Webhook retry thương mại.\n");

            String result = ctx.toString();
            log.info("Built deep financial context for user={}:\n{}", username, result);
            return result;

        } catch (Exception e) {
            log.warn("Could not build financial context for user={}: {}", username, e.getMessage(), e);
            return "";
        }
    }

    private String maskAccountNumber(String accNum) {
        if (accNum == null || accNum.length() <= 4) return "****";
        return "****" + accNum.substring(accNum.length() - 4);
    }

    private String translateType(TransactionType type) {
        if (type == null) return "Không xác định";
        return switch (type) {
            case PAYMENT -> "Thanh toán";
            case TOPUP -> "Nạp tiền";
            case REFUND -> "Hoàn tiền";
            case WITHDRAW -> "Rút tiền";
        };
    }

    private String translateStatus(TransactionStatus status) {
        if (status == null) return "Không xác định";
        return switch (status) {
            case COMPLETED -> "Hoàn thành";
            case PENDING -> "Chờ xử lý";
            case PROCESSING -> "Đang xử lý";
            case FAILED -> "Thất bại";
            case EXPIRED -> "Hết hạn";
        };
    }

    private String formatVnd(BigDecimal amount) {
        if (amount == null) return "0 VND";
        return String.format("%,.0f VND", amount);
    }

    private String callOpenRouterApi(String prompt, String financialContext) {
        if (apiKey == null || apiKey.trim().isEmpty()) {
            throw new RuntimeException("OPENROUTER_API_KEY is not configured.");
        }

        StringBuilder systemMsg = new StringBuilder();
        systemMsg.append("Bạn là PayGate AI Assistant — trợ lý tài chính thông minh của hệ thống thanh toán PayGate.\n\n");
        systemMsg.append("=== DỮ LIỆU TÀI CHÍNH THỰC TẾ & HỆ THỐNG DÀNH CHO NGUỜI DÙNG ===\n");
        if (financialContext != null && !financialContext.trim().isEmpty()) {
            systemMsg.append(financialContext);
        } else {
            systemMsg.append("Chưa tìm thấy dữ liệu tài khoản cho người dùng này.\n");
        }
        systemMsg.append("======================================================================\n\n");
        systemMsg.append("QUY TẮC PHẢN HỒI BẮT BUỘC:\n");
        systemMsg.append("1. Trả lời bằng tiếng Việt có dấu đầy đủ, lịch sự, thân thiện, ngắn gọn (2-4 câu).\n");
        systemMsg.append("2. Khi người dùng hỏi về SỐ DƯ, LỊCH SỬ GIAO DỊCH, NGÂN HÀNG LIÊN KẾT, hoặc LỊCH ĐỊNH KỲ / HÓA ĐƠN, BẮT BUỘC phải đọc con số và thông tin thực tế từ phần 'DỮ LIỆU TÀI CHÍNH THỰC TẾ' ở trên để trả lời trực tiếp cho người dùng. TUYỆT ĐỐI KHÔNG từ chối hoặc trả lời 'tôi chưa có dữ liệu' hay 'vui lòng mở app'.\n");
        systemMsg.append("3. Tuyệt đối KHÔNG sử dụng biểu tượng emoji, KHÔNG tạo mã QR, link ảnh ngoài, hay bảng biểu phức tạp. Trả lời bằng văn bản chuẩn doanh nghiệp.\n");
        systemMsg.append("4. Khi người dùng muốn nạp tiền, chuyển tiền, hoặc cài đặt lịch định kỳ, thông báo ngắn gọn và gợi ý sử dụng chức năng tương ứng trên ứng dụng.\n");
        systemMsg.append("5. Nếu câu hỏi KHÔNG liên quan đến tài chính, ví điện tử, giao dịch, hoặc hệ thống PayGate, từ chối lịch sự.\n");

        log.info("Sending prompt to OpenRouter model={} with systemPrompt length={}", model, systemMsg.length());

        List<Map<String, Object>> messages = List.of(
                Map.of("role", "system", "content", systemMsg.toString()),
                Map.of("role", "user", "content", prompt)
        );

        RestTemplate restTemplate = new RestTemplate();

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("Authorization", "Bearer " + apiKey.trim());
        headers.set("HTTP-Referer", "https://paygate.dev");
        headers.set("X-Title", "PayGate Financial AI Assistant");

        Map<String, Object> body = new java.util.HashMap<>();
        body.put("model", model);
        body.put("messages", messages);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

        ResponseEntity<String> response = restTemplate.exchange(apiUrl, HttpMethod.POST, entity, String.class);

        if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
            try {
                JsonNode root = objectMapper.readTree(response.getBody());
                JsonNode choices = root.path("choices");
                if (choices.isArray() && !choices.isEmpty()) {
                    return choices.get(0).path("message").path("content").asText();
                }
            } catch (Exception e) {
                log.error("Failed to parse OpenRouter response: {}", e.getMessage());
                throw new RuntimeException("Failed to parse OpenRouter API response.");
            }
        }

        throw new RuntimeException("OpenRouter API returned empty or invalid response.");
    }

    private Long extractAmount(String text) {
        Pattern kPattern = Pattern.compile("(\\d+)\\s*(k|kđ|tr|triệu)", Pattern.CASE_INSENSITIVE);
        Matcher kMatcher = kPattern.matcher(text);
        if (kMatcher.find()) {
            long num = Long.parseLong(kMatcher.group(1));
            String unit = kMatcher.group(2).toLowerCase();
            return (unit.startsWith("tr")) ? num * 1_000_000 : num * 1_000;
        }
        Pattern rawPattern = Pattern.compile("(\\d{4,9})");
        Matcher rawMatcher = rawPattern.matcher(text);
        if (rawMatcher.find()) {
            return Long.parseLong(rawMatcher.group(1));
        }
        return null;
    }

    private String extractRecipient(String text) {
        Matcher payMatcher = Pattern.compile("(PAY\\d{10})", Pattern.CASE_INSENSITIVE).matcher(text);
        if (payMatcher.find()) return payMatcher.group(1).toUpperCase();

        Matcher phoneMatcher = Pattern.compile("(0\\d{9})").matcher(text);
        if (phoneMatcher.find()) return phoneMatcher.group(1);

        return null;
    }
}
