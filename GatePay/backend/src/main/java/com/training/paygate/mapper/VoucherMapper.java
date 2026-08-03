package com.training.paygate.mapper;

import com.training.paygate.dto.response.VoucherResponse;
import com.training.paygate.entity.Voucher;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface VoucherMapper {

    VoucherResponse toResponse(Voucher voucher);
}
