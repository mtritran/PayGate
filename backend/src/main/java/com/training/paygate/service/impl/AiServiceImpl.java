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

import java.util.List;
import java.util.Map;
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

    private static final String SYSTEM_PROMPT =
            "You are PayGate AI Assistant, a professional financial assistant for the PayGate payment gateway platform. " +
            "Help users with money transfers, balance inquiries, transaction history, VietQR top-ups, and merchant payments. " +
            "Always respond in polite Vietnamese. Use markdown formatting where appropriate. " +
            "When the user asks to transfer money (e.g. 'Chuyển 200k cho PAY0000000004'), extract the amount and recipient from the message. " +
            "Keep responses concise and helpful.";

    @Override
    public AiChatResponse processChat(AiChatRequest request) {
        String prompt = request.getPrompt();
        log.info("Processing AI Chat prompt via OpenRouter model={}", model);

        String replyText = callOpenRouterApi(prompt);

        // Extract payment info from prompt to offer action button on frontend
        Long suggestedAmount = extractAmount(prompt);
        String suggestedRecipient = extractRecipient(prompt);

        return AiChatResponse.builder()
                .reply(replyText)
                .modelUsed(model)
                .suggestedAmount(suggestedAmount)
                .suggestedRecipient(suggestedRecipient)
                .build();
    }

    private String callOpenRouterApi(String prompt) {
        if (apiKey == null || apiKey.trim().isEmpty()) {
            throw new RuntimeException("OPENROUTER_API_KEY is not configured.");
        }

        RestTemplate restTemplate = new RestTemplate();

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("Authorization", "Bearer " + apiKey.trim());
        headers.set("HTTP-Referer", "https://paygate.dev");
        headers.set("X-Title", "PayGate Financial AI Assistant");

        Map<String, Object> body = Map.of(
                "model", model,
                "messages", List.of(
                        Map.of("role", "system", "content", SYSTEM_PROMPT),
                        Map.of("role", "user",   "content", prompt)
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
            return (unit.startsWith("tr") || unit.startsWith("tr")) && unit.length() > 1 ? num * 1_000_000 : num * 1_000;
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
