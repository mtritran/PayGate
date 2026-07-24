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

        String subject = "[PayGate] Successful Transfer Alert - Ref: " + transactionRef;
        String htmlContent = String.format("""
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Payment Notification</title>
            </head>
            <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; -webkit-font-smoothing: antialiased;">
                <table border="0" cellpadding="0" cellspacing="0" width="100%%" style="background-color: #f1f5f9; padding: 40px 10px;">
                    <tr>
                        <td align="center">
                            <table border="0" cellpadding="0" cellspacing="0" width="100%%" style="max-width: 600px; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 20px 40px rgba(15, 23, 42, 0.1); border: 1px solid #e2e8f0;">
                                <!-- Header Banner -->
                                <tr>
                                    <td style="background: linear-gradient(135deg, #064e3b 0%%, #047857 60%%, #065f46 100%%); padding: 36px 40px; text-align: center;">
                                        <div style="display: inline-block; background: rgba(255,255,255,0.15); padding: 8px 16px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.25); margin-bottom: 12px;">
                                            <span style="color: #a7f3d0; font-size: 13px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase;">PAYGATE DIGITAL BANKING</span>
                                        </div>
                                        <h1 style="color: #ffffff; font-size: 24px; font-weight: 800; margin: 0; letter-spacing: -0.02em;">Payment Receipt & Transfer Log</h1>
                                    </td>
                                </tr>

                                <!-- Content Body -->
                                <tr>
                                    <td style="padding: 36px 40px; color: #0f172a;">
                                        <p style="font-size: 15px; margin: 0 0 16px 0; color: #334155;">Hello <strong style="color: #0f172a;">%s</strong>,</p>
                                        <p style="font-size: 15px; margin: 0 0 24px 0; color: #475569; line-height: 1.6;">Your money transfer request was processed successfully on the PayGate ledger network.</p>

                                        <!-- Amount Highlight Box -->
                                        <table border="0" cellpadding="0" cellspacing="0" width="100%%" style="background: linear-gradient(135deg, #ecfdf5 0%%, #f0fdf4 100%%); border: 1px solid #a7f3d0; border-radius: 18px; margin-bottom: 28px; padding: 24px; text-align: center;">
                                            <tr>
                                                <td>
                                                    <span style="font-size: 12px; font-weight: 800; color: #047857; text-transform: uppercase; letter-spacing: 0.08em; display: block; margin-bottom: 6px;">Transferred Amount</span>
                                                    <span style="font-size: 32px; font-weight: 900; color: #059669; letter-spacing: -0.02em;">-%s</span>
                                                </td>
                                            </tr>
                                        </table>

                                        <!-- Details Table -->
                                        <table border="0" cellpadding="0" cellspacing="0" width="100%%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; margin-bottom: 28px;">
                                            <tr>
                                                <td style="padding: 8px 0; color: #64748b; font-size: 13px; font-weight: 600;">Transaction Ref:</td>
                                                <td align="right" style="padding: 8px 0; color: #0f172a; font-size: 14px; font-weight: 800; font-family: monospace;">%s</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; color: #64748b; font-size: 13px; font-weight: 600;">Recipient Account:</td>
                                                <td align="right" style="padding: 8px 0; color: #059669; font-size: 14px; font-weight: 800; font-family: monospace;">%s</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; color: #64748b; font-size: 13px; font-weight: 600;">Note / Description:</td>
                                                <td align="right" style="padding: 8px 0; color: #0f172a; font-size: 13px; font-weight: 700;">%s</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; color: #64748b; font-size: 13px; font-weight: 600;">Date & Time:</td>
                                                <td align="right" style="padding: 8px 0; color: #334155; font-size: 13px; font-weight: 700;">%s</td>
                                            </tr>
                                        </table>

                                        <p style="font-size: 13px; color: #64748b; line-height: 1.5; margin: 0; background: #f1f5f9; padding: 14px 18px; border-radius: 12px; border-left: 4px solid #059669;">
                                            🔒 <strong>Security Notice:</strong> If you did not authorize this payment, please report to PayGate Customer Security Team immediately.
                                        </p>
                                    </td>
                                </tr>

                                <!-- Footer -->
                                <tr>
                                    <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px 40px; text-align: center;">
                                        <p style="font-size: 12px; color: #94a3b8; margin: 0 0 6px 0; font-weight: 600;">PayGate Enterprise Digital Banking Gateway System</p>
                                        <p style="font-size: 11px; color: #cbd5e1; margin: 0;">&copy; 2026 PayGate Inc. All rights reserved. 256-Bit SSL Encrypted Ledger.</p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </body>
            </html>
            """,
            senderUsername,
            formattedAmount,
            transactionRef,
            recipientAccountNo,
            description != null && !description.isBlank() ? description : "Direct Money Transfer",
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
        String statusBg = isApproved ? "#ecfdf5" : "#fef2f2";
        String statusBorder = isApproved ? "#a7f3d0" : "#fecaca";
        String statusColor = isApproved ? "#059669" : "#dc2626";
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss"));

        String subject = String.format("[PayGate] Merchant Application %s - %s (%s)", statusStr, merchantName, merchantCode);
        String htmlContent = String.format("""
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Merchant Review Notification</title>
            </head>
            <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; -webkit-font-smoothing: antialiased;">
                <table border="0" cellpadding="0" cellspacing="0" width="100%%" style="background-color: #f1f5f9; padding: 40px 10px;">
                    <tr>
                        <td align="center">
                            <table border="0" cellpadding="0" cellspacing="0" width="100%%" style="max-width: 600px; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 20px 40px rgba(15, 23, 42, 0.1); border: 1px solid #e2e8f0;">
                                <!-- Header Banner -->
                                <tr>
                                    <td style="background: linear-gradient(135deg, #0f172a 0%%, #1e293b 60%%, #047857 100%%); padding: 36px 40px; text-align: center;">
                                        <div style="display: inline-block; background: rgba(255,255,255,0.12); padding: 8px 16px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.2); margin-bottom: 12px;">
                                            <span style="color: #a7f3d0; font-size: 13px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase;">ENTERPRISE MERCHANT PORTAL</span>
                                        </div>
                                        <h1 style="color: #ffffff; font-size: 24px; font-weight: 800; margin: 0; letter-spacing: -0.02em;">Merchant Registration Status Update</h1>
                                    </td>
                                </tr>

                                <!-- Content Body -->
                                <tr>
                                    <td style="padding: 36px 40px; color: #0f172a;">
                                        <p style="font-size: 15px; margin: 0 0 16px 0; color: #334155;">Dear Representative of <strong style="color: #0f172a;">%s</strong>,</p>
                                        <p style="font-size: 15px; margin: 0 0 24px 0; color: #475569; line-height: 1.6;">Your enterprise partner registration request has been evaluated by the PayGate Onboarding Administration Team.</p>

                                        <!-- Status Highlight Box -->
                                        <table border="0" cellpadding="0" cellspacing="0" width="100%%" style="background: %s; border: 2px solid %s; border-radius: 18px; margin-bottom: 28px; padding: 22px; text-align: center;">
                                            <tr>
                                                <td>
                                                    <span style="font-size: 12px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.08em; display: block; margin-bottom: 6px;">Evaluation Decision</span>
                                                    <span style="font-size: 28px; font-weight: 900; color: %s; letter-spacing: 0.04em;">%s</span>
                                                </td>
                                            </tr>
                                        </table>

                                        <!-- Details Table -->
                                        <table border="0" cellpadding="0" cellspacing="0" width="100%%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; margin-bottom: 28px;">
                                            <tr>
                                                <td style="padding: 8px 0; color: #64748b; font-size: 13px; font-weight: 600;">Enterprise Name:</td>
                                                <td align="right" style="padding: 8px 0; color: #0f172a; font-size: 14px; font-weight: 800;">%s</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; color: #64748b; font-size: 13px; font-weight: 600;">Merchant Code:</td>
                                                <td align="right" style="padding: 8px 0; color: #059669; font-size: 14px; font-weight: 800; font-family: monospace;">%s</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; color: #64748b; font-size: 13px; font-weight: 600;">Review Timestamp:</td>
                                                <td align="right" style="padding: 8px 0; color: #334155; font-size: 13px; font-weight: 700;">%s</td>
                                            </tr>
                                        </table>

                                        <!-- Custom Decision Message -->
                                        %s
                                    </td>
                                </tr>

                                <!-- Footer -->
                                <tr>
                                    <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px 40px; text-align: center;">
                                        <p style="font-size: 12px; color: #94a3b8; margin: 0 0 6px 0; font-weight: 600;">PayGate Enterprise Merchant Onboarding System</p>
                                        <p style="font-size: 11px; color: #cbd5e1; margin: 0;">&copy; 2026 PayGate Inc. All rights reserved.</p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </body>
            </html>
            """,
            merchantName,
            statusBg,
            statusBorder,
            statusColor,
            statusStr,
            merchantName,
            merchantCode,
            timestamp,
            isApproved 
                ? """
                  <div style="background: #f0fdf4; border: 1px solid #a7f3d0; padding: 18px 20px; border-radius: 14px; color: #047857; font-size: 14px; line-height: 1.6;">
                      🎉 <strong>Congratulations!</strong> Your merchant enterprise partner application has been approved. Your merchant API keys and automated wallet receiving node are now fully active.
                  </div>
                  """ 
                : """
                  <div style="background: #fef2f2; border: 1px solid #fecaca; padding: 18px 20px; border-radius: 14px; color: #b91c1c; font-size: 14px; line-height: 1.6;">
                      ⚠️ <strong>Registration Notice:</strong> Unfortunately, your merchant application could not be approved at this time. Please verify your business tax registration details and re-submit.
                  </div>
                  """
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
