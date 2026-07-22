package com.training.paygate.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.training.paygate.dto.request.PaymentRequest;
import com.training.paygate.dto.response.AccountResponse;
import com.training.paygate.dto.response.TransactionDetailResponse;
import com.training.paygate.dto.response.TransactionResponse;
import com.training.paygate.entity.User;
import com.training.paygate.enums.Role;
import com.training.paygate.exception.BadRequestException;
import com.training.paygate.exception.InsufficientBalanceException;
import com.training.paygate.exception.ResourceNotFoundException;
import com.training.paygate.repository.UserRepository;
import com.training.paygate.security.JwtTokenProvider;
import com.training.paygate.security.SecurityConfig;
import com.training.paygate.service.AccountService;
import com.training.paygate.service.TransactionService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(TransactionController.class)
@Import(SecurityConfig.class)
@AutoConfigureMockMvc
class TransactionControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private JwtTokenProvider jwtTokenProvider;

    @MockBean
    private UserDetailsService userDetailsService;

    @MockBean
    private TransactionService transactionService;

    @MockBean
    private AccountService accountService;

    @MockBean
    private UserRepository userRepository;

    // ==========================================
    // 1. POST /api/v1/transactions/pay
    // ==========================================

    @Test
    @DisplayName("POST /pay - Thành công: Chuyển tiền 100,000 VND hợp lệ -> HTTP 201 Created")
    @WithMockUser(username = "user1", roles = {"USER"})
    void pay_success() throws Exception {
        PaymentRequest request = new PaymentRequest("idem-key-123", 2L, BigDecimal.valueOf(100000), "Pay description", null);
        TransactionResponse response = new TransactionResponse(
                "TXN-PAY-123", "COMPLETED", BigDecimal.valueOf(100000), 1L, 2L, "PAYMENT", "Pay description", LocalDateTime.now()
        );

        when(transactionService.processPayment(any(PaymentRequest.class), eq("user1"))).thenReturn(response);

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
    @DisplayName("POST /pay - Thất bại: Số dư ví không đủ -> HTTP 422 Unprocessable Entity")
    @WithMockUser(username = "user1", roles = {"USER"})
    void pay_insufficientBalance_returnsUnprocessableEntity() throws Exception {
        PaymentRequest request = new PaymentRequest("idem-key-999", 2L, BigDecimal.valueOf(100000000), "Big payment", null);

        when(transactionService.processPayment(any(PaymentRequest.class), eq("user1")))
                .thenThrow(new InsufficientBalanceException("Account balance insufficient for payment"));

        mockMvc.perform(post("/api/v1/transactions/pay")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("POST /pay - Thất bại: Số tiền gửi bị âm (-50,000 VND) -> HTTP 400 Bad Request Validation Error")
    @WithMockUser(username = "user1", roles = {"USER"})
    void pay_negativeAmount_returnsBadRequest() throws Exception {
        PaymentRequest request = new PaymentRequest("idem-key-123", 2L, BigDecimal.valueOf(-50000), "Negative amount", null);

        mockMvc.perform(post("/api/v1/transactions/pay")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("POST /pay - Thất bại: Ví nguồn bị khóa (FROZEN/INACTIVE) -> HTTP 400 Bad Request")
    @WithMockUser(username = "user1", roles = {"USER"})
    void pay_inactiveSourceAccount_returnsBadRequest() throws Exception {
        PaymentRequest request = new PaymentRequest("idem-key-frozen", 2L, BigDecimal.valueOf(100000), "Pay from frozen", null);

        when(transactionService.processPayment(any(PaymentRequest.class), eq("user1")))
                .thenThrow(new BadRequestException("Source account is inactive or frozen"));

        mockMvc.perform(post("/api/v1/transactions/pay")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    // ==========================================
    // 2. GET /api/v1/transactions/{ref}
    // ==========================================

    @Test
    @DisplayName("GET /{ref} - Thành công: Lấy chi tiết giao dịch kèm 2 bút toán sổ cái -> HTTP 200 OK")
    @WithMockUser(username = "user1", roles = {"USER"})
    void getTransactionByRef_success() throws Exception {
        TransactionDetailResponse response = new TransactionDetailResponse(
                "TXN-PAY-123", "COMPLETED", BigDecimal.valueOf(100000), 1L, 2L, "PAYMENT", "Pay description", LocalDateTime.now(), Collections.emptyList()
        );

        when(transactionService.getTransactionByRef(eq("TXN-PAY-123"), eq("user1"))).thenReturn(response);

        mockMvc.perform(get("/api/v1/transactions/TXN-PAY-123").with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.transactionRef").value("TXN-PAY-123"));
    }

    @Test
    @DisplayName("GET /{ref} - Thất bại: Mã giao dịch không tồn tại -> HTTP 404 Not Found")
    @WithMockUser(username = "user1", roles = {"USER"})
    void getTransactionByRef_notFound_returnsNotFound() throws Exception {
        when(transactionService.getTransactionByRef(eq("TXN-UNKNOWN"), eq("user1")))
                .thenThrow(new ResourceNotFoundException("Transaction not found with ref: TXN-UNKNOWN"));

        mockMvc.perform(get("/api/v1/transactions/TXN-UNKNOWN").with(csrf()))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("GET /{ref} - Thất bại: Không phải chủ sở hữu giao dịch -> HTTP 403 Forbidden")
    @WithMockUser(username = "user1", roles = {"USER"})
    void getTransactionByRef_accessDenied_returnsForbidden() throws Exception {
        when(transactionService.getTransactionByRef(eq("TXN-OTHER-USER"), eq("user1")))
                .thenThrow(new AccessDeniedException("Access denied - You do not own this transaction"));

        mockMvc.perform(get("/api/v1/transactions/TXN-OTHER-USER").with(csrf()))
                .andExpect(status().isForbidden());
    }

    // ==========================================
    // 3. GET /api/v1/transactions
    // ==========================================

    @Test
    @DisplayName("GET /transactions - User thường: Tự động lọc chỉ xem giao dịch của chính mình")
    @WithMockUser(username = "user1", roles = {"USER"})
    void getTransactions_asUser_filtersOwnTransactions() throws Exception {
        User normalUser = User.builder().username("user1").role(Role.USER).build();
        AccountResponse userAccount = new AccountResponse(
                1L, 10L, "USER", "AC00000001", BigDecimal.valueOf(500000), "VND", "ACTIVE", LocalDateTime.now(), LocalDateTime.now()
        );
        TransactionResponse txResponse = new TransactionResponse(
                "TXN-PAY-123", "COMPLETED", BigDecimal.valueOf(100000), 1L, 2L, "PAYMENT", "Pay description", LocalDateTime.now()
        );
        Page<TransactionResponse> page = new PageImpl<>(Collections.singletonList(txResponse));

        when(userRepository.findByUsername("user1")).thenReturn(Optional.of(normalUser));
        when(accountService.getAccountByUsername("user1")).thenReturn(userAccount);
        when(transactionService.getTransactions(eq(1L), any(), any(), any(), any(), any(), any(Pageable.class))).thenReturn(page);

        mockMvc.perform(get("/api/v1/transactions").with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.content[0].transactionRef").value("TXN-PAY-123"));
    }

    @Test
    @DisplayName("GET /transactions - Admin: Xem được toàn bộ lịch sử giao dịch toàn hệ thống")
    @WithMockUser(username = "admin", roles = {"ADMIN"})
    void getTransactions_asAdmin_viewsAllTransactions() throws Exception {
        User adminUser = User.builder().username("admin").role(Role.ADMIN).build();
        TransactionResponse txResponse = new TransactionResponse(
                "TXN-PAY-123", "COMPLETED", BigDecimal.valueOf(100000), 1L, 2L, "PAYMENT", "Pay description", LocalDateTime.now()
        );
        Page<TransactionResponse> page = new PageImpl<>(Collections.singletonList(txResponse));

        when(userRepository.findByUsername("admin")).thenReturn(Optional.of(adminUser));
        when(transactionService.getTransactions(eq(null), any(), any(), any(), any(), any(), any(Pageable.class))).thenReturn(page);

        mockMvc.perform(get("/api/v1/transactions").with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.content[0].transactionRef").value("TXN-PAY-123"));
    }

    // ==========================================
    // 4. POST /api/v1/transactions/{ref}/refund
    // ==========================================

    @Test
    @DisplayName("POST /{ref}/refund - Admin gọi thành công: Hoàn tiền giao dịch -> HTTP 201 Created")
    @WithMockUser(username = "admin", roles = {"ADMIN"})
    void refund_asAdmin_success() throws Exception {
        TransactionResponse response = new TransactionResponse(
                "TXN-REFUND-123", "COMPLETED", BigDecimal.valueOf(100000), 2L, 1L, "REFUND", "Refund for: TXN-PAY-123", LocalDateTime.now()
        );

        when(transactionService.refund(eq("TXN-PAY-123"), eq("admin"))).thenReturn(response);

        mockMvc.perform(post("/api/v1/transactions/TXN-PAY-123/refund").with(csrf()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.transactionRef").value("TXN-REFUND-123"))
                .andExpect(jsonPath("$.data.type").value("REFUND"));
    }

    @Test
    @DisplayName("POST /{ref}/refund - User thường cố tình gọi: Bị chặn -> HTTP 403 Forbidden")
    @WithMockUser(username = "user1", roles = {"USER"})
    void refund_asUser_returnsForbidden() throws Exception {
        mockMvc.perform(post("/api/v1/transactions/TXN-PAY-123/refund").with(csrf()))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("POST /{ref}/refund - Thất bại: Hoàn tiền lần 2 cho giao dịch đã được hoàn -> HTTP 400 Bad Request")
    @WithMockUser(username = "admin", roles = {"ADMIN"})
    void refund_alreadyRefunded_returnsBadRequest() throws Exception {
        when(transactionService.refund(eq("TXN-REFUNDED"), eq("admin")))
                .thenThrow(new BadRequestException("Transaction TXN-REFUNDED has already been refunded"));

        mockMvc.perform(post("/api/v1/transactions/TXN-REFUNDED/refund").with(csrf()))
                .andExpect(status().isBadRequest());
    }
}
