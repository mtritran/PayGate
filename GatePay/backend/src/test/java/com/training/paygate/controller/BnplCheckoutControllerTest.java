package com.training.paygate.controller;

import com.training.paygate.cache.RefreshTokenCacheService;
import com.training.paygate.dto.response.BnplProposalResponse;
import com.training.paygate.repository.MerchantRepository;
import com.training.paygate.repository.UserRepository;
import com.training.paygate.security.JwtTokenProvider;
import com.training.paygate.security.SecurityConfig;
import com.training.paygate.service.BnplCheckoutService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(BnplCheckoutController.class)
@Import(SecurityConfig.class)
@AutoConfigureMockMvc
class BnplCheckoutControllerTest {

    @Autowired private MockMvc mockMvc;

    @MockBean private BnplCheckoutService bnplCheckoutService;
    @MockBean private JwtTokenProvider jwtTokenProvider;
    @MockBean private RefreshTokenCacheService refreshTokenCacheService;
    @MockBean private UserDetailsService userDetailsService;
    @MockBean private UserRepository userRepository;
    @MockBean private MerchantRepository merchantRepository;

    @Test
    void confirmProposalRequiresAuthentication() throws Exception {
        mockMvc.perform(post("/api/v1/checkout/bnpl-proposals/PROP_1/confirm").with(csrf()))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(username = "borrower")
    void confirmProposalPassesAuthenticatedUsernameToService() throws Exception {
        BnplProposalResponse response = new BnplProposalResponse(
                "PROP_1", "CHK_1", 1L, new BigDecimal("3000000"),
                new BigDecimal("7000000"), 3, new BigDecimal("1045000"),
                "APPROVED", "LOAN_1", "TXN_1");
        when(bnplCheckoutService.confirmProposal("PROP_1", "borrower")).thenReturn(response);

        mockMvc.perform(post("/api/v1/checkout/bnpl-proposals/PROP_1/confirm").with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("APPROVED"));

        verify(bnplCheckoutService).confirmProposal("PROP_1", "borrower");
    }
}
