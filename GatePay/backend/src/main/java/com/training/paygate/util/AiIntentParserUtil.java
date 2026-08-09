package com.training.paygate.util;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class AiIntentParserUtil {

    /**
     * Detect user intent to determine which action button to show on frontend.
     */
    public static String detectAction(String prompt) {
        if (prompt == null) return null;
        String lower = prompt.toLowerCase();
        if (lower.matches(".*(vault|hũ|tích lũy|tiết kiệm|tiet kiem|tich luy).*")) return "VAULT";
        if (lower.matches(".*(loan|vay|giải ngân|tín dụng|giai ngan|tra no).*")) return "LOAN";
        if (lower.matches(".*(voucher|ưu đãi|giảm giá|uu dai|doi diem|điểm thưởng).*")) return "VOUCHER";
        if (lower.matches(".*(bill|điện|nước|internet|hóa đơn|hoa don).*")) return "BILL";
        if (lower.matches(".*(admin|quản trị|ledger|sổ cái|doanh nghiệp|merchant).*")) return "ADMIN";
        if (lower.matches(".*(recurring|auto.?pay|tự động|dinh ky).*")) return "RECURRING";
        if (lower.matches(".*(top.?up|recharge|deposit|vietqr|nạp tiền|nap tien).*")) return "TOPUP";
        if (lower.matches(".*(transfer|send|pay|chuyển|gửi tiền|chuyen tien).*")) return "TRANSFER";
        return null;
    }

    public static Long extractAmount(String prompt) {
        if (prompt == null || prompt.trim().isEmpty()) return null;

        // 1. Check for million format (e.g. 3tr, 3 triệu, 3.5tr, 3,5 triệu, 3.000.000)
        Pattern millionPattern = Pattern.compile("(\\d+(?:[.,]\\d+)?)\\s*(tr|triệu|trieu)", Pattern.CASE_INSENSITIVE);
        Matcher millionMatcher = millionPattern.matcher(prompt);
        if (millionMatcher.find()) {
            try {
                String valStr = millionMatcher.group(1).replace(",", ".");
                double val = Double.parseDouble(valStr);
                return Math.round(val * 1_000_000);
            } catch (NumberFormatException ignored) {}
        }

        // 2. Check for thousand format (e.g. 500k, 3000k, 500 nghìn, 500 ngàn)
        Pattern thousandPattern = Pattern.compile("(\\d+(?:[.,]\\d+)?)\\s*(k|nghìn|ngàn|ngan)", Pattern.CASE_INSENSITIVE);
        Matcher thousandMatcher = thousandPattern.matcher(prompt);
        if (thousandMatcher.find()) {
            try {
                String valStr = thousandMatcher.group(1).replace(",", ".");
                double val = Double.parseDouble(valStr);
                return Math.round(val * 1_000);
            } catch (NumberFormatException ignored) {}
        }

        // 3. Check for standalone explicit full number (e.g. 3.000.000 or 3,000,000 or 3000000)
        String digitsOnlyPrompt = prompt.replaceAll("[^0-9]", "");
        if (digitsOnlyPrompt.length() >= 4) {
            try {
                long fullNum = Long.parseLong(digitsOnlyPrompt);
                if (fullNum >= 1000) {
                    return fullNum;
                }
            } catch (NumberFormatException ignored) {}
        }

        // 4. Fallback for standalone small numbers < 1000 without unit (e.g. "chuyển 500 đi", "chuyển 300")
        Pattern simpleNumPattern = Pattern.compile("\\b(\\d{1,3})\\b");
        Matcher simpleNumMatcher = simpleNumPattern.matcher(prompt);
        if (simpleNumMatcher.find()) {
            try {
                long num = Long.parseLong(simpleNumMatcher.group(1));
                if (num > 0 && num < 1000) {
                    return num * 1000;
                }
            } catch (NumberFormatException ignored) {}
        }

        return null;
    }

    public static String extractRecipient(String prompt) {
        if (prompt == null || prompt.trim().isEmpty()) return null;

        // Matches: cho/đến/tới/to/account <RecipientNameOrAccount>
        Pattern pattern = Pattern.compile("(?i)(?:cho|đến|den|tới|toi|to|account)\\s+([\\p{L}0-9._-]+)", Pattern.UNICODE_CHARACTER_CLASS);
        Matcher matcher = pattern.matcher(prompt);
        if (matcher.find()) {
            String match = matcher.group(1).trim();
            String lower = match.toLowerCase();
            // Filter out common pronouns and stop words
            if (lower.equals("tôi") || lower.equals("toi") || lower.equals("mình") || lower.equals("minh")
                    || lower.equals("ta") || lower.equals("người") || lower.equals("nguoi")
                    || lower.equals("ai") || lower.equals("t") || match.length() <= 1) {
                return null;
            }
            return match;
        }
        return null;
    }
}
