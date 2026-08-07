package com.training.paygate.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.training.paygate.cache.RefreshTokenCacheService;
import com.training.paygate.dto.request.CheckoutCreateRequest;
import com.training.paygate.dto.request.CheckoutProcessRequest;
import com.training.paygate.dto.response.CheckoutCreateResponse;
import com.training.paygate.dto.response.CheckoutInfoResponse;
import com.training.paygate.dto.response.CheckoutProcessResponse;
import com.training.paygate.repository.UserRepository;
import com.training.paygate.security.JwtTokenProvider;
import com.training.paygate.security.SecurityConfig;
import com.training.paygate.service.CheckoutService;
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

import java.math.BigDecimal;
import java.time.LocalDateTime;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(CheckoutController.class)
@Import(SecurityConfig.class)
@AutoConfigureMockMvc
class CheckoutControllerTest {

        @Autowired
        private MockMvc mockMvc;

        @Autowired
        private ObjectMapper objectMapper;

        @MockBean
        private CheckoutService checkoutService;

        @MockBean
        private JwtTokenProvider jwtTokenProvider;

        @MockBean
        private RefreshTokenCacheService refreshTokenCacheService;

        @MockBean
        private UserDetailsService userDetailsService;

        @MockBean
        private UserRepository userRepository;

        @Test
        @DisplayName("createCheckoutSession_Success - Valid API Key creates session")
        void createCheckoutSession_Success() throws Exception {
                CheckoutCreateRequest request = new CheckoutCreateRequest(
                                "gp_live_key_123", "ORD-1001", new BigDecimal("250000"), "Desc", com.training.paygate.enums.PaymentMethod.PAYGATE, "http://localhost:3000/success", null);

                CheckoutCreateResponse mockData = new CheckoutCreateResponse(
                                "CHK_TOKEN123", com.training.paygate.enums.PaymentMethod.PAYGATE, "http://localhost:4201/checkout?token=CHK_TOKEN123", null, null, null, null, null, null, LocalDateTime.now().plusMinutes(15));

                when(checkoutService.createCheckoutSession(any(CheckoutCreateRequest.class))).thenReturn(mockData);

                mockMvc.perform(post("/api/v1/checkout/create")
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(request)))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.success").value(true))
                                .andExpect(jsonPath("$.data.token").value("CHK_TOKEN123"));
        }

        @Test
        @DisplayName("createCheckoutSession_InvalidApiKey - Throws BadRequestException when API key invalid")
        void createCheckoutSession_InvalidApiKey() throws Exception {
                CheckoutCreateRequest request = new CheckoutCreateRequest(
                                "invalid-key", "ORD-1001", new BigDecimal("250000"), "Desc", com.training.paygate.enums.PaymentMethod.PAYGATE, "http://localhost:3000/success", null);

                when(checkoutService.createCheckoutSession(any(CheckoutCreateRequest.class)))
                                .thenThrow(new com.training.paygate.exception.BadRequestException("Invalid Merchant API Key"));

                mockMvc.perform(post("/api/v1/checkout/create")
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(request)))
                                .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("createCheckoutSession_InactiveMerchant - Throws BadRequestException when merchant inactive")
        void createCheckoutSession_InactiveMerchant() throws Exception {
                CheckoutCreateRequest request = new CheckoutCreateRequest(
                                "inactive-key", "ORD-1001", new BigDecimal("250000"), "Desc", com.training.paygate.enums.PaymentMethod.PAYGATE, "http://localhost:3000/success", null);

                when(checkoutService.createCheckoutSession(any(CheckoutCreateRequest.class)))
                                .thenThrow(new com.training.paygate.exception.BadRequestException("Merchant account is currently inactive or disabled"));

                mockMvc.perform(post("/api/v1/checkout/create")
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(request)))
                                .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("createCheckoutSession_InvalidAmount_returns400 - Validation amount < 1000 returns 400")
        void createCheckoutSession_InvalidAmount_returns400() throws Exception {
                CheckoutCreateRequest request = new CheckoutCreateRequest(
                                "gp_live_key_123", "ORD-1001", new BigDecimal("500"), "Desc", com.training.paygate.enums.PaymentMethod.PAYGATE, "http://localhost:3000/success", null);

                mockMvc.perform(post("/api/v1/checkout/create")
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(request)))
                                .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("getCheckoutInfo_Success - Returns info by valid token")
        void getCheckoutInfo_Success() throws Exception {
                CheckoutInfoResponse infoResponse = new CheckoutInfoResponse(
                                "CHK_TOKEN123", "Merchant Shop", "SHOP_CODE", "ORD-1001", new BigDecimal("250000"),
                                "Desc", "http://localhost:3000/success", null, "PENDING", LocalDateTime.now(), LocalDateTime.now().plusMinutes(15));

                when(checkoutService.getCheckoutInfo("CHK_TOKEN123")).thenReturn(infoResponse);

                mockMvc.perform(get("/api/v1/checkout/info/CHK_TOKEN123"))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.success").value(true))
                                .andExpect(jsonPath("$.data.token").value("CHK_TOKEN123"));
        }

        @Test
        @DisplayName("getCheckoutInfo_Expired - Session status is EXPIRED")
        void getCheckoutInfo_Expired() throws Exception {
                CheckoutInfoResponse infoResponse = new CheckoutInfoResponse(
                                "CHK_TOKEN123", "Merchant Shop", "SHOP_CODE", "ORD-1001", new BigDecimal("250000"),
                                "Desc", "http://localhost:3000/success", null, "EXPIRED", LocalDateTime.now(), LocalDateTime.now().minusMinutes(5));

                when(checkoutService.getCheckoutInfo("CHK_TOKEN123")).thenReturn(infoResponse);

                mockMvc.perform(get("/api/v1/checkout/info/CHK_TOKEN123"))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.success").value(true))
                                .andExpect(jsonPath("$.data.status").value("EXPIRED"));
        }

        @Test
        @DisplayName("getCheckoutInfoByTxnRef_Success - Returns info by valid transaction reference")
        void getCheckoutInfoByTxnRef_Success() throws Exception {
                CheckoutInfoResponse infoResponse = new CheckoutInfoResponse(
                                "CHK_TOKEN999", "Merchant Shop", "SHOP_CODE", "ORD-1001", new BigDecimal("250000"),
                                "Desc", "http://localhost:3000/success", null, "PENDING", LocalDateTime.now(), LocalDateTime.now().plusMinutes(15));

                when(checkoutService.getCheckoutInfoByTxnRef("TXN_REF_999")).thenReturn(infoResponse);

                mockMvc.perform(get("/api/v1/checkout/info/txn/TXN_REF_999"))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.success").value(true))
                                .andExpect(jsonPath("$.data.token").value("CHK_TOKEN999"));
        }

        @Test
        @DisplayName("processCheckout_Unauthenticated_returns401 - Unauthenticated user returns 401 Unauthorized")
        void processCheckout_Unauthenticated_returns401() throws Exception {
                CheckoutProcessRequest processRequest = new CheckoutProcessRequest("CHK_TOKEN123", "123456");

                mockMvc.perform(post("/api/v1/checkout/process")
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(processRequest)))
                                .andExpect(status().isUnauthorized());
        }

        @Test
        @WithMockUser(username = "customer@test.com")
        @DisplayName("processCheckout_BlankTokenOrOtp_returns400 - Blank token or otpCode returns 400 Bad Request")
        void processCheckout_BlankTokenOrOtp_returns400() throws Exception {
                CheckoutProcessRequest invalidRequest = new CheckoutProcessRequest("", "");

                mockMvc.perform(post("/api/v1/checkout/process")
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(invalidRequest)))
                                .andExpect(status().isBadRequest());
        }

        @Test
        @WithMockUser(username = "customer@test.com")
        @DisplayName("processCheckout_Success - Valid OTP completes payment")
        void processCheckout_Success() throws Exception {
                CheckoutProcessRequest processRequest = new CheckoutProcessRequest("CHK_TOKEN123", "123456");

                CheckoutProcessResponse responseData = new CheckoutProcessResponse(
                                "TXN_REF_99", "http://localhost:3000/success?status=PROCESSING");

                when(checkoutService.processCheckout(eq("customer@test.com"), any(CheckoutProcessRequest.class), any()))
                                .thenReturn(responseData);

                mockMvc.perform(post("/api/v1/checkout/process")
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(processRequest)))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.success").value(true))
                                .andExpect(jsonPath("$.data.transactionRef").value("TXN_REF_99"));
        }

        @Test
        @WithMockUser(username = "customer@test.com")
        @DisplayName("processCheckout_InvalidOtp - Invalid OTP returns 400 Bad Request")
        void processCheckout_InvalidOtp() throws Exception {
                CheckoutProcessRequest processRequest = new CheckoutProcessRequest("CHK_TOKEN123", "999999");

                when(checkoutService.processCheckout(eq("customer@test.com"), any(CheckoutProcessRequest.class), any()))
                                .thenThrow(new com.training.paygate.exception.BadRequestException("Invalid or expired OTP code"));

                mockMvc.perform(post("/api/v1/checkout/process")
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(processRequest)))
                                .andExpect(status().isBadRequest());
        }

        @Test
        @WithMockUser(username = "customer@test.com")
        @DisplayName("processCheckout_WithXForwardedForHeader_passesClientIpToService - Extracts first IP from header")
        void processCheckout_WithXForwardedForHeader_passesClientIpToService() throws Exception {
                CheckoutProcessRequest processRequest = new CheckoutProcessRequest("CHK_TOKEN123", "123456");

                CheckoutProcessResponse responseData = new CheckoutProcessResponse(
                                "TXN_REF_99", "http://localhost:3000/success?status=PROCESSING");

                when(checkoutService.processCheckout(eq("customer@test.com"), any(CheckoutProcessRequest.class), eq("203.0.113.195")))
                                .thenReturn(responseData);

                mockMvc.perform(post("/api/v1/checkout/process")
                                .with(csrf())
                                .header("X-Forwarded-For", "203.0.113.195, 70.41.3.18")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(processRequest)))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.success").value(true));
        }
}
