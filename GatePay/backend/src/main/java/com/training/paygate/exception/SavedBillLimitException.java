package com.training.paygate.exception;

public class SavedBillLimitException extends RuntimeException {
    public SavedBillLimitException(String message) {
        super(message);
    }
}
