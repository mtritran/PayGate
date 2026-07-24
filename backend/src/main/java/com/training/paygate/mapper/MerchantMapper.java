package com.training.paygate.mapper;

import com.training.paygate.dto.request.CreateMerchantRequest;
import com.training.paygate.dto.request.UpdateMerchantRequest;
import com.training.paygate.dto.response.MerchantResponse;
import com.training.paygate.entity.Merchant;
import org.mapstruct.BeanMapping;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.Named;
import org.mapstruct.NullValuePropertyMappingStrategy;

@Mapper(componentModel = "spring")
public interface MerchantMapper {

    @Mapping(target = "apiKey", source = "apiKey", qualifiedByName = "maskApiKey")
    MerchantResponse toResponse(Merchant merchant);

    @Mapping(target = "apiKey", ignore = true)
    @Mapping(target = "active", ignore = true)
    Merchant toEntity(CreateMerchantRequest request);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "userId", ignore = true)
    @Mapping(target = "merchantCode", ignore = true)
    @Mapping(target = "apiKey", ignore = true)
    void updateEntity(@MappingTarget Merchant merchant, UpdateMerchantRequest request);

    @Named("maskApiKey")
    default String maskApiKey(String apiKey) {
        if (apiKey == null || apiKey.length() < 8) {
            return "****";
        }
        return "****-****-****-" + apiKey.substring(apiKey.length() - 4);
    }
}
