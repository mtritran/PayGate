package com.training.paygate.exception;

public class AmountMismatchException extends BadRequestException {

    public AmountMismatchException(String message) {
        super(message);
    }
}
