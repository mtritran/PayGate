package com.training.paygate.controller;

import com.training.paygate.dto.request.AiChatRequest;
import com.training.paygate.dto.response.AiChatResponse;
import com.training.paygate.common.ApiResponse;
import com.training.paygate.service.AiService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/ai")
@RequiredArgsConstructor
public class AiController {

    private final AiService aiService;

    @PostMapping("/chat")
    public ResponseEntity<ApiResponse<AiChatResponse>> chat(@Valid @RequestBody AiChatRequest request) {
        AiChatResponse response = aiService.processChat(request);
        return ResponseEntity.ok(ApiResponse.success("AI response processed successfully", response));
    }
}
