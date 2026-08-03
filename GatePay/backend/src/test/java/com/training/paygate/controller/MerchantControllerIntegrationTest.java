package com.training.paygate.controller;

import com.training.paygate.BaseIntegrationTest;
import com.training.paygate.common.ApiResponse;
import com.training.paygate.common.PageResponse;
import com.training.paygate.dto.request.CreateMerchantRequest;
import com.training.paygate.dto.request.UpdateMerchantRequest;
import com.training.paygate.dto.response.MerchantResponse;
import com.training.paygate.entity.User;
import com.training.paygate.enums.Role;
import com.training.paygate.repository.MerchantRepository;
import com.training.paygate.repository.UserRepository;
import com.training.paygate.security.JwtTokenProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@Disabled("Requires a running Docker environment for Testcontainers")
class MerchantControllerIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private MerchantRepository merchantRepository;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    private String adminToken;
    private String userToken;
    private User savedUser;

    @BeforeEach
    void setUp() {
        merchantRepository.deleteAll();
        userRepository.deleteAll();

        // Create Admin User
        User adminUser = User.builder()
                .username("admin")
                .email("admin@test.com")
                .password("password")
                .fullName("System Admin")
                .role(Role.ADMIN)
                .active(true)
                .build();
        userRepository.save(adminUser);
        adminToken = jwtTokenProvider.generateAccessToken("admin");

        // Create Normal User
        User normalUser = User.builder()
                .username("user")
                .email("user@test.com")
                .password("password")
                .fullName("Normal User")
                .role(Role.USER)
                .active(true)
                .build();
        savedUser = userRepository.save(normalUser);
        userToken = jwtTokenProvider.generateAccessToken("user");
    }

    @Test
    void createMerchant_asAdmin_success() {
        // Given
        CreateMerchantRequest request = new CreateMerchantRequest(
                savedUser.getId(),
                "Merchant ABC",
                "MERCHANTABC",
                "https://webhook.test.com"
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(adminToken);
        HttpEntity<CreateMerchantRequest> entity = new HttpEntity<>(request, headers);

        // When
        ResponseEntity<ApiResponse<Map<String, Object>>> response = restTemplate.exchange(
                "/api/v1/admin/merchants",
                HttpMethod.POST,
                entity,
                new ParameterizedTypeReference<>() {}
        );

        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().isSuccess()).isTrue();
        
        Map<String, Object> data = response.getBody().getData();
        assertThat(data.get("merchantName")).isEqualTo("Merchant ABC");
        assertThat(data.get("merchantCode")).isEqualTo("MERCHANTABC");
        assertThat(data.get("apiKey")).isNotNull();
        assertThat(data.get("apiKey").toString()).startsWith("****-****-****-");
    }

    @Test
    void createMerchant_asUser_forbidden() {
        // Given
        CreateMerchantRequest request = new CreateMerchantRequest(
                savedUser.getId(),
                "Merchant ABC",
                "MERCHANTABC",
                "https://webhook.test.com"
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(userToken);
        HttpEntity<CreateMerchantRequest> entity = new HttpEntity<>(request, headers);

        // When
        ResponseEntity<ApiResponse<Map<String, Object>>> response = restTemplate.exchange(
                "/api/v1/admin/merchants",
                HttpMethod.POST,
                entity,
                new ParameterizedTypeReference<>() {}
        );

        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void createMerchant_duplicateCode_conflict() {
        // Given
        CreateMerchantRequest request1 = new CreateMerchantRequest(
                savedUser.getId(),
                "Merchant 1",
                "MERCHANTDUPE",
                "https://webhook.test.com"
        );
        CreateMerchantRequest request2 = new CreateMerchantRequest(
                savedUser.getId(), // Same user id is also unique and will throw conflict
                "Merchant 2",
                "MERCHANTDUPE",
                "https://webhook.test.com"
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(adminToken);
        
        // Save first merchant
        restTemplate.exchange(
                "/api/v1/admin/merchants",
                HttpMethod.POST,
                new HttpEntity<>(request1, headers),
                new ParameterizedTypeReference<>() {}
        );

        // When (save second with duplicate code)
        ResponseEntity<ApiResponse<Map<String, Object>>> response = restTemplate.exchange(
                "/api/v1/admin/merchants",
                HttpMethod.POST,
                new HttpEntity<>(request2, headers),
                new ParameterizedTypeReference<>() {}
        );

        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().isSuccess()).isFalse();
    }
}
