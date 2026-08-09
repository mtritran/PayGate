package com.training.tpbank.controller;

import com.training.tpbank.dto.BorrowerHistoryResponse;
import com.training.tpbank.service.BorrowerHistoryService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/internal/tpbank/borrowers")
public class BorrowerHistoryController {

    private final BorrowerHistoryService borrowerHistoryService;

    public BorrowerHistoryController(BorrowerHistoryService borrowerHistoryService) {
        this.borrowerHistoryService = borrowerHistoryService;
    }

    @GetMapping("/{customerId}/history")
    public BorrowerHistoryResponse getHistory(@PathVariable Long customerId) {
        return borrowerHistoryService.getHistory(customerId);
    }
}
