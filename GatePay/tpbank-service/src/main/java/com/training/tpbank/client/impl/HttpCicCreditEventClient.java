package com.training.tpbank.client.impl;

import com.training.tpbank.client.CicCreditEventClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class HttpCicCreditEventClient implements CicCreditEventClient {

    private final RestClient restClient;

    public HttpCicCreditEventClient(
            RestClient.Builder restClientBuilder,
            @Value("${cic.base-url}") String cicBaseUrl
    ) {
        this.restClient = restClientBuilder.baseUrl(cicBaseUrl).build();
    }

    @Override
    public void publish(String payloadJson) {
        restClient.post()
                .uri("/internal/cic/credit-events")
                .contentType(MediaType.APPLICATION_JSON)
                .body(payloadJson)
                .retrieve()
                .toBodilessEntity();
    }
}
