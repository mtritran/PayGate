package com.training.paygate.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.training.paygate.dto.request.LoginRequest;
import com.training.paygate.dto.request.RegisterRequest;
import com.training.paygate.dto.response.AuthResponse;
import com.training.paygate.exception.DuplicateResourceException;
import com.training.paygate.security.JwtTokenProvider;
import com.training.paygate.security.SecurityConfig;
import com.training.paygate.service.AuthService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AuthController.class)
@Import(SecurityConfig.class)
@AutoConfigureMockMvc
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private JwtTokenProvider jwtTokenProvider;

    @MockBean
    private AuthService authService;

    @MockBean
    private UserDetailsService userDetailsService;

    // ==========================================
    // UC-U01: Đăng ký User mới (POST /api/v1/auth/register)
    // ==========================================

    @Test
    @DisplayName("UC-U01: Register - Thành công: Đăng ký user_vinh với email, password đầy đủ -> HTTP 200 OK")
    void register_success() throws Exception {
        RegisterRequest request = new RegisterRequest("user_vinh", "vinh@test.com", "Password@123", "Vinh User");
        AuthResponse response = new AuthResponse("access-token", "refresh-token", "user_vinh", "USER");

        when(authService.register(any(RegisterRequest.class))).thenReturn(response);

        mockMvc.perform(post("/api/v1/auth/register")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.username").value("user_vinh"))
                .andExpect(jsonPath("$.data.role").value("USER"))
                .andExpect(jsonPath("$.data.accessToken").value("access-token"));
    }

    @Test
    @DisplayName("UC-U01: Register - Thất bại: Username đã tồn tại -> HTTP 409 Conflict")
    void register_duplicateUsername_returnsConflict() throws Exception {
        RegisterRequest request = new RegisterRequest("user_vinh", "vinh@test.com", "Password@123", "Vinh User");

        when(authService.register(any(RegisterRequest.class)))
                .thenThrow(new DuplicateResourceException("User", "username", "user_vinh"));

        mockMvc.perform(post("/api/v1/auth/register")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("User already exists with username: user_vinh"));
    }

    @Test
    @DisplayName("UC-U01: Register - Thất bại: Email đã tồn tại -> HTTP 409 Conflict")
    void register_duplicateEmail_returnsConflict() throws Exception {
        RegisterRequest request = new RegisterRequest("user_vinh2", "vinh@test.com", "Password@123", "Vinh User");

        when(authService.register(any(RegisterRequest.class)))
                .thenThrow(new DuplicateResourceException("User", "email", "vinh@test.com"));

        mockMvc.perform(post("/api/v1/auth/register")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("User already exists with email: vinh@test.com"));
    }

    @Test
    @DisplayName("UC-U01: Register - Thất bại: Thiếu username -> HTTP 400 Bad Request")
    void register_missingUsername_returnsBadRequest() throws Exception {
        RegisterRequest request = new RegisterRequest("", "vinh@test.com", "Password@123", "Vinh User");

        mockMvc.perform(post("/api/v1/auth/register")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.data.username").exists());
    }

    @Test
    @DisplayName("UC-U01: Register - Thất bại: Email sai định dạng -> HTTP 400 Bad Request")
    void register_invalidEmail_returnsBadRequest() throws Exception {
        RegisterRequest request = new RegisterRequest("user_vinh", "invalid-email", "Password@123", "Vinh User");

        mockMvc.perform(post("/api/v1/auth/register")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.data.email").exists());
    }

    // ==========================================
    // UC-U02: Đăng nhập User (POST /api/v1/auth/login)
    // ==========================================

    @Test
    @DisplayName("UC-U02: Login - Thành công: Đăng nhập user_vinh đúng credentials -> HTTP 200 OK, có token, role")
    void login_success() throws Exception {
        LoginRequest request = new LoginRequest("user_vinh", "Password@123");
        AuthResponse response = new AuthResponse("access-token", "refresh-token", "user_vinh", "USER");

        when(authService.login(any(LoginRequest.class))).thenReturn(response);

        mockMvc.perform(post("/api/v1/auth/login")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.username").value("user_vinh"))
                .andExpect(jsonPath("$.data.role").value("USER"))
                .andExpect(jsonPath("$.data.accessToken").value("access-token"))
                .andExpect(jsonPath("$.data.refreshToken").value("refresh-token"));
    }

    @Test
    @DisplayName("UC-U02: Login - Thất bại: Sai password -> HTTP 401 Unauthorized")
    void login_wrongPassword_returnsUnauthorized() throws Exception {
        LoginRequest request = new LoginRequest("user_vinh", "WrongPassword");

        when(authService.login(any(LoginRequest.class)))
                .thenThrow(new org.springframework.security.authentication.BadCredentialsException("Invalid username or password"));

        mockMvc.perform(post("/api/v1/auth/login")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Invalid username or password"));
    }

    @Test
    @DisplayName("UC-U02: Login - Thất bại: User không tồn tại -> HTTP 401 Unauthorized")
    void login_nonexistentUser_returnsUnauthorized() throws Exception {
        LoginRequest request = new LoginRequest("nonexistent_user", "Password@123");

        when(authService.login(any(LoginRequest.class)))
                .thenThrow(new org.springframework.security.authentication.BadCredentialsException("Invalid username or password"));

        mockMvc.perform(post("/api/v1/auth/login")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false));
    }
}