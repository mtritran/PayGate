package com.training.providermock.model;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public class CustomerRecord {
    private final String customerCode;
    private final String customerName;
    private final String address;
    private final String providerCode;
    private final ProviderType type;
    private BigDecimal cycleAmount;
    private final LocalDateTime registeredAt;
    private String lastBillPeriod;

    public CustomerRecord(String customerCode, String customerName, String address,
                          String providerCode, ProviderType type, BigDecimal cycleAmount,
                          LocalDateTime registeredAt) {
        this.customerCode = customerCode;
        this.customerName = customerName;
        this.address = address;
        this.providerCode = providerCode;
        this.type = type;
        this.cycleAmount = cycleAmount;
        this.registeredAt = registeredAt;
    }

    public String getCustomerCode() { return customerCode; }
    public String getCustomerName() { return customerName; }
    public String getAddress()      { return address; }
    public String getProviderCode() { return providerCode; }
    public ProviderType getType()   { return type; }
    public BigDecimal getCycleAmount() { return cycleAmount; }
    public LocalDateTime getRegisteredAt() { return registeredAt; }
    public String getLastBillPeriod() { return lastBillPeriod; }
    public void setLastBillPeriod(String period) { this.lastBillPeriod = period; }
    public void setCycleAmount(BigDecimal amount) { this.cycleAmount = amount; }
}
