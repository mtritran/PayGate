package com.training.paygate.service;

import com.training.paygate.dto.request.PaymentRequest;
import com.training.paygate.dto.response.TransactionResponse;

public interface TransactionService {

    TransactionResponse processPayment(PaymentRequest request, String currentUsername);
}
