package com.training.paygate.mapper;

import com.training.paygate.dto.request.CheckoutCreateRequest;
import com.training.paygate.dto.response.CheckoutInfoResponse;
import com.training.paygate.entity.CheckoutSession;
import com.training.paygate.entity.Merchant;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.time.LocalDateTime;

@Mapper(componentModel = "spring")
public interface CheckoutMapper {

    @Mapping(target = "transactionRef", ignore = true)
    @Mapping(target = "merchantId", source = "merchant.id")
    @Mapping(target = "merchantCode", source = "merchant.merchantCode")
    @Mapping(target = "merchantName", source = "merchant.merchantName")
    @Mapping(target = "orderId", source = "request.orderId")
    @Mapping(target = "amount", source = "request.amount")
    @Mapping(target = "returnUrl", source = "request.returnUrl")
    @Mapping(target = "cancelUrl", source = "request.cancelUrl")
    @Mapping(target = "description", expression = "java(request.description() != null && !request.description().isBlank() ? request.description() : \"Payment for order \" + request.orderId())")
    @Mapping(target = "token", source = "token")
    @Mapping(target = "status", constant = "PENDING")
    @Mapping(target = "expiresAt", source = "expiresAt")
    CheckoutSession toEntity(
            CheckoutCreateRequest request,
            Merchant merchant,
            String token,
            LocalDateTime expiresAt
    );

    CheckoutInfoResponse toInfoResponse(CheckoutSession session);
}
