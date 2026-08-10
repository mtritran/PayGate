package com.training.paygate.service.impl;

import com.training.paygate.dto.response.OtpResponse;
import com.training.paygate.entity.User;
import com.training.paygate.exception.BadRequestException;
import com.training.paygate.exception.ResourceNotFoundException;
import com.training.paygate.repository.UserRepository;
import com.training.paygate.service.EmailService;
import com.training.paygate.service.OtpService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
@Slf4j
public class OtpServiceImpl implements OtpService {

    private final UserRepository userRepository;
    private final EmailService emailService;
    private final SecureRandom secureRandom = new SecureRandom();

    private static class OtpEntry {
        final String otpCode;
        final long expiresAt;

        OtpEntry(String otpCode, long expiresAt) {
            this.otpCode = otpCode;
            this.expiresAt = expiresAt;
        }
    }

    // In-memory cache for OTP codes: key = "username:action"
    private final Map<String, OtpEntry> otpCache = new ConcurrentHashMap<>();

    @Override
    public OtpResponse sendOtp(String username, String action) {
        User user = userRepository.findAllByUsernameIgnoreCase(username).stream().findFirst()
                .orElseGet(() -> userRepository.findByUsername(username)
                        .orElseThrow(() -> new ResourceNotFoundException("User not found: " + username)));

        String recipientEmail = user.getEmail();
        if (recipientEmail == null || recipientEmail.isBlank()) {
            throw new BadRequestException("User has no email address to receive OTP.");
        }

        // Generate 6-digit cryptographic random OTP code
        String otpCode = String.format("%06d", secureRandom.nextInt(1_000_000));
        long ttlSeconds = 300; // 5 minutes
        long expiresAt = Instant.now().getEpochSecond() + ttlSeconds;

        log.info("[OTP GENERATED] Created OTP code '{}' for user '{}' action '{}'. Expiration: {}s", otpCode, username,
                action, ttlSeconds);

        // Dispatch OTP code to user's real email (Gmail)
        String actionTitle = action != null && !action.isBlank() ? action : "Xác thực giao dịch";
        emailService.sendOtpEmail(recipientEmail, user.getUsername(), otpCode, actionTitle);

        String cacheKey = buildCacheKey(username, action);
        otpCache.put(cacheKey, new OtpEntry(otpCode, expiresAt));

        String maskedEmail = maskEmail(recipientEmail);
        return OtpResponse.builder()
                .sent(true)
                .maskedEmail(maskedEmail)
                .message("Mã OTP 6 chữ số đã được gửi tới email " + maskedEmail + ". Vui lòng kiểm tra hộp thư Gmail.")
                .expiresInSeconds(ttlSeconds)
                .build();
    }

    @Override
    public boolean verifyOtp(String username, String action, String otpCode) {
        if (otpCode == null || otpCode.isBlank() || otpCode.length() != 6) {
            throw new BadRequestException("Mã OTP phải bao gồm đúng 6 chữ số.");
        }

        String cacheKey = buildCacheKey(username, action);
        OtpEntry entry = otpCache.get(cacheKey);

        if (entry == null) {
            throw new BadRequestException("Mã OTP không tồn tại hoặc chưa được yêu cầu. Vui lòng lấy mã mới.");
        }

        if (Instant.now().getEpochSecond() > entry.expiresAt) {
            otpCache.remove(cacheKey);
            throw new BadRequestException("Mã OTP đã hết hạn (quá 5 phút). Vui lòng yêu cầu mã mới.");
        }

        if (!java.security.MessageDigest.isEqual(entry.otpCode.getBytes(java.nio.charset.StandardCharsets.UTF_8), otpCode.trim().getBytes(java.nio.charset.StandardCharsets.UTF_8))) {
            throw new BadRequestException("Mã OTP không chính xác. Vui lòng kiểm tra lại email của bạn.");
        }

        // Clean up OTP after successful verification
        otpCache.remove(cacheKey);
        log.info("[OTP VERIFIED SUCCESS] User '{}' verified OTP for action '{}'", username, action);
        return true;
    }

    private String buildCacheKey(String username, String action) {
        return username.toLowerCase() + ":" + (action != null ? action.toLowerCase() : "default");
    }

    private String maskEmail(String email) {
        if (email == null || !email.contains("@"))
            return email;
        String[] parts = email.split("@");
        String name = parts[0];
        String domain = parts[1];
        if (name.length() <= 2) {
            return name.charAt(0) + "***@" + domain;
        }
        return name.substring(0, 2) + "***" + name.charAt(name.length() - 1) + "@" + domain;
    }
}
