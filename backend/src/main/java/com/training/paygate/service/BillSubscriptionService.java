package com.training.paygate.service;

import com.training.paygate.dto.request.CreateBillSubscriptionRequest;
import com.training.paygate.dto.response.BillLookupResponse;
import com.training.paygate.dto.response.BillSubscriptionResponse;

import java.util.List;

public interface BillSubscriptionService {

    BillSubscriptionResponse create(CreateBillSubscriptionRequest request, String currentUsername);

    List<BillSubscriptionResponse> listMine(String currentUsername);

    List<BillSubscriptionResponse> listMineByProvider(String currentUsername, String providerCode);

    void cancel(Long subscriptionId, String currentUsername);

    int runDueSubscriptions();

    /** Get all bills (history) for a specific subscription */
    List<BillLookupResponse> getBillsForSubscription(Long subscriptionId, String currentUsername);

    /** Refresh current bill from provider and return it (creates new Bill record if not exists for period) */
    BillLookupResponse refreshCurrentBill(Long subscriptionId, String currentUsername);
}
