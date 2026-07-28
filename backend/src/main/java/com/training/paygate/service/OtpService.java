package com.training.paygate.service;

import com.training.paygate.dto.response.OtpResponse;

public interface OtpService {
    OtpResponse sendOtp(String username, String action);
    boolean verifyOtp(String username, String action, String otpCode);
}
