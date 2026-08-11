package com.training.paygate.service;

import com.training.paygate.dto.request.CreateSavedBillRequest;
import com.training.paygate.dto.request.LookupBillRequest;
import com.training.paygate.dto.request.PayBillRequest;
import com.training.paygate.dto.response.BillLookupResponse;
import com.training.paygate.dto.response.BillPayResponse;
import com.training.paygate.dto.response.BillProviderResponse;
import com.training.paygate.dto.response.SavedBillResponse;
import com.training.paygate.enums.BillType;

import java.util.List;

public interface BillService {

    List<BillProviderResponse> getProviders(BillType type);

    BillLookupResponse lookup(LookupBillRequest request);

    BillPayResponse pay(PayBillRequest request, String currentUsername);

    List<SavedBillResponse> getSavedBills(String currentUsername);

    SavedBillResponse saveBill(CreateSavedBillRequest request, String currentUsername);
}
