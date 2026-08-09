package com.training.paygate.util;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

public class HmacUtils {
    /**
     * Tạo chữ ký HMAC-SHA256
     * @param data Dữ liệu gốc (Ví dụ: chuỗi JSON body)
     * @param secretKey Chìa khóa bí mật (API Key)
     * @return Chuỗi chữ ký đã được mã hóa Base64
     */
    public static String generateSignature(String data, String secretKey) {
        try {
            Mac sha256_HMAC = Mac.getInstance("HmacSHA256");
            SecretKeySpec secret_key = new SecretKeySpec(secretKey.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            sha256_HMAC.init(secret_key);
            byte[] hash = sha256_HMAC.doFinal(data.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(hash);
        } catch (Exception e) {
            throw new RuntimeException("Lỗi khi tạo chữ ký HMAC", e);
        }
    }
}
