package com.training.paygate.controller;

import com.training.paygate.common.ApiResponse;
import com.training.paygate.dto.request.UpdateUserRequest;
import com.training.paygate.dto.response.UserResponse;
import com.training.paygate.entity.User;
import com.training.paygate.exception.ResourceNotFoundException;
import com.training.paygate.repository.UserRepository;
import com.training.paygate.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;

@RestController
@RequestMapping("/api/v1/profile")
@RequiredArgsConstructor
public class ProfileController {

    private final UserRepository userRepository;
    private final UserService userService;

    @GetMapping("/me")
    public ApiResponse<UserResponse> getMe(Principal principal) {
        User user = getCurrentUser(principal);
        return ApiResponse.success(userService.getById(user.getId()));
    }

    @PutMapping("/me")
    public ApiResponse<UserResponse> updateMe(
            Principal principal,
            @Valid @RequestBody UpdateUserRequest request
    ) {
        User user = getCurrentUser(principal);
        return ApiResponse.success("Profile updated", userService.update(user.getId(), request));
    }

    private User getCurrentUser(Principal principal) {
        return userRepository.findByUsername(principal.getName())
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + principal.getName()));
    }
}
