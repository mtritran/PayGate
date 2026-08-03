package com.training.paygate.integration.provider;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.Optional;

/**
 * HTTP client goi provider gateway (mock hoac production).
 * Chi can doi base URL trong application.yml khi len production.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class BillProviderClient {

    private final RestTemplate restTemplate;

    @Value("${paygate.provider-api.base-url:http://localhost:8090}")
    private String baseUrl;

    public ProviderCustomerDto register(ProviderRegisterRequest req) {
        String url = baseUrl + "/provider-api/v1/customers/register";
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<ProviderRegisterRequest> entity = new HttpEntity<>(req, headers);
        try {
            ResponseEntity<ProviderCustomerDto> resp = restTemplate.exchange(
                    url, HttpMethod.POST, entity, ProviderCustomerDto.class);
            return resp.getBody();
        } catch (RestClientException e) {
            log.error("Provider register failed: {}", e.getMessage());
            throw new BillProviderException("Provider gateway unavailable: " + e.getMessage(), e);
        }
    }

    public Optional<ProviderCustomerDto> findCustomer(String customerCode) {
        String url = baseUrl + "/provider-api/v1/customers/" + customerCode;
        try {
            ResponseEntity<ProviderCustomerDto> resp = restTemplate.getForEntity(url, ProviderCustomerDto.class);
            return Optional.ofNullable(resp.getBody());
        } catch (HttpClientErrorException.NotFound nf) {
            return Optional.empty();
        } catch (RestClientException e) {
            log.warn("Provider findCustomer failed for {}: {}", customerCode, e.getMessage());
            return Optional.empty();
        }
    }

    public Optional<ProviderBillDto> currentBill(String customerCode) {
        String url = baseUrl + "/provider-api/v1/customers/" + customerCode + "/current-bill";
        try {
            ResponseEntity<ProviderBillDto> resp = restTemplate.postForEntity(url, null, ProviderBillDto.class);
            return Optional.ofNullable(resp.getBody());
        } catch (HttpClientErrorException.NotFound nf) {
            return Optional.empty();
        } catch (RestClientException e) {
            log.warn("Provider currentBill failed for {}: {}", customerCode, e.getMessage());
            return Optional.empty();
        }
    }
}
