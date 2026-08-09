package com.training.cic.service;

import com.training.cic.dto.CreditCheckRequest;
import com.training.cic.dto.CreditCheckResponse;

public interface CicCreditCheckService {

    CreditCheckResponse checkCredit(CreditCheckRequest request);
}
