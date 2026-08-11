package com.training.paygate.service;

import com.training.paygate.dto.request.LoginRequest;
import com.training.paygate.dto.request.RefreshTokenRequest;
import com.training.paygate.dto.request.RegisterRequest;
import com.training.paygate.dto.response.AuthResponse;
import com.training.paygate.dto.response.UserResponse;

public interface AuthService {

    UserResponse register(RegisterRequest request);

    AuthResponse login(LoginRequest request);

    AuthResponse refreshToken(RefreshTokenRequest request);

    void logout(String accessToken, String refreshTokenStr);
}
