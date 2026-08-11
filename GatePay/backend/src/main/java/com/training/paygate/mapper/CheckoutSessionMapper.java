package com.training.paygate.mapper;

import com.training.paygate.dto.response.CheckoutInfoResponse;
import com.training.paygate.entity.CheckoutSession;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface CheckoutSessionMapper {

    CheckoutInfoResponse toCheckoutInfoResponse(CheckoutSession session);
}
