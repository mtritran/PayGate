package com.training.paygate.controller;

import com.training.paygate.dto.request.AiChatRequest;
import com.training.paygate.dto.response.AiChatResponse;
import com.training.paygate.common.ApiResponse;
import com.training.paygate.service.AiService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;

@RestController
@RequestMapping("/api/v1/ai")
@RequiredArgsConstructor
public class AiController {

    private final AiService aiService;

    @PostMapping("/chat")
    public ResponseEntity<ApiResponse<AiChatResponse>> chat(
            @Valid @RequestBody AiChatRequest request,
            Principal principal) {
        String username = principal != null ? principal.getName() : null;
        AiChatResponse response = aiService.processChat(request, username);
        return ResponseEntity.ok(ApiResponse.success("AI response processed successfully", response));
    }
}
