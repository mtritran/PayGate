package com.training.paygate.service;

import com.training.paygate.dto.request.CreateMerchantRequest;
import com.training.paygate.dto.request.UpdateMerchantRequest;
import com.training.paygate.dto.response.MerchantResponse;
import com.training.paygate.entity.Merchant;
import com.training.paygate.exception.DuplicateResourceException;
import com.training.paygate.exception.ResourceNotFoundException;
import com.training.paygate.enums.OwnerType;
import com.training.paygate.mapper.MerchantMapper;
import com.training.paygate.repository.MerchantRepository;
import com.training.paygate.service.impl.MerchantServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MerchantServiceTest {

    @Mock
    private MerchantRepository merchantRepository;

    @Mock
    private MerchantMapper merchantMapper;

    @Mock
    private AccountService accountService;

    @InjectMocks
    private MerchantServiceImpl merchantService;

    @Test
    void create_validRequest_returnsMerchantResponse() {
        // Given
        var request = new CreateMerchantRequest(2L, "Shop ABC", "SHOPABC", "https://shopabc.com/webhook");
        var merchant = Merchant.builder()
                .userId(2L)
                .merchantName("Shop ABC")
                .merchantCode("SHOPABC")
                .webhookUrl("https://shopabc.com/webhook")
                .build();
        var response = new MerchantResponse(1L, 2L, "Shop ABC", "SHOPABC", "****-****-****-abcd", "https://shopabc.com/webhook", true, LocalDateTime.now(), LocalDateTime.now());

        when(merchantRepository.existsByMerchantCode("SHOPABC")).thenReturn(false);
        when(merchantRepository.existsByUserId(2L)).thenReturn(false);
        when(merchantMapper.toEntity(request)).thenReturn(merchant);
        when(merchantRepository.save(any(Merchant.class))).thenReturn(merchant);
        when(merchantMapper.toResponse(any(Merchant.class))).thenReturn(response);

        // When
        var result = merchantService.create(request);

        // Then
        assertThat(result.merchantName()).isEqualTo("Shop ABC");
        assertThat(result.merchantCode()).isEqualTo("SHOPABC");
        verify(merchantRepository).save(any(Merchant.class));
        verify(accountService).createAccount(any(), eq(OwnerType.MERCHANT));
    }

    @Test
    void create_duplicateMerchantCode_throwsDuplicateResourceException() {
        // Given
        var request = new CreateMerchantRequest(2L, "Shop ABC", "SHOPABC", "https://shopabc.com/webhook");
        when(merchantRepository.existsByMerchantCode("SHOPABC")).thenReturn(true);

        // When & Then
        assertThatThrownBy(() -> merchantService.create(request))
                .isInstanceOf(DuplicateResourceException.class);
        verify(merchantRepository, never()).save(any());
    }

    @Test
    void create_duplicateUserId_throwsDuplicateResourceException() {
        // Given
        var request = new CreateMerchantRequest(2L, "Shop ABC", "SHOPABC", "https://shopabc.com/webhook");
        when(merchantRepository.existsByMerchantCode("SHOPABC")).thenReturn(false);
        when(merchantRepository.existsByUserId(2L)).thenReturn(true);

        // When & Then
        assertThatThrownBy(() -> merchantService.create(request))
                .isInstanceOf(DuplicateResourceException.class);
        verify(merchantRepository, never()).save(any());
    }

    @Test
    void getById_found_returnsMerchantResponse() {
        // Given
        var merchant = Merchant.builder()
                .userId(2L)
                .merchantName("Shop ABC")
                .merchantCode("SHOPABC")
                .apiKey("apikey123")
                .build();
        var response = new MerchantResponse(1L, 2L, "Shop ABC", "SHOPABC", "****-****-****-y123", "https://shopabc.com/webhook", true, LocalDateTime.now(), LocalDateTime.now());

        when(merchantRepository.findById(1L)).thenReturn(Optional.of(merchant));
        when(merchantMapper.toResponse(merchant)).thenReturn(response);

        // When
        var result = merchantService.getById(1L);

        // Then
        assertThat(result.id()).isEqualTo(1L);
        assertThat(result.merchantCode()).isEqualTo("SHOPABC");
    }

    @Test
    void getById_notFound_throwsResourceNotFoundException() {
        // Given
        when(merchantRepository.findById(1L)).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> merchantService.getById(1L))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void getByCode_found_returnsMerchantResponse() {
        // Given
        var merchant = Merchant.builder()
                .userId(2L)
                .merchantName("Shop ABC")
                .merchantCode("SHOPABC")
                .build();
        var response = new MerchantResponse(1L, 2L, "Shop ABC", "SHOPABC", "****-****-****-y123", "https://shopabc.com/webhook", true, LocalDateTime.now(), LocalDateTime.now());

        when(merchantRepository.findByMerchantCode("SHOPABC")).thenReturn(Optional.of(merchant));
        when(merchantMapper.toResponse(merchant)).thenReturn(response);

        // When
        var result = merchantService.getByCode("SHOPABC");

        // Then
        assertThat(result.merchantCode()).isEqualTo("SHOPABC");
    }

    @Test
    void getByCode_notFound_throwsResourceNotFoundException() {
        // Given
        when(merchantRepository.findByMerchantCode("SHOPABC")).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> merchantService.getByCode("SHOPABC"))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void update_validRequest_returnsUpdatedMerchantResponse() {
        // Given
        var request = new UpdateMerchantRequest("New Shop Name", "https://newshop.com/webhook", true);
        var merchant = Merchant.builder()
                .userId(2L)
                .merchantName("Old Shop Name")
                .merchantCode("SHOPABC")
                .build();
        var response = new MerchantResponse(1L, 2L, "New Shop Name", "SHOPABC", "****-****-****-y123", "https://newshop.com/webhook", true, LocalDateTime.now(), LocalDateTime.now());

        when(merchantRepository.findById(1L)).thenReturn(Optional.of(merchant));
        when(merchantRepository.save(merchant)).thenReturn(merchant);
        when(merchantMapper.toResponse(merchant)).thenReturn(response);

        // When
        var result = merchantService.update(1L, request);

        // Then
        assertThat(result.merchantName()).isEqualTo("New Shop Name");
        verify(merchantMapper).updateEntity(merchant, request);
    }

    @Test
    void getAll_returnsPageOfMerchantResponses() {
        // Given
        var pageable = PageRequest.of(0, 10);
        var merchant = Merchant.builder().userId(2L).merchantName("Shop ABC").build();
        var response = new MerchantResponse(1L, 2L, "Shop ABC", "SHOPABC", "****", null, true, LocalDateTime.now(), LocalDateTime.now());
        Page<Merchant> merchantPage = new PageImpl<>(List.of(merchant));

        when(merchantRepository.findAll(pageable)).thenReturn(merchantPage);
        when(merchantMapper.toResponse(merchant)).thenReturn(response);

        // When
        var result = merchantService.getAll(pageable);

        // Then
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).merchantName()).isEqualTo("Shop ABC");
    }
}
