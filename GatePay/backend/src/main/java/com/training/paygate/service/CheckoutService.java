package com.training.paygate.service;

import com.training.paygate.dto.request.CheckoutCreateRequest;
import com.training.paygate.dto.response.CheckoutCreateResponse;
import com.training.paygate.dto.response.CheckoutInfoResponse;

public interface CheckoutService {

    /**
     * Creates a checkout session for the given Merchant's order.
     * Returns either a PAYGATE payment URL or VietQR Dynamic QR code data depending on paymentMethod.
     */
    CheckoutCreateResponse createCheckoutSession(CheckoutCreateRequest request);

    /**
     * Retrieves checkout session info by token.
     */
    CheckoutInfoResponse getCheckoutInfo(String token);
}
