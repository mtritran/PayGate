package com.training.paygate.service.impl;

import com.training.paygate.dto.request.AiChatRequest;
import com.training.paygate.dto.response.AiChatResponse;
import com.training.paygate.service.AiService;
import com.training.paygate.service.AiContextBuilderService;
import com.training.paygate.service.OpenRouterClientService;
import com.training.paygate.util.AiIntentParserUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@Slf4j
@RequiredArgsConstructor
public class AiServiceImpl implements AiService {

    @Value("${openrouter.model:nvidia/nemotron-3-ultra-550b-a55b:free}")
    private String model;

    private final AiContextBuilderService contextBuilderService;
    private final OpenRouterClientService openRouterClientService;

    @Override
    public AiChatResponse processChat(AiChatRequest request, String username) {
        String prompt = request.getPrompt();
        log.info("Processing AI Chat prompt via OpenRouter model={} for user={}", model, username);

        String financialContext = "";
        try {
            financialContext = contextBuilderService.buildFinancialContext(request.getUserId(), username);
        } catch (Exception e) {
            log.warn("Failed to build financial context for user={}: {}", username, e.getMessage());
        }
        
        String replyText = callOpenRouterApi(prompt, financialContext);
        if (replyText == null || replyText.trim().isEmpty() || "null".equalsIgnoreCase(replyText.trim()) || "undefined".equalsIgnoreCase(replyText.trim())) {
            replyText = buildSmartFallbackReply(prompt, financialContext);
        }

        Long suggestedAmount = AiIntentParserUtil.extractAmount(prompt);
        String suggestedRecipient = AiIntentParserUtil.extractRecipient(prompt);
        String action = AiIntentParserUtil.detectAction(prompt);

        return AiChatResponse.builder()
                .reply(replyText)
                .modelUsed(model)
                .suggestedAmount(suggestedAmount)
                .suggestedRecipient(suggestedRecipient)
                .action(action)
                .build();
    }

