package com.training.paygate.integration.cic;

import com.training.paygate.dto.client.CicCreditCheckRequest;
import com.training.paygate.dto.client.CicCreditCheckResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

@Component
@RequiredArgsConstructor
public class CicClient {

    private final RestTemplate restTemplate;

    @Value("${paygate.cic.base-url}")
    private String cicBaseUrl;

    public CicCreditCheckResponse checkCredit(CicCreditCheckRequest request) {
        return restTemplate.postForObject(
                cicBaseUrl + "/internal/cic/credit-check",
                request,
                CicCreditCheckResponse.class
        );
    }
}
