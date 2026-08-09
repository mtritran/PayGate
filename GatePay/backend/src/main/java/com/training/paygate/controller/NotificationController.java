package com.training.paygate.controller;

import com.training.paygate.common.ApiResponse;
import com.training.paygate.common.PageResponse;
import com.training.paygate.dto.response.NotificationResponse;
import com.training.paygate.security.CustomUserDetails;
import com.training.paygate.service.NotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
@Tag(name = "Notifications", description = "Endpoints for user real-time notifications history and read states")
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping("/latest")
    @Operation(summary = "Get the latest 20 notifications for the current user")
    public ApiResponse<List<NotificationResponse>> getLatestNotifications(@AuthenticationPrincipal CustomUserDetails currentUser) {
        List<NotificationResponse> list = notificationService.getLatestNotifications(currentUser.getId());
        return ApiResponse.success(list);
    }

    @GetMapping
    @Operation(summary = "Get paginated notifications for the current user")
    public ApiResponse<PageResponse<NotificationResponse>> getNotifications(@AuthenticationPrincipal CustomUserDetails currentUser, Pageable pageable) {
        Page<NotificationResponse> page = notificationService.getNotifications(currentUser.getId(), pageable);
        return ApiResponse.success(PageResponse.from(page, r -> r));
    }

    @GetMapping("/unread-count")
    @Operation(summary = "Get count of unread notifications for the current user")
    public ApiResponse<Long> getUnreadCount(@AuthenticationPrincipal CustomUserDetails currentUser) {
        long count = notificationService.getUnreadCount(currentUser.getId());
        return ApiResponse.success(count);
    }

    @PostMapping("/{id}/read")
    @Operation(summary = "Mark a single notification as read")
    public ApiResponse<Void> markAsRead(@PathVariable Long id, @AuthenticationPrincipal CustomUserDetails currentUser) {
        notificationService.markAsRead(id, currentUser.getId());
        return ApiResponse.success("Notification marked as read", null);
    }

    @PostMapping("/read-all")
    @Operation(summary = "Mark all notifications of the current user as read")
    public ApiResponse<Void> markAllAsRead(@AuthenticationPrincipal CustomUserDetails currentUser) {
        notificationService.markAllAsRead(currentUser.getId());
        return ApiResponse.success("All notifications marked as read", null);
    }
}