    private String callOpenRouterApi(String prompt, String financialContext) {
        if (!openRouterClientService.isConfigured()) {
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
        systemMsg.append("5. STRICT OFF-TOPIC GUARDRAIL: If the user asks about weather, entertainment, jokes, stories, poetry, philosophy, coding, general trivia, or anything non-financial, IMMEDIATELY REFUSE with: 'Tôi là Trợ lý tài chính PayGate AI. Tôi chỉ hỗ trợ các câu hỏi liên quan đến tài khoản, số dư, chuyển tiền, hũ tiết kiệm, khoản vay và dịch vụ PayGate của bạn.' Do not answer off-topic questions under any circumstances.\n");

        List<String> candidateModels = List.of(
                "google/gemini-2.0-flash-lite-preview-02-05:free",
                "google/gemini-2.0-flash-exp:free",
                "deepseek/deepseek-r1-distill-llama-70b:free",
                "qwen/qwen-2.5-72b-instruct:free",
                "meta-llama/llama-3.3-70b-instruct:free",
                "openrouter/auto"
        );

        for (String modelName : candidateModels) {
            try {
                String reply = openRouterClientService.sendRequest(modelName, systemMsg.toString(), prompt);
                if (reply != null && !reply.trim().isEmpty()) {
                    return reply;
                }
            } catch (Exception e) {
                log.warn("Model {} failed: {}", modelName, e.getMessage());
            }
        }

        // Smart Local Financial Fallback Engine if OpenRouter API is unavailable
        return buildSmartFallbackReply(prompt, financialContext);
    }

    private String buildSmartFallbackReply(String prompt, String context) {
        String lower = prompt != null ? prompt.toLowerCase().trim() : "";
        String balanceStr = "";
        
        if (context != null && context.contains("Available Main Balance:")) {
            balanceStr = extractLine(context, "Available Main Balance:").replace("Available Main Balance:", "").trim();
        }

        // Strict Off-Topic Guardrail Check
        if (lower.matches(".*(thời tiết|thoi tiet|làm thơ|lam tho|truyện|truyen|kể chuyện|ke truyen|tình yêu|tinh yeu|bói|choi game|thế giới|the gioi|vũ trụ|vu tru|bóng đá|bong da|thời sự|thoi su|ca nhạc|ca nhac|hát|nấu ăn|nau an|bài hát|phim).*")) {
            return "Tôi là Trợ lý tài chính PayGate AI. Tôi chỉ hỗ trợ các câu hỏi liên quan đến tài khoản, số dư, chuyển tiền, hũ tiết kiệm, khoản vay và dịch vụ PayGate của bạn.";
        }

        // 1. Balance queries
        if (lower.contains("dư") || lower.contains("tiền") || lower.contains("tài khoản") || lower.contains("balance") || lower.contains("bao nhiêu")) {
            if (!balanceStr.isEmpty()) {
                return "Số dư khả dụng hiện tại trong ví PayGate của bạn là **" + balanceStr + "**. Trợ lý AI sẵn sàng hỗ trợ các giao dịch tiếp theo!";
            }
            return "Số dư ví PayGate của bạn đang được cập nhật realtime trên hệ thống.";
        }
        
        // 2. Savings Vault queries
        if (lower.contains("hũ") || lower.contains("tích lũy") || lower.contains("vault")) {
            if (context != null && context.contains("SAVINGS VAULTS") && !context.contains("No active savings vaults")) {
                return "Hệ thống ghi nhận bạn đang có các hũ tiết kiệm khả dụng. Bạn có thể bấm nút bên dưới để truy cập danh sách hũ chi tiết.";
            }
            return "Bạn hiện chưa có hũ tiết kiệm nào. Hãy mở hũ tiết kiệm mới để tích lũy tài chính ngay hôm nay!";
        }
        
        // 3. Loan queries
        if (lower.contains("vay") || lower.contains("nợ") || lower.contains("loan")) {
            if (context != null && context.contains("CONSUMER LOANS & CREDIT") && !context.contains("No consumer loans on record")) {
                return "Hệ thống ghi nhận thông tin khoản vay tiêu dùng của bạn. Bạn có thể bấm nút xem khoản vay bên dưới để kiểm tra chi tiết dư nợ.";
            }
            return "Bạn hiện không có khoản vay tiêu dùng nào đang hoạt động. Hạn mức khả dụng đăng ký mới lên tới 50.000.000 VND.";
        }

        // 4. Greetings & General conversation (hi, hello, chào, giúp, bạn là ai, etc.)
        if (lower.matches(".*(hi|hello|chào|xin chào|giúp|helo|alo|ơi|là ai|ai đó).*") || lower.length() <= 5) {
            StringBuilder reply = new StringBuilder();
            reply.append("Xin chào! Tôi là **PayGate AI Assistant** — trợ lý tài chính thông minh của bạn. ");
            if (!balanceStr.isEmpty()) {
                reply.append("Số dư hiện tại của bạn là **").append(balanceStr).append("**. ");
            }
            reply.append("Tôi có thể giúp bạn kiểm tra Hũ tiết kiệm, Khoản vay, Hóa đơn hoặc Chuyển tiền nhanh chóng!");
            return reply.toString();
        }

        StringBuilder defaultReply = new StringBuilder();
        defaultReply.append("Xin chào! Tôi đã nhận được yêu cầu của bạn. ");
        if (!balanceStr.isEmpty()) {
            defaultReply.append("Số dư ví PayGate của bạn hiện là **").append(balanceStr).append("**. ");
        }
        defaultReply.append("Bạn có thể bấm vào các nút gợi ý bên dưới để thực hiện giao dịch nhanh!");
        return defaultReply.toString();
    }

    private String extractLine(String text, String prefix) {
        for (String line : text.split("\n")) {
            if (line.contains(prefix)) return line;
        }
        return "";
    }
}
