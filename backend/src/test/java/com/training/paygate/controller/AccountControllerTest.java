package com.training.paygate.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.training.paygate.cache.BalanceCacheService;
import com.training.paygate.dto.request.TopUpRequest;
import com.training.paygate.dto.response.AccountResponse;
import com.training.paygate.dto.response.TransactionResponse;
import com.training.paygate.exception.BadRequestException;
import com.training.paygate.exception.ResourceNotFoundException;
import com.training.paygate.security.JwtTokenProvider;
import com.training.paygate.service.AccountService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collections;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AccountController.class)
@AutoConfigureMockMvc
class AccountControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private JwtTokenProvider jwtTokenProvider;

    @MockBean
    private AccountService accountService;

    @MockBean
    private BalanceCacheService balanceCacheService;

    // ==========================================
    // 1. GET /api/v1/accounts/me
    // ==========================================

    @Test
    @DisplayName("GET /me - Thành công: Trả về thông tin ví của user đang đăng nhập")
    @WithMockUser(username = "user1")
    void getMyAccount_success() throws Exception {
        AccountResponse response = new AccountResponse(
                1L, 10L, "USER", "AC00000001", BigDecimal.valueOf(500000), "VND", "ACTIVE", LocalDateTime.now(), LocalDateTime.now()
        );

        when(accountService.getAccountByUsername("user1")).thenReturn(response);

        mockMvc.perform(get("/api/v1/accounts/me").with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.accountNumber").value("AC00000001"))
                .andExpect(jsonPath("$.data.balance").value(500000))
                .andExpect(jsonPath("$.data.status").value("ACTIVE"));
    }

    @Test
    @DisplayName("GET /me - Thất bại: Chưa đăng nhập (Không có token) -> Trả về HTTP 401 Unauthorized")
    void getMyAccount_unauthenticated_returnsUnauthorized() throws Exception {
        mockMvc.perform(get("/api/v1/accounts/me"))
                .andExpect(status().isUnauthorized());
    }

    // ==========================================
    // 2. GET /api/v1/accounts/{id}/balance
    // ==========================================

    @Test
    @DisplayName("GET /{id}/balance - Thành công khi Cache Miss: Đọc từ DB & cache lại")
    @WithMockUser(username = "user1")
    void getBalance_cacheMiss_success() throws Exception {
        Long accountId = 1L;
        AccountResponse response = new AccountResponse(
                1L, 10L, "USER", "AC00000001", BigDecimal.valueOf(500000), "VND", "ACTIVE", LocalDateTime.now(), LocalDateTime.now()
        );

        when(balanceCacheService.getBalance(accountId)).thenReturn(null); // Cache miss
        when(accountService.getBalanceChecked(accountId, "user1")).thenReturn(response);

        mockMvc.perform(get("/api/v1/accounts/1/balance").with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.accountId").value(1))
                .andExpect(jsonPath("$.data.balance").value(500000));
    }

    @Test
    @DisplayName("GET /{id}/balance - Thành công khi Cache Hit: Đọc trực tiếp từ Redis Cache")
    @WithMockUser(username = "user1")
    void getBalance_cacheHit_success() throws Exception {
        Long accountId = 1L;
        AccountResponse response = new AccountResponse(
                1L, 10L, "USER", "AC00000001", BigDecimal.valueOf(500000), "VND", "ACTIVE", LocalDateTime.now(), LocalDateTime.now()
        );

        when(balanceCacheService.getBalance(accountId)).thenReturn(BigDecimal.valueOf(500000)); // Cache hit
        when(accountService.getBalanceChecked(accountId, "user1")).thenReturn(response);

        mockMvc.perform(get("/api/v1/accounts/1/balance").with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.balance").value(500000));
    }

    @Test
    @DisplayName("GET /{id}/balance - Thất bại: Không chính chủ (User xem ví người khác) -> HTTP 403 Forbidden")
    @WithMockUser(username = "user1")
    void getBalance_accessDenied_returnsForbidden() throws Exception {
        Long otherAccountId = 99L;
        when(balanceCacheService.getBalance(otherAccountId)).thenReturn(null);
        when(accountService.getBalanceChecked(otherAccountId, "user1"))
                .thenThrow(new AccessDeniedException("Access denied - You do not own this account"));

        mockMvc.perform(get("/api/v1/accounts/99/balance").with(csrf()))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("GET /{id}/balance - Thất bại: ID tài khoản không tồn tại -> HTTP 404 Not Found")
    @WithMockUser(username = "admin", roles = {"ADMIN"})
    void getBalance_accountNotFound_returnsNotFound() throws Exception {
        Long nonExistentId = 9999L;
        when(balanceCacheService.getBalance(nonExistentId)).thenReturn(null);
        when(accountService.getBalanceChecked(nonExistentId, "admin"))
                .thenThrow(new ResourceNotFoundException("Account not found with ID: 9999"));

        mockMvc.perform(get("/api/v1/accounts/9999/balance").with(csrf()))
                .andExpect(status().isNotFound());
    }

    // ==========================================
    // 3. POST /api/v1/accounts/topup
    // ==========================================

    @Test
    @DisplayName("POST /topup - Thành công: Nạp tiền hợp lệ 200,000 VND -> HTTP 201 Created")
    @WithMockUser(username = "user1")
    void topUp_success() throws Exception {
        TopUpRequest request = new TopUpRequest(BigDecimal.valueOf(200000), "Topup demo");
        AccountResponse userAccount = new AccountResponse(
                1L, 10L, "USER", "AC00000001", BigDecimal.valueOf(500000), "VND", "ACTIVE", LocalDateTime.now(), LocalDateTime.now()
        );
        TransactionResponse txResponse = new TransactionResponse(
                "TXN-TOPUP-999", "COMPLETED", BigDecimal.valueOf(200000), 99L, 1L, "TOPUP", "Topup demo", LocalDateTime.now()
        );

        when(accountService.getAccountByUsername("user1")).thenReturn(userAccount);
        when(accountService.topUp(eq(1L), eq(BigDecimal.valueOf(200000)), eq("Topup demo"))).thenReturn(txResponse);

        mockMvc.perform(post("/api/v1/accounts/topup")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.transactionRef").value("TXN-TOPUP-999"))
                .andExpect(jsonPath("$.data.type").value("TOPUP"));
    }

    @Test
    @DisplayName("POST /topup - Thất bại: Số tiền nạp nhỏ hơn hạn mức tối thiểu (5,000 VND < 10,000 VND) -> HTTP 400 Bad Request")
    @WithMockUser(username = "user1")
    void topUp_amountBelowMinimum_returnsBadRequest() throws Exception {
        TopUpRequest request = new TopUpRequest(BigDecimal.valueOf(5000), "Topup below limit");
        AccountResponse userAccount = new AccountResponse(
                1L, 10L, "USER", "AC00000001", BigDecimal.valueOf(500000), "VND", "ACTIVE", LocalDateTime.now(), LocalDateTime.now()
        );

        when(accountService.getAccountByUsername("user1")).thenReturn(userAccount);
        when(accountService.topUp(eq(1L), eq(BigDecimal.valueOf(5000)), any()))
                .thenThrow(new BadRequestException("Top up amount must be at least 10,000 VND"));

        mockMvc.perform(post("/api/v1/accounts/topup")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("POST /topup - Thất bại: Nạp tiền vào tài khoản bị khóa -> HTTP 400 Bad Request")
    @WithMockUser(username = "user1")
    void topUp_frozenAccount_returnsBadRequest() throws Exception {
        TopUpRequest request = new TopUpRequest(BigDecimal.valueOf(100000), "Topup frozen account");
        AccountResponse userAccount = new AccountResponse(
                1L, 10L, "USER", "AC00000001", BigDecimal.valueOf(500000), "VND", "FROZEN", LocalDateTime.now(), LocalDateTime.now()
        );

        when(accountService.getAccountByUsername("user1")).thenReturn(userAccount);
        when(accountService.topUp(eq(1L), any(), any()))
                .thenThrow(new BadRequestException("Cannot top up to an inactive or frozen account"));

        mockMvc.perform(post("/api/v1/accounts/topup")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    // ==========================================
    // 4. GET /api/v1/accounts/{id}/history
    // ==========================================

    @Test
    @DisplayName("GET /{id}/history - Thành công: Lấy danh sách lịch sử giao dịch phân trang -> HTTP 200 OK")
    @WithMockUser(username = "user1")
    void getHistory_success() throws Exception {
        TransactionResponse txResponse = new TransactionResponse(
                "TXN-PAY-123", "COMPLETED", BigDecimal.valueOf(100000), 1L, 2L, "PAYMENT", "Payment demo", LocalDateTime.now()
        );
        Page<TransactionResponse> page = new PageImpl<>(Collections.singletonList(txResponse));

        when(accountService.getAccountHistory(eq(1L), eq("user1"), any(Pageable.class))).thenReturn(page);

        mockMvc.perform(get("/api/v1/accounts/1/history").with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.content[0].transactionRef").value("TXN-PAY-123"));
    }

    @Test
    @DisplayName("GET /{id}/history - Thất bại: Không chính chủ -> HTTP 403 Forbidden")
    @WithMockUser(username = "user1")
    void getHistory_accessDenied_returnsForbidden() throws Exception {
        when(accountService.getAccountHistory(eq(99L), eq("user1"), any(Pageable.class)))
                .thenThrow(new AccessDeniedException("Access denied - You do not own this account"));

        mockMvc.perform(get("/api/v1/accounts/99/history").with(csrf()))
                .andExpect(status().isForbidden());
    }
}
