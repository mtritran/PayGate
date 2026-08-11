package com.training.paygate.service;

import com.training.paygate.dto.request.CreateRecurringPaymentRequest;
import com.training.paygate.dto.request.UpdateRecurringPaymentStatusRequest;
import com.training.paygate.dto.response.RecurringPaymentLogResponse;
import com.training.paygate.dto.response.RecurringPaymentResponse;

import java.util.List;

public interface RecurringPaymentService {
    RecurringPaymentResponse create(CreateRecurringPaymentRequest request, String currentUsername);
    List<RecurringPaymentResponse> getMyRecurringPayments(String currentUsername);
    RecurringPaymentResponse getById(Long id, String currentUsername);
    RecurringPaymentResponse updateStatus(Long id, UpdateRecurringPaymentStatusRequest request, String currentUsername);
    void delete(Long id, String currentUsername);
    List<RecurringPaymentLogResponse> getLogs(Long id, String currentUsername);
    void executeDuePayments();
    RecurringPaymentResponse executeNow(Long id, String currentUsername);
}
