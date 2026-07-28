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
        if (lower.matches(".*(bill|recurring|electricity|water|internet|auto.?pay|subscription|scheduled).*")) return "RECURRING";
        if (lower.matches(".*(top.?up|recharge|deposit|vietqr|nap tien).*")) return "TOPUP";
        if (lower.matches(".*(transfer|send|pay|chuyen|gui tien|thanh toan).*")) return "TRANSFER";
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
            ctx.append("PAYGATE ACCOUNT & FINANCIAL CONTEXT:\n");
            ctx.append("👤 Account holder: ").append(fullName != null ? fullName : username).append(" (Username: ").append(username).append(", Email: ").append(email).append(", Role: ").append(role).append(")\n");
            ctx.append("🏦 PayGate Account Number: ").append(account.getAccountNumber()).append("\n");
            ctx.append("💰 Current available balance: ").append(formatVnd(account.getBalance())).append("\n");
            ctx.append("📊 Total sent (last 20 transactions): ").append(formatVnd(totalSent)).append("\n");
            ctx.append("📥 Total received (last 20 transactions): ").append(formatVnd(totalReceived)).append("\n");
            ctx.append("📅 Spent in last 7 days: ").append(formatVnd(last7DaysSent)).append("\n\n");

            // Linked Banks Section
            ctx.append("🏦 LINKED BANK ACCOUNTS (").append(linkedBanks.size()).append(" banks):\n");
            if (linkedBanks.isEmpty()) {
                ctx.append("   - No linked banks.\n");
            } else {
                for (LinkedBank lb : linkedBanks) {
                    ctx.append(String.format("   - %s | Account: %s | Holder: %s | Status: %s\n",
                            lb.getBankName(), maskAccountNumber(lb.getAccountNumber()), lb.getAccountHolder(), lb.getStatus()));
                }
            }
            ctx.append("\n");

            // Recurring Payments Section
            ctx.append("📅 RECURRING PAYMENTS & AUTO BILLS (").append(recurringPayments.size()).append(" schedules):\n");
            if (recurringPayments.isEmpty()) {
                ctx.append("   - No recurring payments or auto bills set up.\n");
            } else {
                for (RecurringPayment rp : recurringPayments) {
                    String nextRun = rp.getNextRunAt() != null ? rp.getNextRunAt().format(VN_DATE_FMT) : "N/A";
                    ctx.append(String.format("   - [%s] %s | Amount: %s | Frequency: %s | Next run: %s | Status: %s\n",
                            rp.getCategory(),
                            rp.getBillCode() != null ? "Bill Code: " + rp.getBillCode() : (rp.getDescription() != null ? rp.getDescription() : "Transfer"),
                            formatVnd(rp.getAmount()),
                            rp.getFrequency(),
                            nextRun,
                            rp.getStatus()));
                }
            }
            ctx.append("\n");

            // Transactions Section
            if (!transactions.isEmpty()) {
                ctx.append("📋 LAST 20 TRANSACTIONS:\n");
                int idx = 1;
                for (Transaction t : transactions) {
                    String direction = t.getSourceAccountId().equals(accountId) ? "Sent" : "Received";
                    String dateStr = t.getCreatedAt() != null ? t.getCreatedAt().format(VN_DATE_FMT) : "N/A";
                    String typeVi = translateType(t.getType());
                    String statusVi = translateStatus(t.getStatus());
                    ctx.append(String.format("%d. [%s] %s | %s | %s | Date: %s | Ref: %s\n",
                            idx++, direction, formatVnd(t.getAmount()), typeVi, statusVi, dateStr, t.getTransactionRef()));
                    if (t.getDescription() != null && !t.getDescription().isEmpty()) {
                        ctx.append("   Note: ").append(t.getDescription()).append("\n");
                    }
                }
            } else {
                ctx.append("📋 TRANSACTIONS: No transaction history yet.\n");
            }

            // System Capabilities Reference
            ctx.append("\n💡 PAYGATE SYSTEM FEATURES & PROCESSES:\n");
            ctx.append("1. VietQR Top-Up: Scan a dynamic VietQR code from the payment portal to instantly top up your PayGate wallet.\n");
            ctx.append("2. Transfer: Send money between PayGate accounts via Account ID or Account Number AC000...\n");
            ctx.append("3. Recurring & Bills: Auto-pay electricity (EVN), water, internet bills on daily/weekly/monthly schedules.\n");
            ctx.append("4. Linked Banks: Link Vietcombank, MBBank, BIDV, Techcombank, Agribank, VPBank accounts for quick withdraw/top-up.\n");
            ctx.append("5. Merchant Gateway & Ledger: Double-Entry Ledger enabled with merchant webhook retry mechanism.\n");

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
        if (type == null) return "Unknown";
        return switch (type) {
            case PAYMENT -> "Thanh toán";
            case TOPUP -> "Nạp tiền";
            case REFUND -> "Hoàn tiền";
            case WITHDRAW -> "Rút tiền";
            case BILL_PAYMENT -> "Thanh toán hóa đơn";
            case LOAN_REPAYMENT -> "Trả nợ khoản vay";
            case LOAN_DISBURSEMENT -> "Giải ngân khoản vay";
            case VAULT_DEPOSIT -> "Nạp hũ tiết kiệm";
            case VAULT_WITHDRAW -> "Rút hũ tiết kiệm";
            default -> type.name();
        };
    }

    private String translateStatus(TransactionStatus status) {
        if (status == null) return "Unknown";
        return switch (status) {
            case COMPLETED -> "Completed";
            case PENDING -> "Pending";
            case PROCESSING -> "Processing";
            case FAILED -> "Failed";
            case EXPIRED -> "Expired";
        };
    }

    private String formatVnd(BigDecimal amount) {
        if (amount == null) return "0 VND";
        return String.format("%,.0f VND", amount);
    }

    private String callOpenRouterApi(String prompt, String financialContext) {
        if (apiKey == null || apiKey.trim().isEmpty()) {
            log.warn("OPENROUTER_API_KEY is not configured — returning fallback response");
            return "AI Assistant requires an OpenRouter API Key. Please contact your administrator to set the OPENROUTER_API_KEY environment variable.";
        }

        StringBuilder systemMsg = new StringBuilder();
        systemMsg.append("You are PayGate AI Assistant — an intelligent financial assistant for the PayGate payment system.\n\n");
        systemMsg.append("=== REAL USER FINANCIAL & SYSTEM DATA ===\n");
        if (financialContext != null && !financialContext.trim().isEmpty()) {
            systemMsg.append(financialContext);
        } else {
            systemMsg.append("No account data found for this user.\n");
        }
        systemMsg.append("======================================================================\n\n");
        systemMsg.append("MANDATORY RESPONSE RULES:\n");
        systemMsg.append("1. Answer in Vietnamese with full diacritics, polite, friendly, concise (2-4 sentences).\n");
        systemMsg.append("2. When users ask about BALANCE, TRANSACTION HISTORY, LINKED BANKS, or RECURRING PAYMENTS / BILLS, you MUST read the actual numbers and information from the 'REAL USER FINANCIAL & SYSTEM DATA' section above to answer directly. NEVER refuse or say 'I have no data' or 'please open the app'.\n");
        systemMsg.append("3. Do NOT use emoji, do NOT generate QR codes, external image links, or complex tables. Answer in clean business text.\n");
        systemMsg.append("4. When users want to top up, transfer money, or set up recurring payments, briefly acknowledge and suggest using the corresponding feature in the app.\n");
        systemMsg.append("5. If the question is NOT related to finance, e-wallet, transactions, or the PayGate system, politely decline.\n");

        List<String> candidateModels = List.of(
                "openrouter/auto",
                "meta-llama/llama-3.3-70b-instruct:free",
                "qwen/qwen-2.5-72b-instruct:free",
                "deepseek/deepseek-r1:free",
                model
        );

        for (String currentModel : candidateModels) {
            try {
                log.info("Attempting OpenRouter request model={} for prompt length={}", currentModel, prompt.length());
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
                body.put("model", currentModel);
                body.put("messages", messages);

                HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
                ResponseEntity<String> response = restTemplate.exchange(apiUrl, HttpMethod.POST, entity, String.class);

                if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                    JsonNode root = objectMapper.readTree(response.getBody());
                    JsonNode choices = root.path("choices");
                    if (choices.isArray() && !choices.isEmpty()) {
                        String content = choices.get(0).path("message").path("content").asText();
                        if (content != null && !content.trim().isEmpty()) {
                            return content;
                        }
                    }
                }
            } catch (Exception e) {
                log.warn("OpenRouter model {} call failed: {}", currentModel, e.getMessage());
            }
        }

        log.warn("All OpenRouter models failed. Returning smart fallback financial response.");
        return "I've noted your financial information. You can check your balance, saved contacts, or recurring payment schedules directly in the PayGate menu!";
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
