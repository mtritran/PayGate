package com.training.paygate.integration.provider;

public class BillProviderException extends RuntimeException {
    public BillProviderException(String message) { super(message); }
    public BillProviderException(String message, Throwable cause) { super(message, cause); }
}
