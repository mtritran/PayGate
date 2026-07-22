package com.training.paygate.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.training.paygate.cache.BalanceCacheService;
import com.training.paygate.dto.request.TopUpRequest;
import com.training.paygate.dto.response.AccountResponse;
import com.training.paygate.dto.response.TransactionResponse;
import com.training.paygate.service.AccountService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
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
    private com.training.paygate.security.JwtTokenProvider jwtTokenProvider;

    @MockBean
    private AccountService accountService;

    @MockBean
    private BalanceCacheService balanceCacheService;

    @Test
    @WithMockUser(username = "user1")
    void getMyAccount_success() throws Exception {
        // Given
        AccountResponse response = new AccountResponse(
                1L, 10L, "USER", "AC00000001", BigDecimal.valueOf(500000), "VND", "ACTIVE", LocalDateTime.now(), LocalDateTime.now()
        );

        when(accountService.getAccountByUsername("user1")).thenReturn(response);

        // When & Then
        mockMvc.perform(get("/api/v1/accounts/me")
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.accountNumber").value("AC00000001"))
                .andExpect(jsonPath("$.data.balance").value(500000));
    }

    @Test
    @WithMockUser(username = "user1")
    void getBalance_cacheMiss_success() throws Exception {
        // Given
        Long accountId = 1L;
        AccountResponse response = new AccountResponse(
                1L, 10L, "USER", "AC00000001", BigDecimal.valueOf(500000), "VND", "ACTIVE", LocalDateTime.now(), LocalDateTime.now()
        );

        when(balanceCacheService.getBalance(accountId)).thenReturn(null); // Cache miss
        when(accountService.getBalanceChecked(accountId, "user1")).thenReturn(response);

        // When & Then
        mockMvc.perform(get("/api/v1/accounts/1/balance")
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.accountId").value(1))
                .andExpect(jsonPath("$.data.balance").value(500000));
    }

    @Test
    @WithMockUser(username = "user1")
    void topUp_success() throws Exception {
        // Given
        TopUpRequest request = new TopUpRequest(BigDecimal.valueOf(200000), "Topup demo");
        AccountResponse userAccount = new AccountResponse(
                1L, 10L, "USER", "AC00000001", BigDecimal.valueOf(500000), "VND", "ACTIVE", LocalDateTime.now(), LocalDateTime.now()
        );
        TransactionResponse txResponse = new TransactionResponse(
                "TXN-TOPUP-999", "COMPLETED", BigDecimal.valueOf(200000), 99L, 1L, "TOPUP", "Topup demo", LocalDateTime.now()
        );

        when(accountService.getAccountByUsername("user1")).thenReturn(userAccount);
        when(accountService.topUp(eq(1L), eq(BigDecimal.valueOf(200000)), eq("Topup demo"))).thenReturn(txResponse);

        // When & Then
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
    @WithMockUser(username = "user1")
    void getHistory_success() throws Exception {
        // Given
        TransactionResponse txResponse = new TransactionResponse(
                "TXN-PAY-123", "COMPLETED", BigDecimal.valueOf(100000), 1L, 2L, "PAYMENT", "Payment demo", LocalDateTime.now()
        );
        Page<TransactionResponse> page = new PageImpl<>(Collections.singletonList(txResponse));

        when(accountService.getAccountHistory(eq(1L), eq("user1"), any(Pageable.class))).thenReturn(page);

        // When & Then
        mockMvc.perform(get("/api/v1/accounts/1/history")
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.content[0].transactionRef").value("TXN-PAY-123"));
    }
}
