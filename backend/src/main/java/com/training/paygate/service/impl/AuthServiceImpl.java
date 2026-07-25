package com.training.paygate.service.impl;

import com.training.paygate.cache.RefreshTokenCacheService;
import com.training.paygate.dto.request.LoginRequest;
import com.training.paygate.dto.request.RefreshTokenRequest;
import com.training.paygate.dto.request.RegisterRequest;
import com.training.paygate.dto.response.AuthResponse;
import com.training.paygate.dto.response.UserResponse;
import com.training.paygate.entity.User;
import com.training.paygate.enums.OwnerType;
import com.training.paygate.enums.Role;
import com.training.paygate.exception.BadRequestException;
import com.training.paygate.exception.DuplicateResourceException;
import com.training.paygate.mapper.UserMapper;
import com.training.paygate.repository.UserRepository;
import com.training.paygate.security.JwtTokenProvider;
import com.training.paygate.service.AccountService;
import com.training.paygate.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final AuthenticationManager authenticationManager;
    private final AccountService accountService;
    private final RefreshTokenCacheService refreshTokenCacheService;
    private final UserMapper userMapper;

    @Value("${jwt.refresh-token-expiration}")
    private long refreshTokenExpiration;

    @Override
    @Transactional
    public UserResponse register(RegisterRequest request) {
        if (userRepository.existsByUsername(request.username())) {
            throw new DuplicateResourceException("User", "username", request.username());
        }
        if (userRepository.existsByEmail(request.email())) {
            throw new DuplicateResourceException("User", "email", request.email());
        }

        User user = User.builder()
                .username(request.username())
                .email(request.email())
                .password(passwordEncoder.encode(request.password()))
                .fullName(request.fullName())
                .role(Role.USER)
                .active(true)
                .build();

        userRepository.save(user);
        accountService.createAccount(user.getId(), OwnerType.USER);

        return userMapper.toResponse(user);
    }

    @Override
    public AuthResponse login(LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.username(), request.password()));

        String username = authentication.getName();
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new BadRequestException("User not found"));

        String accessToken = jwtTokenProvider.generateAccessToken(username);
        String refreshToken = jwtTokenProvider.generateRefreshToken(username);

        refreshTokenCacheService.saveRefreshToken(username, refreshToken, refreshTokenExpiration);

        return new AuthResponse(accessToken, refreshToken, username, user.getRole().name(), user.getId());
    }

    @Override
    public AuthResponse refreshToken(RefreshTokenRequest request) {
        String refreshTokenStr = request != null ? request.refreshToken() : null;
        if (refreshTokenStr == null || !jwtTokenProvider.isTokenValid(refreshTokenStr)) {
            throw new BadRequestException("Invalid refresh token");
        }

        String username = jwtTokenProvider.extractUsername(refreshTokenStr);

        // Kiểm tra xem Refresh Token có trùng khớp với token trong Redis không (Check Revocation)
        if (!refreshTokenCacheService.isRefreshTokenValid(username, refreshTokenStr)) {
            throw new BadRequestException("Refresh token has been revoked or replaced");
        }

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new BadRequestException("User not found"));

        String newAccessToken = jwtTokenProvider.generateAccessToken(username);
        String newRefreshToken = jwtTokenProvider.generateRefreshToken(username);

        // Rotation: Lưu Refresh Token mới vào Redis, tự động vô hiệu hóa token cũ
        refreshTokenCacheService.saveRefreshToken(username, newRefreshToken, refreshTokenExpiration);

        return new AuthResponse(newAccessToken, newRefreshToken, username, user.getRole().name(), user.getId());
    }
}
