package com.training.paygate.websocket;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.training.paygate.dto.response.NotificationResponse;
import com.training.paygate.entity.User;
import com.training.paygate.repository.UserRepository;
import com.training.paygate.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.net.URI;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@Component
@RequiredArgsConstructor
@Slf4j
public class NotificationWebSocketHandler extends TextWebSocketHandler {

    private final JwtTokenProvider jwtTokenProvider;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    // Map of userId to a list of active WebSocket sessions (supporting multi-tab login)
    private final Map<Long, List<WebSocketSession>> userSessions = new ConcurrentHashMap<>();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        String token = getQueryParam(session.getUri(), "token");
        if (token == null || !jwtTokenProvider.isTokenValid(token)) {
            log.warn("[WEBSOCKET] Connection rejected due to invalid token from session: {}", session.getId());
            session.close(CloseStatus.POLICY_VIOLATION);
            return;
        }

        String username = jwtTokenProvider.extractUsername(token);
        User user = userRepository.findByUsername(username).orElse(null);
        if (user == null) {
            log.warn("[WEBSOCKET] User not found for username: {}. Closing connection.", username);
            session.close(CloseStatus.POLICY_VIOLATION);
            return;
        }

        Long userId = user.getId();
        session.getAttributes().put("userId", userId);

        userSessions.computeIfAbsent(userId, k -> new CopyOnWriteArrayList<>()).add(session);
        log.info("[WEBSOCKET] Session established for user ID {}: {} (Active sessions count: {})",
                userId, session.getId(), userSessions.get(userId).size());

        // Send an initial ping or acknowledgement
        session.sendMessage(new TextMessage("{\"event\":\"CONNECTED\"}"));
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        Long userId = (Long) session.getAttributes().get("userId");
        if (userId != null) {
            List<WebSocketSession> sessions = userSessions.get(userId);
            if (sessions != null) {
                sessions.remove(session);
                if (sessions.isEmpty()) {
                    userSessions.remove(userId);
                }
                log.info("[WEBSOCKET] Session closed for user ID {}: {} (Remaining sessions: {})",
                        userId, session.getId(), sessions == null ? 0 : sessions.size());
            }
        }
    }

    public void sendNotification(Long userId, NotificationResponse notification) {
        List<WebSocketSession> sessions = userSessions.get(userId);
        if (sessions == null || sessions.isEmpty()) {
            log.debug("[WEBSOCKET] No active sessions for user ID {}. Notification saved to DB only.", userId);
            return;
        }

        try {
            String payload = objectMapper.writeValueAsString(Map.of(
                    "event", "NEW_NOTIFICATION",
                    "data", notification
            ));
            TextMessage message = new TextMessage(payload);

            for (WebSocketSession session : sessions) {
                if (session.isOpen()) {
                    try {
                        session.sendMessage(message);
                        log.info("[WEBSOCKET] Sent notification to user ID {} on session {}", userId, session.getId());
                    } catch (IOException e) {
                        log.error("[WEBSOCKET] Error sending message to session {}: {}", session.getId(), e.getMessage());
                    }
                }
            }
        } catch (Exception e) {
            log.error("[WEBSOCKET] Failed to serialize notification: {}", e.getMessage());
        }
    }

    private String getQueryParam(URI uri, String paramName) {
        if (uri == null || uri.getQuery() == null) {
            return null;
        }
        String[] pairs = uri.getQuery().split("&");
        for (String pair : pairs) {
            int idx = pair.indexOf("=");
            if (idx > 0 && pair.substring(0, idx).equals(paramName)) {
                return pair.substring(idx + 1);
            }
        }
        return null;
    }
}
