package com.training.paygate.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.training.paygate.dto.request.PaymentRequest;
import com.training.paygate.dto.response.TransactionDetailResponse;
import com.training.paygate.dto.response.TransactionResponse;
import com.training.paygate.entity.User;
import com.training.paygate.enums.Role;
import com.training.paygate.repository.UserRepository;
import com.training.paygate.service.AccountService;
import com.training.paygate.service.TransactionService;
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
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(TransactionController.class)
@AutoConfigureMockMvc
class TransactionControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private com.training.paygate.security.JwtTokenProvider jwtTokenProvider;

    @MockBean
    private TransactionService transactionService;

    @MockBean
    private AccountService accountService;

    @MockBean
    private UserRepository userRepository;

    @Test
    @WithMockUser(username = "user1")
    void pay_success() throws Exception {
        // Given
        PaymentRequest request = new PaymentRequest("idem-key-123", 2L, BigDecimal.valueOf(100), "Pay description", null);
        TransactionResponse response = new TransactionResponse(
                "TXN-PAY-123", "COMPLETED", BigDecimal.valueOf(100), 1L, 2L, "PAYMENT", "Pay description", LocalDateTime.now()
        );

        when(transactionService.processPayment(any(PaymentRequest.class), eq("user1"))).thenReturn(response);

        // When & Then
        mockMvc.perform(post("/api/v1/transactions/pay")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.transactionRef").value("TXN-PAY-123"))
                .andExpect(jsonPath("$.data.status").value("COMPLETED"));
    }

    @Test
    @WithMockUser(username = "user1")
    void getTransactionByRef_success() throws Exception {
        // Given
        TransactionDetailResponse response = new TransactionDetailResponse(
                "TXN-PAY-123", "COMPLETED", BigDecimal.valueOf(100), 1L, 2L, "PAYMENT", "Pay description", LocalDateTime.now(), Collections.emptyList()
        );

        when(transactionService.getTransactionByRef(eq("TXN-PAY-123"), eq("user1"))).thenReturn(response);

        // When & Then
        mockMvc.perform(get("/api/v1/transactions/TXN-PAY-123")
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.transactionRef").value("TXN-PAY-123"));
    }

    @Test
    @WithMockUser(username = "admin", roles = {"ADMIN"})
    void getTransactions_asAdmin_success() throws Exception {
        // Given
        User adminUser = User.builder().username("admin").role(Role.ADMIN).build();
        TransactionResponse txResponse = new TransactionResponse(
                "TXN-PAY-123", "COMPLETED", BigDecimal.valueOf(100), 1L, 2L, "PAYMENT", "Pay description", LocalDateTime.now()
        );
        Page<TransactionResponse> page = new PageImpl<>(Collections.singletonList(txResponse));

        when(userRepository.findByUsername("admin")).thenReturn(Optional.of(adminUser));
        when(transactionService.getTransactions(
                eq(null), any(), any(), any(), any(), any(), any(Pageable.class)
        )).thenReturn(page);

        // When & Then
        mockMvc.perform(get("/api/v1/transactions")
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.content[0].transactionRef").value("TXN-PAY-123"));
    }

    @Test
    @WithMockUser(username = "user1")
    void refund_success() throws Exception {
        // Given
        TransactionResponse response = new TransactionResponse(
                "TXN-REFUND-123", "COMPLETED", BigDecimal.valueOf(100), 2L, 1L, "REFUND", "Refund for: TXN-PAY-123", LocalDateTime.now()
        );

        when(transactionService.refund(eq("TXN-PAY-123"), eq("user1"))).thenReturn(response);

        // When & Then
        mockMvc.perform(post("/api/v1/transactions/TXN-PAY-123/refund")
                        .with(csrf()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.transactionRef").value("TXN-REFUND-123"))
                .andExpect(jsonPath("$.data.type").value("REFUND"));
    }
}
