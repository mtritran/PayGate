package com.training.paygate.service;

import com.training.paygate.enums.BillType;
import lombok.Getter;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

/**
 * In-memory mock cua API cac nha cung cap dich vu (EVN, SAWACO, VNPT, FPT).
 * Cho phep tra cuu ma khach hang ngoai DB de mo phong tich hop API ben thu ba.
 */
@Service
public class BillProviderMockService {

    @Getter
    public static class MockBillInfo {
        private final String customerCode;
        private final String customerName;
        private final String address;
        private final BigDecimal amount;
        private final String period;
        private final String providerCode;
        private final BillType type;

        public MockBillInfo(String customerCode, String customerName, String address,
                            BigDecimal amount, String period, String providerCode, BillType type) {
            this.customerCode = customerCode;
            this.customerName = customerName;
            this.address = address;
            this.amount = amount;
            this.period = period;
            this.providerCode = providerCode;
            this.type = type;
        }
    }

    private static final DateTimeFormatter PERIOD_FMT = DateTimeFormatter.ofPattern("MM/yyyy");

    private final Map<String, MockBillInfo> mockDatabase = new HashMap<>();

    public BillProviderMockService() {
        seedMock();
    }

    private String key(String providerCode, String customerCode) {
        return providerCode.toUpperCase() + "::" + customerCode.toUpperCase();
    }

    private void put(String providerCode, BillType type, String customerCode, String name, String address, long amount) {
        MockBillInfo info = new MockBillInfo(
                customerCode,
                name,
                address,
                BigDecimal.valueOf(amount),
                LocalDate.now().format(PERIOD_FMT),
                providerCode,
                type
        );
        mockDatabase.put(key(providerCode, customerCode), info);
    }

    private void seedMock() {
        // EVN Ha Noi
        put("EVN_HANOI", BillType.ELECTRICITY, "PE0100112233", "Nguyen Van A",  "So 123 Giang Vo, Ha Noi",     520_000);
        put("EVN_HANOI", BillType.ELECTRICITY, "PE0100998877", "Pham Thi D",    "Cau Giay, Ha Noi",            380_000);
        put("EVN_HANOI", BillType.ELECTRICITY, "PE0100223344", "Do Van F",      "Hai Ba Trung, Ha Noi",        620_500);
        put("EVN_HANOI", BillType.ELECTRICITY, "PE0100556677", "Nguyen Thi G",  "Long Bien, Ha Noi",           450_000);
        put("EVN_HANOI", BillType.ELECTRICITY, "PE0100889900", "Tran Hoang H",  "Dong Da, Ha Noi",             720_000);

        // EVN TP.HCM
        put("EVN_HCM", BillType.ELECTRICITY, "PE0200111222", "Le Thi K",       "Quan 1, TP.HCM",              810_000);
        put("EVN_HCM", BillType.ELECTRICITY, "PE0200333444", "Vo Van L",       "Quan 3, TP.HCM",              690_000);
        put("EVN_HCM", BillType.ELECTRICITY, "PE0200555666", "Bui Thi M",      "Quan Binh Thanh, TP.HCM",     540_500);
        put("EVN_HCM", BillType.ELECTRICITY, "PE0200777888", "Hoang Van N",    "Quan 7, TP.HCM",              930_000);

        // SAWACO
        put("SAWACO", BillType.WATER, "ND0200445566", "Tran Thi B",   "Quan 1, TP.HCM",     180_000);
        put("SAWACO", BillType.WATER, "ND0200778899", "Ngo Van P",    "Quan 5, TP.HCM",     220_000);
        put("SAWACO", BillType.WATER, "ND0200334455", "Ly Thi Q",     "Quan 10, TP.HCM",    145_500);
        put("SAWACO", BillType.WATER, "ND0200667788", "Doan Van R",   "Quan Tan Binh, TP.HCM", 310_000);

        // VNPT Ha Noi
        put("VNPT_HN", BillType.INTERNET, "INT030077889", "Le Van C",        "Ba Dinh, Ha Noi",   250_000);
        put("VNPT_HN", BillType.INTERNET, "INT030088990", "Truong Thi S",    "Tay Ho, Ha Noi",    300_000);
        put("VNPT_HN", BillType.INTERNET, "INT030099001", "Nguyen Van T",    "Thanh Xuan, Ha Noi", 220_000);

        // FPT TP.HCM
        put("FPT_HCM", BillType.INTERNET, "FPT040011223", "Vo Thi E",     "Quan 3, TP.HCM",       300_000);
        put("FPT_HCM", BillType.INTERNET, "FPT040022334", "Pham Van U",   "Quan Phu Nhuan, TP.HCM", 350_000);
        put("FPT_HCM", BillType.INTERNET, "FPT040033445", "Dang Thi V",   "Quan Go Vap, TP.HCM",  280_000);
    }

    public Optional<MockBillInfo> lookup(String providerCode, String customerCode) {
        if (providerCode == null || customerCode == null) return Optional.empty();
        return Optional.ofNullable(mockDatabase.get(key(providerCode, customerCode)));
    }

    /**
     * Cho phep FE demo mot loat ma KH goi y theo provider.
     */
    public java.util.List<MockBillInfo> listByProvider(String providerCode) {
        if (providerCode == null) return java.util.List.of();
        String prefix = providerCode.toUpperCase() + "::";
        return mockDatabase.entrySet().stream()
                .filter(e -> e.getKey().startsWith(prefix))
                .map(Map.Entry::getValue)
                .toList();
    }
}
