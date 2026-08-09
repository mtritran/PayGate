package com.training.cic.controller;

import com.training.cic.dto.CreditEventRequest;
import com.training.cic.dto.CreditEventResponse;
import com.training.cic.service.CreditEventIngestionService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/internal/cic")
public class CreditEventController {

    private final CreditEventIngestionService ingestionService;

    public CreditEventController(CreditEventIngestionService ingestionService) {
        this.ingestionService = ingestionService;
    }

    @PostMapping("/credit-events")
    public CreditEventResponse ingest(@Valid @RequestBody CreditEventRequest request) {
        return ingestionService.ingest(request);
    }
}
