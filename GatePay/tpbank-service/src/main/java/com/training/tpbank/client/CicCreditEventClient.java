package com.training.tpbank.client;

public interface CicCreditEventClient {

    void publish(String payloadJson);
}
