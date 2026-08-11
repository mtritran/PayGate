package com.training.providermock.service;

import com.training.providermock.model.ProviderInfo;
import com.training.providermock.model.ProviderType;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class ProviderRegistry {

    private final Map<String, ProviderInfo> providers = new HashMap<>();

    @PostConstruct
    void seed() {
        put(new ProviderInfo("EVN_HANOI", "EVN Ha Noi",           ProviderType.ELECTRICITY, "VN", "19001288", "PE01"));
        put(new ProviderInfo("EVN_HCM",   "EVN TP.HCM",           ProviderType.ELECTRICITY, "VN", "19001199", "PE02"));
        put(new ProviderInfo("SAWACO",    "Nuoc Sai Gon SAWACO",  ProviderType.WATER,       "VN", "19001233", "ND02"));
        put(new ProviderInfo("VNPT_HN",   "VNPT Internet Ha Noi", ProviderType.INTERNET,    "VN", "18001166", "INT03"));
        put(new ProviderInfo("FPT_HCM",   "FPT Telecom TP.HCM",   ProviderType.INTERNET,    "VN", "19006600", "FPT04"));
    }

    private void put(ProviderInfo p) { providers.put(p.code().toUpperCase(), p); }

    public List<ProviderInfo> all() { return List.copyOf(providers.values()); }

    public Optional<ProviderInfo> find(String code) {
        if (code == null) return Optional.empty();
        return Optional.ofNullable(providers.get(code.toUpperCase()));
    }
}
