package com.training.paygate.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.training.paygate.dto.request.AiChatRequest;
import com.training.paygate.dto.response.AiChatResponse;
import com.training.paygate.entity.*;
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
    private final VaultRepository vaultRepository;
    private final LoanRepository loanRepository;
    private final BillSubscriptionRepository billSubscriptionRepository;
    private final MerchantRepository merchantRepository;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private static final DateTimeFormatter VN_DATE_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    @Override
    public AiChatResponse processChat(AiChatRequest request, String username) {
        String prompt = request.getPrompt();
        log.info("Processing AI Chat prompt via OpenRouter model={} for user={}", model, username);

        String financialContext = "";
        try {
            financialContext = buildFinancialContext(request.getUserId(), username);
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
        if (lower.matches(".*(vault|hũ|tích lũy|tiết kiệm|tiet kiem|tich luy).*")) return "VAULT";
        if (lower.matches(".*(loan|vay|giải ngân|tín dụng|giai ngan|tra no).*")) return "LOAN";
        if (lower.matches(".*(voucher|ưu đãi|giảm giá|uu dai|doi diem|điểm thưởng).*")) return "VOUCHER";
        if (lower.matches(".*(bill|điện|nước|internet|hóa đơn|hoa don).*")) return "BILL";
        if (lower.matches(".*(admin|quản trị|ledger|sổ cái|doanh nghiệp|merchant).*")) return "ADMIN";
        if (lower.matches(".*(recurring|auto.?pay|tự động|dinh ky).*")) return "RECURRING";
        if (lower.matches(".*(top.?up|recharge|deposit|vietqr|nạp tiền|nap tien).*")) return "TOPUP";
        if (lower.matches(".*(transfer|send|pay|chuyển|gửi tiền|chuyen tien).*")) return "TRANSFER";
        return null;
    }

    /**
     * Build deep comprehensive financial & system context for the logged in user across ALL features.
     */
    private String buildFinancialContext(Long reqUserId, String username) {
        try {
            Optional<User> userOpt = Optional.empty();

            if (reqUserId != null) {
                userOpt = userRepository.findById(reqUserId);
            }

            if (userOpt.isEmpty() && username != null) {
                userOpt = userRepository.findByUsername(username);
                if (userOpt.isEmpty()) {
                    List<User> users = userRepository.findAllByUsernameIgnoreCase(username);
                    if (!users.isEmpty()) {
                        userOpt = Optional.of(users.get(0));
                    }
                }
            }

            if (userOpt.isEmpty()) {
                log.warn("User not found by reqUserId={} username={}", reqUserId, username);
                return "";
            }

            User user = userOpt.get();
            Long userId = user.getId();
            String fullName = user.getFullName();
            String email = user.getEmail();
            String role = user.getRole().name();

            Optional<Account> accountOpt = accountRepository.findByOwnerIdAndOwnerType(userId, OwnerType.USER);

            StringBuilder ctx = new StringBuilder();
            ctx.append("=== PAYGATE COMPREHENSIVE SYSTEM & USER CONTEXT ===\n");
            ctx.append("👤 Account Holder: ").append(fullName != null ? fullName : username)
                    .append(" (Username: ").append(username).append(", Email: ").append(email).append(", Role: ").append(role).append(")\n");

            if (accountOpt.isPresent()) {
                Account account = accountOpt.get();
                Long accountId = account.getId();

                ctx.append("🏦 PayGate Account Number: ").append(account.getAccountNumber()).append("\n");
                ctx.append("💰 Available Main Balance: ").append(formatVnd(account.getBalance())).append("\n\n");

                // 1. Savings Vaults Section
                try {
                    List<Vault> vaults = vaultRepository.findByUserIdOrderByCreatedAtDesc(userId);
                    ctx.append("🐷 SAVINGS VAULTS (").append(vaults.size()).append(" vaults):\n");
                    if (vaults.isEmpty()) {
                        ctx.append("   - No active savings vaults.\n");
                    } else {
                        for (Vault v : vaults) {
                            BigDecimal vBal = BigDecimal.ZERO;
                            if (v.getAccountId() != null) {
                                Optional<Account> vAcc = accountRepository.findById(v.getAccountId());
                                if (vAcc.isPresent()) vBal = vAcc.get().getBalance();
                            }
                            ctx.append(String.format("   - [#%d] Name: %s | Saved: %s / Target: %s | Status: %s\n",
                                    v.getId(), v.getName(), formatVnd(vBal), formatVnd(v.getTargetAmount()), v.getStatus()));
                        }
                    }
                    ctx.append("\n");
                } catch (Exception e) {
                    log.warn("Vaults query exception: {}", e.getMessage());
                }

                // 2. Loans & Credit Lines Section
                try {
                    List<Loan> loans = loanRepository.findByUserId(userId, PageRequest.of(0, 10)).getContent();
                    ctx.append("💵 CONSUMER LOANS & CREDIT (").append(loans.size()).append(" loans):\n");
                    if (loans.isEmpty()) {
                        ctx.append("   - No consumer loans on record.\n");
                    } else {
                        for (Loan l : loans) {
                            ctx.append(String.format("   - [%s] Principal: %s | Term: %d months | Remaining: %s | Status: %s\n",
                                    l.getLoanRef(), formatVnd(l.getAmount()), l.getTermMonths(), formatVnd(l.getRemainingAmount()), l.getStatus()));
                        }
                    }
                    ctx.append("\n");
                } catch (Exception e) {
                    log.warn("Loans query exception: {}", e.getMessage());
                }

                // 3. Bill Subscriptions Section
                try {
                    List<BillSubscription> billSubs = billSubscriptionRepository.findByUserIdOrderByCreatedAtDesc(userId);
                    ctx.append("⚡ REGISTERED BILL SUBSCRIPTIONS (").append(billSubs.size()).append(" bills):\n");
                    if (billSubs.isEmpty()) {
                        ctx.append("   - No registered utility bills.\n");
                    } else {
                        for (BillSubscription bs : billSubs) {
                            ctx.append(String.format("   - Provider ID: %d | Customer Code: %s | Amount: %s | Status: %s\n",
                                    bs.getProviderId(), bs.getCustomerCode(), formatVnd(bs.getCycleAmount()), bs.getStatus()));
                        }
                    }
                    ctx.append("\n");
                } catch (Exception e) {
                    log.warn("BillSubscriptions query exception: {}", e.getMessage());
                }

                // 4. Linked Bank Accounts
                List<LinkedBank> linkedBanks = linkedBankRepository.findByUserIdAndStatus(userId, "ACTIVE");
                ctx.append("🏦 LINKED BANK ACCOUNTS (").append(linkedBanks.size()).append(" banks):\n");
                if (linkedBanks.isEmpty()) {
                    ctx.append("   - No linked bank accounts.\n");
                } else {
                    for (LinkedBank lb : linkedBanks) {
                        ctx.append(String.format("   - %s | Acc: %s | Holder: %s\n",
                                lb.getBankName(), maskAccountNumber(lb.getAccountNumber()), lb.getAccountHolder()));
                    }
                }
                ctx.append("\n");

                // 5. Recent 15 Transactions
                List<Transaction> transactions = transactionRepository
                        .findAllWithFiltersAndOwner(accountId, null, null, null, null, null,
                                PageRequest.of(0, 15, Sort.by(Sort.Direction.DESC, "createdAt")))
                        .getContent();

                if (!transactions.isEmpty()) {
                    ctx.append("📋 RECENT TRANSACTIONS (Last 15):\n");
                    int idx = 1;
                    for (Transaction t : transactions) {
                        String dir = t.getSourceAccountId().equals(accountId) ? "Out" : "In";
                        String dateStr = t.getCreatedAt() != null ? t.getCreatedAt().format(VN_DATE_FMT) : "N/A";
                        ctx.append(String.format("%d. [%s] %s | %s | %s | Date: %s | Ref: %s\n",
                                idx++, dir, formatVnd(t.getAmount()), translateType(t.getType()), translateStatus(t.getStatus()), dateStr, t.getTransactionRef()));
                    }
                } else {
                    ctx.append("📋 TRANSACTIONS: No transactions yet.\n");
                }
            } else {
                ctx.append("⚠️ User has no active personal wallet.\n");
            }

            // 6. Admin Overview Context (If user is ROLE_ADMIN)
            if ("ROLE_ADMIN".equalsIgnoreCase(role) || "ADMIN".equalsIgnoreCase(role)) {
                ctx.append("\n👑 SYSTEM ADMIN OVERVIEW:\n");
                ctx.append("   - Admin Console: Access double-entry ledger audits, merchant approvals, and webhook retries at /admin/dashboard.\n");
                ctx.append("   - Total Registered Merchants: ").append(merchantRepository.count()).append("\n");
            }

            // All Feature Capabilities Summary
            ctx.append("\n💡 ALL PAYGATE PRO FEATURES OVERVIEW:\n");
            ctx.append("1. Balance & TopUp: Quick VietQR deposit into wallet.\n");
            ctx.append("2. Transfers: Instant P2P money transfer via Account ID or Account Number AC00...\n");
            ctx.append("3. Savings Vaults: Create goal-oriented 3D piggy bank savings vaults.\n");
            ctx.append("4. Consumer Loans: Apply for consumer credit up to 50M VND with instant disbursement.\n");
            ctx.append("5. Utility Bills: Pay Electricity (EVN), Water, Internet, Tuition fees automatically.\n");
            ctx.append("6. Vouchers & Rewards: Earn reward points on transactions and redeem discount vouchers.\n");
            ctx.append("7. Merchant Gateway: Integration API keys, dynamic Checkout Sessions & Webhooks.\n");
            ctx.append("8. Double-Entry Ledger: Financial integrity audit system.\n");

            String result = ctx.toString();
            log.info("Built comprehensive financial context for user={}:\n{}", username, result);
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
        if (type == null) return "Giao dịch";
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
            return "Trợ lý AI cần được cấu hình OpenRouter API Key để trả lời tự động.";
        }

        StringBuilder systemMsg = new StringBuilder();
        systemMsg.append("You are PayGate AI Assistant — an intelligent, comprehensive financial assistant for the PayGate e-wallet ecosystem.\n\n");
        systemMsg.append("=== REAL USER & COMPREHENSIVE SYSTEM DATA ===\n");
        if (financialContext != null && !financialContext.trim().isEmpty()) {
            systemMsg.append(financialContext);
        } else {
            systemMsg.append("No account data found for this user.\n");
        }
        systemMsg.append("======================================================================\n\n");
        systemMsg.append("MANDATORY RESPONSE RULES:\n");
        systemMsg.append("1. Answer in Vietnamese with full diacritics, polite, friendly, professional, and concise (2-4 sentences).\n");
        systemMsg.append("2. When users ask about BALANCE, TRANSACTIONS, SAVINGS VAULTS, LOANS, BILLS, LINKED BANKS, or VOUCHERS, you MUST read the exact numbers from the REAL USER & COMPREHENSIVE SYSTEM DATA above to answer directly. Never say 'I have no data' or 'open the app'.\n");
        systemMsg.append("3. Do NOT use emojis, do NOT generate raw markdown code blocks or complex tables. Answer in clean, elegant business text.\n");
        systemMsg.append("4. Guide users smoothly to the correct feature (Vaults, Loans, Bills, TopUp, Transfers, Vouchers, Admin) based on their question.\n");

        List<String> candidateModels = List.of(
                "openrouter/auto",
                "meta-llama/llama-3.3-70b-instruct:free",
                "qwen/qwen-2.5-72b-instruct:free",
                "google/gemini-2.0-flash-exp:free"
        );

        for (String modelName : candidateModels) {
            try {
                String reply = sendOpenRouterRequest(modelName, systemMsg.toString(), prompt);
                if (reply != null && !reply.trim().isEmpty()) {
                    return reply;
                }
            } catch (Exception e) {
                log.warn("Model {} failed: {}", modelName, e.getMessage());
            }
        }

        return "Xin lỗi, hiện tại trợ lý AI chưa thể xử lý yêu cầu. Vui lòng thử lại sau ít phút!";
    }

    private String sendOpenRouterRequest(String targetModel, String systemPrompt, String userPrompt) throws Exception {
        RestTemplate restTemplate = new RestTemplate();
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("Authorization", "Bearer " + apiKey.trim());
        headers.set("HTTP-Referer", "http://localhost:4200");
        headers.set("X-Title", "PayGate AI Assistant");

        Map<String, Object> body = Map.of(
                "model", targetModel,
                "messages", List.of(
                        Map.of("role", "system", "content", systemPrompt),
                        Map.of("role", "user", "content", userPrompt)
                ),
                "max_tokens", 400,
                "temperature", 0.5
        );

        HttpEntity<String> entity = new HttpEntity<>(objectMapper.writeValueAsString(body), headers);
        ResponseEntity<String> response = restTemplate.exchange(apiUrl, HttpMethod.POST, entity, String.class);

        if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
            JsonNode root = objectMapper.readTree(response.getBody());
            JsonNode choices = root.path("choices");
            if (choices.isArray() && choices.size() > 0) {
                return choices.get(0).path("message").path("content").asText();
            }
        }
        return null;
    }

    private Long extractAmount(String prompt) {
        if (prompt == null) return null;
        Pattern pattern = Pattern.compile("(\\d+)(\\s*k|\\s*000|\\s*tr)?", Pattern.CASE_INSENSITIVE);
        Matcher matcher = pattern.matcher(prompt);
        if (matcher.find()) {
            try {
                long num = Long.parseLong(matcher.group(1));
                String unit = matcher.group(2);
                if (unit != null) {
                    unit = unit.trim().toLowerCase();
                    if (unit.equals("k") || unit.equals("000")) num *= 1000;
                    else if (unit.equals("tr")) num *= 1_000_000;
                }
                return num;
            } catch (NumberFormatException ignored) {}
        }
        return null;
    }

    private String extractRecipient(String prompt) {
        if (prompt == null) return null;
        Pattern pattern = Pattern.compile("(cho|den|to|account)\\s+([a-zA-Z0-9_-]+)", Pattern.CASE_INSENSITIVE);
        Matcher matcher = pattern.matcher(prompt);
        if (matcher.find()) {
            return matcher.group(2);
        }
        return null;
    }
}
