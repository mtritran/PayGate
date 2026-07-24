package com.training.paygate.controller;

import com.training.paygate.dto.response.LedgerEntryResponse;
import com.training.paygate.dto.response.LedgerVerificationResponse;
import com.training.paygate.security.JwtTokenProvider;
import com.training.paygate.security.SecurityConfig;
import com.training.paygate.service.LedgerService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collections;

import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(LedgerController.class)
@Import(SecurityConfig.class)
class LedgerControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private JwtTokenProvider jwtTokenProvider;

    @MockBean
    private UserDetailsService userDetailsService;

    @MockBean
    private LedgerService ledgerService;

    @Test
    @WithMockUser(roles = "ADMIN")
    void verify_asAdmin_success() throws Exception {
        // Given
        LedgerVerificationResponse response = new LedgerVerificationResponse(
                true, BigDecimal.valueOf(150000), BigDecimal.valueOf(150000), "Ledger is balanced."
        );

        when(ledgerService.verifyLedger()).thenReturn(response);

        // When & Then
        mockMvc.perform(get("/api/v1/admin/ledger/verify")
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.balanced").value(true))
                .andExpect(jsonPath("$.data.totalDebit").value(150000));
    }

    @Test
    @WithMockUser(roles = "USER")
    void verify_asUser_forbidden() throws Exception {
        // When & Then (USER role is forbidden from calling admin ledger verification)
        mockMvc.perform(get("/api/v1/admin/ledger/verify")
                        .with(csrf()))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void getEntriesByAccount_asAdmin_success() throws Exception {
        // Given
        LedgerEntryResponse entry = new LedgerEntryResponse(
                1L, 100L, 1L, "DEBIT", BigDecimal.valueOf(100000), BigDecimal.valueOf(400000), LocalDateTime.now()
        );

        when(ledgerService.getEntriesByAccount(1L)).thenReturn(Collections.singletonList(entry));

        // When & Then
        mockMvc.perform(get("/api/v1/admin/ledger/account/1")
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].entryType").value("DEBIT"));
    }
}
