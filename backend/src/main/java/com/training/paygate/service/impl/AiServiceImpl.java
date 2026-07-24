package com.training.paygate.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.training.paygate.dto.request.AiChatRequest;
import com.training.paygate.dto.response.AiChatResponse;
import com.training.paygate.service.AiService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@Slf4j
@RequiredArgsConstructor
public class AiServiceImpl implements AiService {

    @Value("${openrouter.api-key:}")
    private String apiKey;

    @Value("${openrouter.model:meta-llama/llama-3.3-70b-instruct:free}")
    private String model;

    @Value("${openrouter.api-url:https://openrouter.ai/api/v1/chat/completions}")
    private String apiUrl;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public AiChatResponse processChat(AiChatRequest request) {
        String prompt = request.getPrompt();
        log.info("Processing AI Chat prompt: {}", prompt);

        // Extract payment transfer intent if present
        Long suggestedAmount = extractAmount(prompt);
        String suggestedRecipient = extractRecipient(prompt);

        String replyText = null;
        String modelUsed = model;

        if (apiKey != null && !apiKey.trim().isEmpty()) {
            try {
                replyText = callOpenRouterApi(prompt);
            } catch (Exception e) {
                log.error("Failed to call OpenRouter API: {}", e.getMessage());
            }
        }

        if (replyText == null || replyText.trim().isEmpty()) {
            modelUsed = "PayGate-Local-Intent-Engine";
            replyText = generateFallbackReply(prompt, suggestedAmount, suggestedRecipient);
        }

        return AiChatResponse.builder()
                .reply(replyText)
                .modelUsed(modelUsed)
                .suggestedAmount(suggestedAmount)
                .suggestedRecipient(suggestedRecipient)
                .build();
    }

    private String callOpenRouterApi(String prompt) throws Exception {
        RestTemplate restTemplate = new RestTemplate();

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("Authorization", "Bearer " + apiKey);
        headers.set("HTTP-Referer", "https://paygate.dev");
        headers.set("X-Title", "PayGate Financial AI Assistant");

        Map<String, Object> systemMsg = Map.of(
                "role", "system",
                "content", "You are PayGate AI Financial Assistant, an expert in banking, money transfer, VietQR, and personal finance management for the PayGate payment gateway platform. Respond in polite, helpful Vietnamese concise markdown."
        );

        Map<String, Object> userMsg = Map.of(
                "role", "user",
                "content", prompt
        );

        Map<String, Object> body = Map.of(
                "model", model,
                "messages", List.of(systemMsg, userMsg)
        );

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
        ResponseEntity<String> response = restTemplate.exchange(apiUrl, HttpMethod.POST, entity, String.class);

        if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
            JsonNode root = objectMapper.readTree(response.getBody());
            JsonNode choices = root.path("choices");
            if (choices.isArray() && !choices.isEmpty()) {
                return choices.get(0).path("message").path("content").asText();
            }
        }
        return null;
    }

    private String generateFallbackReply(String prompt, Long amount, String recipient) {
        String lower = prompt.toLowerCase();
        if (amount != null || recipient != null) {
            String amtStr = amount != null ? String.format("%,d ₫", amount) : "Chưa rõ số tiền";
            String recStr = recipient != null ? recipient : "Chưa rõ tài khoản";
            return String.format("Tôi đã nhận diện yêu cầu chuyển tiền:\n• Số tiền: **%s**\n• Người nhận: **%s**\n\nBấm nút bên dưới để tự động mở form chuyển tiền!", amtStr, recStr);
        }
        if (lower.contains("chi bao nhiêu") || lower.contains("tổng") || lower.contains("thống kê")) {
            return "Bạn có thể theo dõi thống kê số tiền và lịch sử giao dịch trực tiếp trên màn hình Dashboard PayGate.";
        }
        if (lower.contains("số dư") || lower.contains("ví")) {
            return "Số dư Ví PayGate của bạn được bảo mật và hiển thị trên màn hình trang chủ Console.";
        }
        return "Tôi là Trợ lý AI PayGate kết nối OpenRouter. Bạn có thể yêu cầu tôi chuyển tiền, tra cứu số dư hoặc tổng chi tiêu bất cứ lúc nào.";
    }

    private Long extractAmount(String text) {
        Pattern pattern = Pattern.compile("(\\d+)\\s*(k|kđ|tr|triệu|000)", Pattern.CASE_INSENSITIVE);
        Matcher matcher = pattern.matcher(text);
        if (matcher.find()) {
            long num = Long.parseLong(matcher.group(1));
            String unit = matcher.group(2).toLowerCase();
            if (unit.equals("k") || unit.equals("kđ") || unit.equals("000")) {
                return num * 1000;
            } else if (unit.equals("tr") || unit.equals("triệu")) {
                return num * 1000000;
            }
        }
        Pattern digitsPattern = Pattern.compile("(\\d{4,9})");
        Matcher digitsMatcher = digitsPattern.matcher(text);
        if (digitsMatcher.find()) {
            return Long.parseLong(digitsMatcher.group(1));
        }
        return null;
    }

    private String extractRecipient(String text) {
        Pattern payPattern = Pattern.compile("(PAY\\d{10})", Pattern.CASE_INSENSITIVE);
        Matcher payMatcher = payPattern.matcher(text);
        if (payMatcher.find()) {
            return payMatcher.group(1).toUpperCase();
        }
        Pattern phonePattern = Pattern.compile("(0\\d{9})");
        Matcher phoneMatcher = phonePattern.matcher(text);
        if (phoneMatcher.find()) {
            return phoneMatcher.group(1);
        }
        return null;
    }
}
