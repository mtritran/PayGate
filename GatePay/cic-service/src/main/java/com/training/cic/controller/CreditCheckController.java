package com.training.cic.controller;

import com.training.cic.dto.CreditCheckRequest;
import com.training.cic.dto.CreditCheckResponse;
import com.training.cic.service.CicCreditCheckService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/internal/cic")
public class CreditCheckController {

    private final CicCreditCheckService cicCreditCheckService;

    public CreditCheckController(CicCreditCheckService cicCreditCheckService) {
        this.cicCreditCheckService = cicCreditCheckService;
    }

    @PostMapping("/credit-check")
    public CreditCheckResponse checkCredit(@Valid @RequestBody CreditCheckRequest request) {
        return cicCreditCheckService.checkCredit(request);
    }
}
