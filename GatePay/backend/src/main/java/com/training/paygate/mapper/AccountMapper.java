package com.training.paygate.mapper;

import com.training.paygate.dto.response.AccountResponse;
import com.training.paygate.entity.Account;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface AccountMapper {

    AccountResponse toResponse(Account account);
}
