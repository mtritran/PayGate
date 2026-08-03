package com.training.paygate.controller;

import com.training.paygate.common.ApiResponse;
import com.training.paygate.common.PageResponse;
import com.training.paygate.dto.response.NotificationResponse;
import com.training.paygate.entity.User;
import com.training.paygate.exception.ResourceNotFoundException;
import com.training.paygate.repository.UserRepository;
import com.training.paygate.service.NotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
@Tag(name = "Notifications", description = "Endpoints for user real-time notifications history and read states")
public class NotificationController {

    private final NotificationService notificationService;
    private final UserRepository userRepository;

    @GetMapping("/latest")
    @Operation(summary = "Get the latest 20 notifications for the current user")
    public ApiResponse<List<NotificationResponse>> getLatestNotifications(Principal principal) {
        User user = getUser(principal);
        List<NotificationResponse> list = notificationService.getLatestNotifications(user.getId());
        return ApiResponse.success(list);
    }

    @GetMapping
    @Operation(summary = "Get paginated notifications for the current user")
    public ApiResponse<PageResponse<NotificationResponse>> getNotifications(Principal principal, Pageable pageable) {
        User user = getUser(principal);
        Page<NotificationResponse> page = notificationService.getNotifications(user.getId(), pageable);
        return ApiResponse.success(PageResponse.from(page, r -> r));
    }

    @GetMapping("/unread-count")
    @Operation(summary = "Get count of unread notifications for the current user")
    public ApiResponse<Long> getUnreadCount(Principal principal) {
        User user = getUser(principal);
        long count = notificationService.getUnreadCount(user.getId());
        return ApiResponse.success(count);
    }

    @PostMapping("/{id}/read")
    @Operation(summary = "Mark a single notification as read")
    public ApiResponse<Void> markAsRead(@PathVariable Long id, Principal principal) {
        User user = getUser(principal);
        notificationService.markAsRead(id, user.getId());
        return ApiResponse.success("Notification marked as read", null);
    }

    @PostMapping("/read-all")
    @Operation(summary = "Mark all notifications of the current user as read")
    public ApiResponse<Void> markAllAsRead(Principal principal) {
        User user = getUser(principal);
        notificationService.markAllAsRead(user.getId());
        return ApiResponse.success("All notifications marked as read", null);
    }

    private User getUser(Principal principal) {
        return userRepository.findByUsername(principal.getName())
                .orElseThrow(() -> new ResourceNotFoundException("User not found with username: " + principal.getName()));
    }
}
