package com.training.paygate.service;

import com.training.paygate.dto.response.NotificationResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface NotificationService {
    NotificationResponse createNotification(Long userId, String title, String message, String type);
    List<NotificationResponse> getLatestNotifications(Long userId);
    Page<NotificationResponse> getNotifications(Long userId, Pageable pageable);
    long getUnreadCount(Long userId);
    void markAsRead(Long notificationId, Long userId);
    void markAllAsRead(Long userId);
}
