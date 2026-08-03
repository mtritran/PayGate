package com.training.paygate.service;

import com.training.paygate.dto.request.CreateUserRequest;
import com.training.paygate.dto.request.UpdateUserRequest;
import com.training.paygate.dto.response.UserResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface UserService {

    Page<UserResponse> getAll(Pageable pageable);

    UserResponse getById(Long id);

    UserResponse create(CreateUserRequest request);

    UserResponse update(Long id, UpdateUserRequest request);

    void delete(Long id);

    void setupPin(Long userId, com.training.paygate.dto.request.PinSetupRequest request);

    boolean verifyPin(Long userId, String pin);

    com.training.paygate.dto.response.PinStatusResponse getPinStatus(Long userId);
}
