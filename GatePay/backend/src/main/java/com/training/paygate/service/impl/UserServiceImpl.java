package com.training.paygate.service.impl;

import com.training.paygate.dto.request.CreateUserRequest;
import com.training.paygate.dto.request.UpdateUserRequest;
import com.training.paygate.dto.response.UserResponse;
import com.training.paygate.entity.User;
import com.training.paygate.enums.Role;
import com.training.paygate.exception.DuplicateResourceException;
import com.training.paygate.exception.ResourceNotFoundException;
import com.training.paygate.mapper.UserMapper;
import com.training.paygate.repository.UserRepository;
import com.training.paygate.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional(readOnly = true)
    public Page<UserResponse> getAll(Pageable pageable) {
        return userRepository.findAll(pageable).map(userMapper::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public UserResponse getById(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", id));
        return userMapper.toResponse(user);
    }

    @Override
    @Transactional
    public UserResponse create(CreateUserRequest request) {
        if (userRepository.existsByUsername(request.username())) {
            throw new DuplicateResourceException("User", "username", request.username());
        }
        if (userRepository.existsByEmail(request.email())) {
            throw new DuplicateResourceException("User", "email", request.email());
        }

        User user = userMapper.toEntity(request);
        user.setPassword(passwordEncoder.encode(request.password()));
        user.setRole(Role.USER);
        user.setActive(true);

        return userMapper.toResponse(userRepository.save(user));
    }

    @Override
    @Transactional
    public UserResponse update(Long id, UpdateUserRequest request) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", id));

        if (request.email() != null && !request.email().equals(user.getEmail())
                && userRepository.existsByEmail(request.email())) {
            throw new DuplicateResourceException("User", "email", request.email());
        }

        userMapper.updateEntity(user, request);
        return userMapper.toResponse(userRepository.save(user));
    }

    @Override
    @Transactional
    public void delete(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", id));
        userRepository.delete(user);
    }

    @Override
    @Transactional
    public void setupPin(Long userId, com.training.paygate.dto.request.PinSetupRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));

        if (user.isPinEnabled() && user.getPinCode() != null) {
            if (request.oldPin() == null || !passwordEncoder.matches(request.oldPin(), user.getPinCode())) {
                throw new com.training.paygate.exception.BadRequestException("Mã PIN hiện tại không chính xác");
            }
        }

        user.setPinCode(passwordEncoder.encode(request.newPin()));
        user.setPinEnabled(true);
        userRepository.save(user);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean verifyPin(Long userId, String pin) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));

        if (!user.isPinEnabled() || user.getPinCode() == null) {
            throw new com.training.paygate.exception.BadRequestException("Bạn chưa thiết lập Mã PIN giao dịch");
        }

        return passwordEncoder.matches(pin, user.getPinCode());
    }

    @Override
    @Transactional(readOnly = true)
    public com.training.paygate.dto.response.PinStatusResponse getPinStatus(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));

        boolean hasPin = user.getPinCode() != null && !user.getPinCode().isBlank();
        return new com.training.paygate.dto.response.PinStatusResponse(hasPin, user.isPinEnabled());
    }
}
