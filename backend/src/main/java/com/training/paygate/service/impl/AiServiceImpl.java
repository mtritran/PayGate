package com.training.paygate.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.training.paygate.dto.request.AiChatRequest;
import com.training.paygate.dto.response.AiChatResponse;
import com.training.paygate.entity.Account;
import com.training.paygate.entity.Transaction;
import com.training.paygate.enums.OwnerType;
import com.training.paygate.enums.TransactionStatus;
import com.training.paygate.enums.TransactionType;
import com.training.paygate.repository.AccountRepository;
import com.training.paygate.repository.TransactionRepository;
import com.training.paygate.repository.UserRepository;
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
    private final ObjectMapper objectMapper = new ObjectMapper();

    private static final DateTimeFormatter VN_DATE_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    @Override
    public AiChatResponse processChat(AiChatRequest request, String username) {
        String prompt = request.getPrompt();
        log.info("Processing AI Chat prompt via OpenRouter model={} for user={}", model, username);

        String financialContext = buildFinancialContext(username);
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
        if (lower.matches(".*(nạp|nap|top.?up|recharge|deposit|vietqr|nap tien).*")) return "TOPUP";
        if (lower.matches(".*(chuyển|chuyen|transfer|gửi tiền|gui tien|thanh toán|thanh toan|pay|send).*")) return "TRANSFER";
        // Số dư, lịch sử → AI tự trả lời trực tiếp trong chat, không cần redirect
        return null;
    }

    /**
     * Build a rich financial context string from the user's account and recent transactions.
     * This is injected into the AI system prompt so the AI can answer financial queries accurately.
     */
    private String buildFinancialContext(String username) {
        if (username == null) return "";

        try {
            // 1. Find the user's account
            Optional<com.training.paygate.entity.User> userOpt = userRepository.findByUsername(username);
            if (userOpt.isEmpty()) return "";

            Long userId = userOpt.get().getId();
            Optional<Account> accountOpt = accountRepository.findByOwnerIdAndOwnerType(userId, OwnerType.USER);
            if (accountOpt.isEmpty()) return "";

            Account account = accountOpt.get();
            Long accountId = account.getId();

            // 2. Fetch last 30 transactions (most recent first)
            List<Transaction> transactions = transactionRepository
                    .findAllWithFiltersAndOwner(accountId, null, null, null, null, null,
                            PageRequest.of(0, 30, Sort.by(Sort.Direction.DESC, "createdAt")))
                    .getContent();

            // 3. Compute statistics
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

            // Spending in last 7 days
            LocalDateTime sevenDaysAgo = LocalDateTime.now().minusDays(7);
            BigDecimal last7DaysSent = transactions.stream()
                    .filter(t -> t.getSourceAccountId().equals(accountId)
                            && t.getStatus() == TransactionStatus.COMPLETED
                            && t.getType() != TransactionType.TOPUP
                            && t.getCreatedAt() != null
                            && t.getCreatedAt().isAfter(sevenDaysAgo))
                    .map(Transaction::getAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            // 4. Build context string
            StringBuilder ctx = new StringBuilder();
            ctx.append("\n\n--- THONG TIN TAI CHINH CUA NGUOI DUNG ---\n");
            ctx.append("So tai khoan: ").append(account.getAccountNumber()).append("\n");
            ctx.append("So du hien tai: ").append(formatVnd(account.getBalance())).append("\n");
            ctx.append("Tong da gui di (trong 30 GD gan nhat): ").append(formatVnd(totalSent)).append("\n");
            ctx.append("Tong da nhan (trong 30 GD gan nhat): ").append(formatVnd(totalReceived)).append("\n");
            ctx.append("Da chi trong 7 ngay qua: ").append(formatVnd(last7DaysSent)).append("\n");
            ctx.append("So giao dich gan day: ").append(transactions.size()).append("\n");

            if (!transactions.isEmpty()) {
                ctx.append("\n30 Giao dich gan nhat:\n");
                for (Transaction t : transactions) {
                    String direction = t.getSourceAccountId().equals(accountId) ? "GUI" : "NHAN";
                    String dateStr = t.getCreatedAt() != null ? t.getCreatedAt().format(VN_DATE_FMT) : "N/A";
                    ctx.append(String.format("  [%s] %s | %s | %s | %s | Ma GD: %s\n",
                            direction,
                            formatVnd(t.getAmount()),
                            t.getType(),
                            t.getStatus(),
                            dateStr,
                            t.getTransactionRef()));
                }
            }
            ctx.append("--- KET THUC THONG TIN TAI CHINH ---\n");

            return ctx.toString();

        } catch (Exception e) {
            log.warn("Could not build financial context for user={}: {}", username, e.getMessage());
            return "";
        }
    }

    private String formatVnd(BigDecimal amount) {
        if (amount == null) return "0 VND";
        return String.format("%,.0f VND", amount);
    }

    private String callOpenRouterApi(String prompt, String financialContext) {
        if (apiKey == null || apiKey.trim().isEmpty()) {
            throw new RuntimeException("OPENROUTER_API_KEY is not configured.");
        }

        String systemPrompt = "Bạn là PayGate AI Assistant — trợ lý tài chính thông minh, ngắn gọn và chính xác.\n\n" +
                "QUY TẮC BẮT BUỘC:\n" +
                "- Trả lời bằng tiếng Việt có dấu đầy đủ, lịch sự, thân thiện.\n" +
                "- Chỉ dùng văn bản thuần túy, tối đa 3-4 câu ngắn gọn.\n" +
                "- TUYỆT ĐỐI KHÔNG tạo: mã QR, hình ảnh, bảng biểu, code block dài, link ngoài, số tài khoản ngân hàng thật.\n" +
                "- KHÔNG gợi ý chuyển khoản qua ngân hàng bên ngoài hệ thống PayGate.\n" +
                "- Khi hỏi về số dư hoặc lịch sử giao dịch: trả lời trực tiếp từ dữ liệu tài chính bên dưới.\n" +
                "- Khi người dùng muốn NẠP TIỀN hoặc CHUYỂN TIỀN: chỉ nói ngắn gọn rằng họ có thể thực hiện trên ứng dụng — nút chuyển hướng sẽ xuất hiện tự động.\n" +
                financialContext;


        RestTemplate restTemplate = new RestTemplate();

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("Authorization", "Bearer " + apiKey.trim());
        headers.set("HTTP-Referer", "https://paygate.dev");
        headers.set("X-Title", "PayGate Financial AI Assistant");

        Map<String, Object> body = Map.of(
                "model", model,
                "messages", List.of(
                        Map.of("role", "system", "content", systemPrompt),
                        Map.of("role", "user", "content", prompt)
                )
        );

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
