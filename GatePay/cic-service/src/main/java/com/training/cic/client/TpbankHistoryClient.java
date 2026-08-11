package com.training.cic.client;

import com.training.cic.dto.BorrowerHistoryResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class TpbankHistoryClient {

    private final RestClient restClient;

    public TpbankHistoryClient(RestClient.Builder restClientBuilder, @Value("${tpbank.base-url}") String tpbankBaseUrl) {
        this.restClient = restClientBuilder.baseUrl(tpbankBaseUrl).build();
    }

    public BorrowerHistoryResponse getHistory(Long customerId) {
        return restClient.get()
                .uri("/internal/tpbank/borrowers/{customerId}/history", customerId)
                .retrieve()
                .body(BorrowerHistoryResponse.class);
    }
}
