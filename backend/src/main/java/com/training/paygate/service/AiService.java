package com.training.paygate.service;

import com.training.paygate.dto.request.AiChatRequest;
import com.training.paygate.dto.response.AiChatResponse;

public interface AiService {
    AiChatResponse processChat(AiChatRequest request);
}
