package com.training.paygate.mapper;

import com.training.paygate.dto.response.LedgerEntryResponse;
import com.training.paygate.entity.LedgerEntry;
import org.mapstruct.Mapper;

import java.util.List;

@Mapper(componentModel = "spring")
public interface LedgerEntryMapper {

    LedgerEntryResponse toResponse(LedgerEntry ledgerEntry);
    
    List<LedgerEntryResponse> toResponseList(List<LedgerEntry> ledgerEntries);
}
