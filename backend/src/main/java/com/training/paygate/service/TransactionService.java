package com.training.paygate.service;

import com.training.paygate.dto.request.PaymentRequest;
import com.training.paygate.dto.response.TransactionDetailResponse;
import com.training.paygate.dto.response.TransactionResponse;
import com.training.paygate.enums.TransactionStatus;
import com.training.paygate.enums.TransactionType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface TransactionService {

    TransactionResponse processPayment(PaymentRequest request, String currentUsername);

    TransactionDetailResponse getTransactionByRef(String ref, String currentUsername);

    Page<TransactionResponse> getTransactions(
            Long ownerAccountId,
            TransactionType type,
            TransactionStatus status,
            Long sourceAccountId,
            Long destAccountId,
            Long merchantId,
            Pageable pageable
    );

    TransactionResponse refund(String originalRef, String currentUsername);
}
