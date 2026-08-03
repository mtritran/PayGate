package com.training.paygate.controller;

import com.training.paygate.common.ApiResponse;
import com.training.paygate.dto.request.LinkedBankRequest;
import com.training.paygate.dto.response.LinkedBankResponse;
import com.training.paygate.service.LinkedBankService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/v1/accounts/linked-banks")
@RequiredArgsConstructor
@Tag(name = "Linked Banks", description = "Link bank accounts & e-wallets for users")
public class LinkedBankController {

    private final LinkedBankService linkedBankService;

    @GetMapping
    @Operation(summary = "List linked banks for current user")
    public ApiResponse<List<LinkedBankResponse>> getMyLinkedBanks(Principal principal) {
        List<LinkedBankResponse> list = linkedBankService.getUserLinkedBanks(principal.getName());
        return ApiResponse.success(list);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Add a new linked bank account")
    public ApiResponse<LinkedBankResponse> linkBank(@Valid @RequestBody LinkedBankRequest request, Principal principal) {
        LinkedBankResponse response = linkedBankService.linkBank(principal.getName(), request);
        return ApiResponse.success("Bank linked successfully", response);
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Unlink/remove a bank account")
    public ApiResponse<Void> unlinkBank(@PathVariable Long id, Principal principal) {
        linkedBankService.unlinkBank(principal.getName(), id);
        return ApiResponse.success("Bank unlinked successfully", null);
    }
}
