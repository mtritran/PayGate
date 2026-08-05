package com.training.paygate.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.training.paygate.dto.request.RefundCreateRequest;
import com.training.paygate.dto.response.RefundResponse;
import com.training.paygate.security.JwtAuthenticationFilter;
import com.training.paygate.security.JwtTokenProvider;
import com.training.paygate.service.RefundService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.security.Principal;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(RefundController.class)
@AutoConfigureMockMvc(addFilters = false)
class RefundControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private RefundService refundService;

    @MockBean
    private JwtTokenProvider jwtTokenProvider;

    @MockBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @Test
    @DisplayName("processRefund_Success: Return 200 OK and refund response")
    void processRefund_Success() throws Exception {
        RefundCreateRequest request = new RefundCreateRequest("TXN-100", "ORD-100", new BigDecimal("250000.00"), "Defective product");
        RefundResponse mockResponse = new RefundResponse("RF-12345", "TXN-100", new BigDecimal("250000.00"), "NORMAL", 0, "COMPLETED");

        Principal mockPrincipal = new UsernamePasswordAuthenticationToken("customer@test.com", "password");

        when(refundService.processRefund(any(RefundCreateRequest.class), eq("customer@test.com")))
                .thenReturn(mockResponse);

        mockMvc.perform(post("/api/v1/refunds")
                        .principal(mockPrincipal)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.refundId").value("RF-12345"))
                .andExpect(jsonPath("$.data.status").value("COMPLETED"));
    }

    @Test
    @DisplayName("processRefund_InvalidBody: Return 400 Bad Request when validation fails")
    void processRefund_InvalidBody() throws Exception {
        RefundCreateRequest invalidRequest = new RefundCreateRequest("", "", new BigDecimal("-100"), "");
        Principal mockPrincipal = new UsernamePasswordAuthenticationToken("customer@test.com", "password");

        mockMvc.perform(post("/api/v1/refunds")
                        .principal(mockPrincipal)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidRequest)))
                .andExpect(status().isBadRequest());
    }
}
