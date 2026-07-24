package com.training.paygate.service.impl;

import com.training.paygate.service.EmailService;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.text.NumberFormat;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailServiceImpl implements EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username:noreply@paygate.dev}")
    private String fromEmail;

    @Override
    @Async
    public void sendPaymentSuccessEmail(
            String recipientEmail,
            String senderUsername,
            String transactionRef,
            BigDecimal amount,
            String recipientAccountNo,
            String description
    ) {
        if (recipientEmail == null || recipientEmail.isBlank()) {
            log.warn("Cannot send payment success email: recipientEmail is empty for transaction {}", transactionRef);
            return;
        }

        String formattedAmount = formatVnd(amount);
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss"));

        String subject = "[PayGate] Notification: Successful Money Transfer " + transactionRef;
        String htmlContent = String.format("""
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: 'Arial', sans-serif; background-color: #f4f6f8; margin: 0; padding: 20px; color: #333; }
                    .card { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 32px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
                    .header { text-align: center; padding-bottom: 20px; border-bottom: 2px solid #ecfdf5; }
                    .header h2 { color: #059669; margin: 0; font-size: 22px; }
                    .amount-box { background: #f0fdf4; border: 1px solid #a7f3d0; border-radius: 12px; padding: 18px; text-align: center; margin: 24px 0; }
                    .amount-val { font-size: 28px; font-weight: bold; color: #059669; margin: 4px 0 0 0; }
                    .detail-row { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 14px; }
                    .detail-lbl { color: #64748b; font-weight: 600; }
                    .detail-val { color: #0f172a; font-weight: 700; }
                    .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 16px; }
                </style>
            </head>
            <body>
                <div class="card">
                    <div class="header">
                        <h2>PayGate Banking Notification</h2>
                    </div>
                    <p>Dear <strong>%s</strong>,</p>
                    <p>Your money transfer transaction has been processed successfully.</p>
                    
                    <div class="amount-box">
                        <div style="font-size: 13px; color: #047857; text-transform: uppercase; font-weight: bold;">Transferred Amount</div>
                        <div class="amount-val">-%s</div>
                    </div>
                    
                    <div class="detail-row"><span class="detail-lbl">Transaction Ref:</span><span class="detail-val">%s</span></div>
                    <div class="detail-row"><span class="detail-lbl">Recipient Account:</span><span class="detail-val">%s</span></div>
                    <div class="detail-row"><span class="detail-lbl">Description:</span><span class="detail-val">%s</span></div>
                    <div class="detail-row"><span class="detail-lbl">Time:</span><span class="detail-val">%s</span></div>
                    
                    <p style="margin-top: 24px; font-size: 13px; color: #64748b;">If you did not make this transaction, please contact PayGate Support immediately.</p>
                    
                    <div class="footer">
                        &copy; 2026 PayGate Digital Banking Gateway. All rights reserved.
                    </div>
                </div>
            </body>
            </html>
            """,
            senderUsername,
            formattedAmount,
            transactionRef,
            recipientAccountNo,
            description != null ? description : "Direct Money Transfer",
            timestamp
        );

        sendMimeEmail(recipientEmail, subject, htmlContent);
    }

    @Override
    @Async
    public void sendMerchantApprovalEmail(
            String recipientEmail,
            String merchantName,
            String merchantCode,
            boolean isApproved
    ) {
        if (recipientEmail == null || recipientEmail.isBlank()) {
            log.warn("Cannot send merchant approval email: recipientEmail is empty for merchantCode {}", merchantCode);
            return;
        }

        String statusStr = isApproved ? "APPROVED" : "REJECTED";
        String statusColor = isApproved ? "#059669" : "#dc2626";
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss"));

        String subject = String.format("[PayGate] Merchant Request %s: %s (%s)", statusStr, merchantName, merchantCode);
        String htmlContent = String.format("""
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: 'Arial', sans-serif; background-color: #f4f6f8; margin: 0; padding: 20px; color: #333; }
                    .card { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 32px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
                    .header { text-align: center; padding-bottom: 20px; border-bottom: 2px solid #e2e8f0; }
                    .header h2 { color: #0f172a; margin: 0; font-size: 22px; }
                    .status-box { background: #f8fafc; border: 2px solid %s; border-radius: 12px; padding: 18px; text-align: center; margin: 24px 0; }
                    .status-val { font-size: 24px; font-weight: bold; color: %s; margin: 4px 0 0 0; }
                    .detail-row { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 14px; }
                    .detail-lbl { color: #64748b; font-weight: 600; }
                    .detail-val { color: #0f172a; font-weight: 700; }
                    .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 16px; }
                </style>
            </head>
            <body>
                <div class="card">
                    <div class="header">
                        <h2>PayGate Merchant Partner Review</h2>
                    </div>
                    <p>Dear Partner,</p>
                    <p>Your request to register enterprise merchant account has been reviewed by PayGate Admin.</p>
                    
                    <div class="status-box">
                        <div style="font-size: 13px; color: #64748b; text-transform: uppercase; font-weight: bold;">Review Decision</div>
                        <div class="status-val">%s</div>
                    </div>
                    
                    <div class="detail-row"><span class="detail-lbl">Merchant Name:</span><span class="detail-val">%s</span></div>
                    <div class="detail-row"><span class="detail-lbl">Merchant Code:</span><span class="detail-val">%s</span></div>
                    <div class="detail-row"><span class="detail-lbl">Reviewed At:</span><span class="detail-val">%s</span></div>
                    
                    %s
                    
                    <div class="footer">
                        &copy; 2026 PayGate Merchant Partner Platform. All rights reserved.
                    </div>
                </div>
            </body>
            </html>
            """,
            statusColor,
            statusColor,
            statusStr,
            merchantName,
            merchantCode,
            timestamp,
            isApproved 
                ? "<p style=\"color: #059669; font-weight: bold; margin-top: 20px;\">Congratulations! Your merchant account and payment gateway API keys are now active. You can start accepting online payments immediately.</p>" 
                : "<p style=\"color: #dc2626; font-weight: bold; margin-top: 20px;\">Unfortunately, your merchant registration request was not approved. Please verify your business tax code and phone info before re-submitting.</p>"
        );

        sendMimeEmail(recipientEmail, subject, htmlContent);
    }

    private void sendMimeEmail(String to, String subject, String htmlContent) {
        log.info("[EMAIL NOTIFICATION] Sending email to: '{}' | Subject: '{}'", to, subject);
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromEmail != null && !fromEmail.isBlank() ? fromEmail : "noreply@paygate.dev");
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(htmlContent, true);

            mailSender.send(message);
            log.info("[EMAIL NOTIFICATION SUCCESS] Email successfully dispatched to '{}'", to);
        } catch (Exception e) {
            log.warn("[EMAIL NOTIFICATION NOTICE] Could not deliver email via SMTP server ({}). Reason: {}", to, e.getMessage());
        }
    }

    private String formatVnd(BigDecimal amount) {
        if (amount == null) return "0 ₫";
        NumberFormat formatter = NumberFormat.getCurrencyInstance(new Locale("vi", "VN"));
        return formatter.format(amount);
    }
}
