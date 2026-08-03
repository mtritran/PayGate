package com.training.paygate.controller;

import com.training.paygate.common.ApiResponse;
import com.training.paygate.dto.request.LoginRequest;
import com.training.paygate.dto.request.RefreshTokenRequest;
import com.training.paygate.dto.request.RegisterRequest;
import com.training.paygate.dto.response.AuthResponse;
import com.training.paygate.dto.response.UserResponse;
import com.training.paygate.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Tag(name = "Authentication Management", description = "Endpoints for user registration, authentication login, and JWT token refreshing")
public class AuthController {

    private final AuthService authService;

    private static final long REFRESH_TOKEN_DURATION_SECONDS = 7 * 24 * 60 * 60; // 7 Days

    private void setRefreshTokenCookie(HttpServletResponse response, String refreshToken, long maxAgeSeconds) {
        ResponseCookie cookie = ResponseCookie.from("refreshToken", refreshToken != null ? refreshToken : "")
                .httpOnly(true)
                .secure(false) // Set true in production HTTPS environment
                .path("/")
                .maxAge(maxAgeSeconds)
                .sameSite("Lax")
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    @PostMapping("/register")
    @Operation(summary = "Register a new user", description = "Creates a new user account with default ROLE_USER.")
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Registration successful"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "Validation error or invalid request payload"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "409", description = "Username or email already exists")
    })
    public ApiResponse<UserResponse> register(@Valid @RequestBody RegisterRequest request) {
        UserResponse user = authService.register(request);
        return ApiResponse.success("Registration successful", user);
    }

    @PostMapping("/login")
    @Operation(summary = "Authenticate user and issue JWT token")
    @com.training.paygate.annotation.RateLimit(limit = 10, windowSeconds = 60, key = "login")
    public ApiResponse<AuthResponse> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletResponse response) {
        AuthResponse auth = authService.login(request);
        setRefreshTokenCookie(response, auth.refreshToken(), REFRESH_TOKEN_DURATION_SECONDS);
        return ApiResponse.success("Login successful", auth);
    }

    @PostMapping("/refresh")
    @Operation(summary = "Refresh access token using refresh token", description = "Generates a new JWT access token using a valid refresh token cookie or request payload.")
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Token refreshed successfully"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "Invalid or expired refresh token")
    })
    public ApiResponse<AuthResponse> refresh(
            @RequestBody(required = false) RefreshTokenRequest request,
            @CookieValue(name = "refreshToken", required = false) String refreshTokenFromCookie,
            HttpServletResponse response) {
        
        String tokenToUse = (refreshTokenFromCookie != null && !refreshTokenFromCookie.isBlank())
                ? refreshTokenFromCookie
                : (request != null ? request.refreshToken() : null);

        AuthResponse auth = authService.refreshToken(new RefreshTokenRequest(tokenToUse));
        setRefreshTokenCookie(response, auth.refreshToken(), REFRESH_TOKEN_DURATION_SECONDS);
        return ApiResponse.success("Token refreshed", auth);
    }

    @PostMapping("/logout")
    @Operation(summary = "Logout user", description = "Invalidates access token in Redis blacklist and clears refresh token cookie.")
    public ApiResponse<Void> logout(
            HttpServletRequest request,
            HttpServletResponse response,
            @CookieValue(name = "refreshToken", required = false) String refreshTokenFromCookie) {

        String authHeader = request.getHeader("Authorization");
        String accessToken = (authHeader != null && authHeader.startsWith("Bearer "))
                ? authHeader.substring(7)
                : null;

        authService.logout(accessToken, refreshTokenFromCookie);
        setRefreshTokenCookie(response, "", 0);

        return ApiResponse.success("Logged out successfully", null);
    }
}
