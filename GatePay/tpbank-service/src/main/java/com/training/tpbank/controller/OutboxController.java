package com.training.tpbank.controller;

import com.training.tpbank.dto.OutboxPublishResponse;
import com.training.tpbank.service.OutboxPublisherService;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/internal/tpbank/outbox")
public class OutboxController {

    private final OutboxPublisherService outboxPublisherService;

    public OutboxController(OutboxPublisherService outboxPublisherService) {
        this.outboxPublisherService = outboxPublisherService;
    }

    @PostMapping("/publish")
    public OutboxPublishResponse publishDueEvents() {
        return new OutboxPublishResponse(outboxPublisherService.publishDueEvents());
    }
}
