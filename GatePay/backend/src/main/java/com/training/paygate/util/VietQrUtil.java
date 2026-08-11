package com.training.paygate.util;

import java.math.BigDecimal;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

/**
 * Pure utility class for VietQR QuickLink URL generation and EMVCo payload construction.
 * All bank account configurations are injected via {@link com.training.paygate.config.VietQrProperties}.
 */
public class VietQrUtil {

    /**
     * Generates a standard VietQR QuickLink image URL for VietQR scanning across all Vietnam banking apps.
     */
    public static String generateVietQrUrl(String bankBin, String accountNumber, BigDecimal amount, String transferContent, String accountName) {
        String bin = bankBin != null ? bankBin : "";
        String acc = accountNumber != null ? accountNumber : "";
        String name = accountName != null ? accountName : "";
        String amt = (amount != null) ? amount.toPlainString() : "0";

        try {
            String encodedAddInfo = URLEncoder.encode(transferContent != null ? transferContent : "", StandardCharsets.UTF_8);
            String encodedAccountName = URLEncoder.encode(name, StandardCharsets.UTF_8);
            return String.format("https://img.vietqr.io/image/%s-%s-compact2.png?amount=%s&addInfo=%s&accountName=%s",
                    bin, acc, amt, encodedAddInfo, encodedAccountName);
        } catch (Exception e) {
            return String.format("https://img.vietqr.io/image/%s-%s-compact2.png?amount=%s", bin, acc, amt);
        }
    }

    /**
     * Generates standard EMVCo VietQR string payload.
     */
    public static String generateEmvCoPayload(String bankBin, String accountNumber, BigDecimal amount, String transferContent, String accountName) {
        String bin = bankBin != null ? bankBin : "";
        String acc = accountNumber != null ? accountNumber : "";
        String amt = (amount != null) ? amount.toPlainString() : "0";

        StringBuilder sb = new StringBuilder();
        sb.append(formatTag("00", "01")); // Payload Format Indicator
        sb.append(formatTag("01", "12")); // Dynamic QR Code

        // Merchant Account Information (Tag 38 - Napas)
        StringBuilder napas38 = new StringBuilder();
        napas38.append(formatTag("00", "A000000727")); // Napas AID
        
        StringBuilder sub01 = new StringBuilder();
        sub01.append(formatTag("00", bin));
        sub01.append(formatTag("01", acc));
        napas38.append(formatTag("01", sub01.toString()));
        napas38.append(formatTag("02", "QRIBFTTA")); // Service Code

        sb.append(formatTag("38", napas38.toString()));
        sb.append(formatTag("53", "704")); // Currency VND
        sb.append(formatTag("54", amt)); // Transaction Amount
        sb.append(formatTag("58", "VN")); // Country Code

        if (accountName != null && !accountName.isBlank()) {
            sb.append(formatTag("59", accountName.length() > 25 ? accountName.substring(0, 25) : accountName));
        }

        // Additional Data (Tag 62)
        if (transferContent != null && !transferContent.isBlank()) {
            StringBuilder tag62 = new StringBuilder();
            tag62.append(formatTag("08", transferContent));
            sb.append(formatTag("62", tag62.toString()));
        }

        sb.append("6304"); // CRC Tag Header
        String checksum = calculateCrc16Ccitt(sb.toString());
        sb.append(checksum);

        return sb.toString();
    }

    private static String formatTag(String tag, String value) {
        if (value == null) value = "";
        return String.format("%s%02d%s", tag, value.length(), value);
    }

    private static String calculateCrc16Ccitt(String data) {
        int crc = 0xFFFF;
        int polynomial = 0x1021;
        byte[] bytes = data.getBytes(StandardCharsets.UTF_8);

        for (byte b : bytes) {
            for (int i = 0; i < 8; i++) {
                boolean bit = ((b >> (7 - i) & 1) == 1);
                boolean c15 = ((crc >> 15 & 1) == 1);
                crc <<= 1;
                if (c15 ^ bit) crc ^= polynomial;
            }
        }
        crc &= 0xFFFF;
        return String.format("%04X", crc);
    }
}
