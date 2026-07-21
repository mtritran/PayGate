package com.training.paygate.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.training.paygate.dto.request.CreateMerchantRequest;
import com.training.paygate.dto.request.UpdateMerchantRequest;
import com.training.paygate.dto.response.MerchantResponse;
import com.training.paygate.security.JwtTokenProvider;
import com.training.paygate.service.MerchantService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.springframework.context.annotation.Import;
import com.training.paygate.security.SecurityConfig;

@WebMvcTest(MerchantController.class)
@Import(SecurityConfig.class)
class MerchantControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private MerchantService merchantService;

    @MockBean
    private JwtTokenProvider jwtTokenProvider;

    @MockBean
    private UserDetailsService userDetailsService;

    @Test
    @WithMockUser(roles = "ADMIN")
    void createMerchant_validRequest_returnsCreated() throws Exception {
        // Given
        var request = new CreateMerchantRequest(2L, "Shop ABC", "SHOPABC", "https://shopabc.com/webhook");
        var response = new MerchantResponse(1L, 2L, "Shop ABC", "SHOPABC", "****", "https://shopabc.com/webhook", true, LocalDateTime.now(), LocalDateTime.now());

        when(merchantService.create(any(CreateMerchantRequest.class))).thenReturn(response);

        // When & Then
        mockMvc.perform(post("/api/v1/admin/merchants")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.merchantName").value("Shop ABC"))
                .andExpect(jsonPath("$.data.merchantCode").value("SHOPABC"));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void createMerchant_invalidRequest_returnsBadRequest() throws Exception {
        // Given - empty name and code
        var request = new CreateMerchantRequest(null, "", "", "invalid-url");

        // When & Then
        mockMvc.perform(post("/api/v1/admin/merchants")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @WithMockUser(roles = "USER")
    void createMerchant_asUser_returnsForbidden() throws Exception {
        var request = new CreateMerchantRequest(2L, "Shop ABC", "SHOPABC", "https://shopabc.com/webhook");

        mockMvc.perform(post("/api/v1/admin/merchants")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void getById_found_returnsMerchant() throws Exception {
        var response = new MerchantResponse(1L, 2L, "Shop ABC", "SHOPABC", "****", "https://shopabc.com/webhook", true, LocalDateTime.now(), LocalDateTime.now());
        when(merchantService.getById(1L)).thenReturn(response);

        mockMvc.perform(get("/api/v1/admin/merchants/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.merchantCode").value("SHOPABC"));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void getAll_returnsPageOfMerchants() throws Exception {
        var response = new MerchantResponse(1L, 2L, "Shop ABC", "SHOPABC", "****", "https://shopabc.com/webhook", true, LocalDateTime.now(), LocalDateTime.now());
        var page = new PageImpl<>(List.of(response));
        when(merchantService.getAll(any(Pageable.class))).thenReturn(page);

        mockMvc.perform(get("/api/v1/admin/merchants")
                        .param("page", "0")
                        .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.content[0].merchantCode").value("SHOPABC"));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void updateMerchant_validRequest_returnsUpdated() throws Exception {
        var request = new UpdateMerchantRequest("New Shop Name", "https://newshop.com/webhook", true);
        var response = new MerchantResponse(1L, 2L, "New Shop Name", "SHOPABC", "****", "https://newshop.com/webhook", true, LocalDateTime.now(), LocalDateTime.now());
        when(merchantService.update(any(Long.class), any(UpdateMerchantRequest.class))).thenReturn(response);

        mockMvc.perform(put("/api/v1/admin/merchants/1")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.merchantName").value("New Shop Name"));
    }
}
