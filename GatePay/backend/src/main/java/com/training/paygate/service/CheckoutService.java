package com.training.paygate.service;

import com.training.paygate.dto.request.CheckoutCreateRequest;
import com.training.paygate.dto.request.CheckoutProcessRequest;
import com.training.paygate.dto.response.CheckoutCreateResponse;
import com.training.paygate.dto.response.CheckoutInfoResponse;
import com.training.paygate.dto.response.CheckoutProcessResponse;

public interface CheckoutService {
    CheckoutCreateResponse createCheckoutSession(CheckoutCreateRequest request);
    
    CheckoutCreateResponse createCheckoutSession(CheckoutCreateRequest request, String merchantCode);
    
    CheckoutInfoResponse getCheckoutInfo(String token);
    
    CheckoutInfoResponse getCheckoutInfoByTxnRef(String transactionRef);
    
    CheckoutProcessResponse processCheckout(String username, CheckoutProcessRequest request, String clientIp);
    
    void cancelCheckout(String token);
}
