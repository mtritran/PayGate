package com.training.paygate.util;

import com.training.paygate.entity.Loan;
import com.training.paygate.entity.LoanSchedule;
import com.training.paygate.entity.User;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.text.NumberFormat;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;

public class LoanContractPdfGenerator {

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    public static byte[] generateContractPdf(Loan loan, User user, List<LoanSchedule> schedules) throws IOException {
        try (PDDocument document = new PDDocument()) {
            PDType1Font fontBold = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);
            PDType1Font fontRegular = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
            PDType1Font fontOblique = new PDType1Font(Standard14Fonts.FontName.HELVETICA_OBLIQUE);

            // --- PAGE 1: GENERAL AGREEMENT & TERMS ---
            PDPage page1 = new PDPage(PDRectangle.A4);
            document.addPage(page1);

            try (PDPageContentStream cs = new PDPageContentStream(document, page1)) {
                float y = 800;

                // Header Header Banner
                cs.setFont(fontBold, 12);
                drawTextCentered(cs, "SOCIALIST REPUBLIC OF VIETNAM", 50, y, PDRectangle.A4.getWidth(), fontBold, 12);
                y -= 16;
                cs.setFont(fontBold, 11);
                drawTextCentered(cs, "Independence - Freedom - Happiness", 50, y, PDRectangle.A4.getWidth(), fontBold, 11);
                y -= 25;

                // Title
                cs.setFont(fontBold, 16);
                drawTextCentered(cs, "CONSUMER LOAN AGREEMENT", 50, y, PDRectangle.A4.getWidth(), fontBold, 16);
                y -= 18;
                cs.setFont(fontOblique, 10);
                drawTextCentered(cs, "Digital Banking & Consumer Credit Service Protocol", 50, y, PDRectangle.A4.getWidth(), fontOblique, 10);
                y -= 25;

                // Contract Ref
                cs.setFont(fontBold, 10);
                cs.beginText();
                cs.newLineAtOffset(50, y);
                cs.showText("Contract Reference: " + cleanText(loan.getLoanRef()));
                cs.endText();

                cs.setFont(fontRegular, 10);
                cs.beginText();
                cs.newLineAtOffset(350, y);
                cs.showText("Date: " + (loan.getDisbursedAt() != null ? loan.getDisbursedAt().format(DATE_FMT) : loan.getCreatedAt().format(DATE_FMT)));
                cs.endText();
                y -= 20;

                // Divider Line
                cs.setLineWidth(1.2f);
                cs.moveTo(50, y);
                cs.lineTo(545, y);
                cs.stroke();
                y -= 25;

                // PARTIES
                cs.setFont(fontBold, 11);
                cs.beginText();
                cs.newLineAtOffset(50, y);
                cs.showText("PARTIES TO THE AGREEMENT:");
                cs.endText();
                y -= 20;

                // Party A
                cs.setFont(fontBold, 10);
                cs.beginText(); cs.newLineAtOffset(50, y); cs.showText("PARTY A (LENDER): PAYGATE FINANCIAL TECHNOLOGY CORP"); cs.endText(); y -= 15;
                cs.setFont(fontRegular, 9.5f);
                cs.beginText(); cs.newLineAtOffset(65, y); cs.showText("License: Digital Financial Gateway Institution No. 88/GP-NHNN"); cs.endText(); y -= 14;
                cs.beginText(); cs.newLineAtOffset(65, y); cs.showText("Address: Financial District Tower, Technopark Expressway, VN"); cs.endText(); y -= 14;
                cs.beginText(); cs.newLineAtOffset(65, y); cs.showText("Email Support: credit-support@paygate.dev | Hotline: 1900-PAYGATE"); cs.endText(); y -= 22;

                // Party B
                cs.setFont(fontBold, 10);
                cs.beginText(); cs.newLineAtOffset(50, y); cs.showText("PARTY B (BORROWER): CUSTOMER ACCOUNT HOLDER"); cs.endText(); y -= 15;
                cs.setFont(fontRegular, 9.5f);
                cs.beginText(); cs.newLineAtOffset(65, y); cs.showText("Full Name / Account Holder: " + cleanText(user.getFullName() != null ? user.getFullName() : user.getUsername())); cs.endText(); y -= 14;
                cs.beginText(); cs.newLineAtOffset(65, y); cs.showText("Username / User ID: " + cleanText(user.getUsername()) + " (ID: #" + user.getId() + ")"); cs.endText(); y -= 14;
                cs.beginText(); cs.newLineAtOffset(65, y); cs.showText("Registered Email: " + cleanText(user.getEmail() != null ? user.getEmail() : "N/A")); cs.endText(); y -= 22;

                // ARTICLE 1
                cs.setFont(fontBold, 11);
                cs.beginText(); cs.newLineAtOffset(50, y); cs.showText("ARTICLE 1: LOAN SPECIFICATIONS & DISBURSEMENT"); cs.endText(); y -= 18;

                cs.setFont(fontRegular, 9.5f);
                drawBulletPoint(cs, "Principal Amount:", formatVnd(loan.getAmount()), 65, y, fontBold); y -= 16;
                drawBulletPoint(cs, "Loan Duration / Term:", loan.getTermMonths() + " Months", 65, y, fontBold); y -= 16;
                drawBulletPoint(cs, "Fixed Annual Interest Rate:", loan.getInterestRate() + "% / Year (1% / Month)", 65, y, fontBold); y -= 16;
                drawBulletPoint(cs, "Monthly Installment Amount:", formatVnd(loan.getMonthlyAmount()), 65, y, fontBold); y -= 16;
                drawBulletPoint(cs, "Total Repayable Amount:", formatVnd(loan.getTotalRepayable()), 65, y, fontBold); y -= 16;
                drawBulletPoint(cs, "Disbursement Target Node:", "PayGate Digital Wallet Account (Instant Credit)", 65, y, fontRegular); y -= 16;
                drawBulletPoint(cs, "Stated Loan Purpose:", (loan.getReason() != null ? loan.getReason() : "Personal Consumer Expenses"), 65, y, fontRegular); y -= 25;

                // ARTICLE 2 PREVIEW
                cs.setFont(fontBold, 11);
                cs.beginText(); cs.newLineAtOffset(50, y); cs.showText("ARTICLE 2: INTEREST CALCULATION & REPAYMENT METHOD"); cs.endText(); y -= 18;
                cs.setFont(fontRegular, 9.5f);
                cs.beginText(); cs.newLineAtOffset(65, y); cs.showText("1. Interest is calculated using equal monthly installment method with fixed 12%/year rate."); cs.endText(); y -= 14;
                cs.beginText(); cs.newLineAtOffset(65, y); cs.showText("2. Party B agrees to maintain sufficient balance in PayGate Wallet on each due date."); cs.endText(); y -= 14;
                cs.beginText(); cs.newLineAtOffset(65, y); cs.showText("3. Automated debit authorization is enabled for recurring installment collection."); cs.endText(); y -= 20;

                // Footer page 1
                drawFooter(cs, 1, 3);
            }

            // --- PAGE 2: REPAYMENT SCHEDULE TABLE ---
            PDPage page2 = new PDPage(PDRectangle.A4);
            document.addPage(page2);

            try (PDPageContentStream cs = new PDPageContentStream(document, page2)) {
                float y = 800;

                cs.setFont(fontBold, 12);
                drawTextCentered(cs, "LOAN REPAYMENT SCHEDULE & INSTALLMENT BREAKDOWN", 50, y, PDRectangle.A4.getWidth(), fontBold, 12);
                y -= 16;
                cs.setFont(fontRegular, 9.5f);
                drawTextCentered(cs, "Contract Reference: " + loan.getLoanRef() + " | Borrower: " + user.getUsername(), 50, y, PDRectangle.A4.getWidth(), fontRegular, 9.5f);
                y -= 25;

                // Draw Schedule Table Header
                cs.setLineWidth(1.0f);
                cs.setNonStrokingColor(240 / 255.0f, 240 / 255.0f, 240 / 255.0f);
                cs.addRect(50, y - 20, 495, 22);
                cs.fill();
                cs.setNonStrokingColor(0.0f, 0.0f, 0.0f);

                cs.setFont(fontBold, 9);
                cs.beginText(); cs.newLineAtOffset(60, y - 14); cs.showText("Period"); cs.endText();
                cs.beginText(); cs.newLineAtOffset(110, y - 14); cs.showText("Due Date"); cs.endText();
                cs.beginText(); cs.newLineAtOffset(210, y - 14); cs.showText("Principal (VND)"); cs.endText();
                cs.beginText(); cs.newLineAtOffset(320, y - 14); cs.showText("Interest (VND)"); cs.endText();
                cs.beginText(); cs.newLineAtOffset(430, y - 14); cs.showText("Total Due (VND)"); cs.endText();
                y -= 22;

                // Draw Table Rows
                cs.setFont(fontRegular, 8.5f);
                if (schedules != null && !schedules.isEmpty()) {
                    for (LoanSchedule s : schedules) {
                        if (y < 120) break; // Limit rows if exceeded page
                        cs.moveTo(50, y); cs.lineTo(545, y); cs.stroke();

                        cs.beginText(); cs.newLineAtOffset(60, y - 12); cs.showText("Month " + s.getPeriodNumber()); cs.endText();
                        cs.beginText(); cs.newLineAtOffset(110, y - 12); cs.showText(s.getDueDate() != null ? s.getDueDate().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")) : "N/A"); cs.endText();
                        cs.beginText(); cs.newLineAtOffset(210, y - 12); cs.showText(formatVnd(s.getAmountDue().multiply(new BigDecimal("0.85")))); cs.endText();
                        cs.beginText(); cs.newLineAtOffset(320, y - 12); cs.showText(formatVnd(s.getAmountDue().multiply(new BigDecimal("0.15")))); cs.endText();
                        cs.beginText(); cs.newLineAtOffset(430, y - 12); cs.showText(formatVnd(s.getAmountDue())); cs.endText();
                        y -= 18;
                    }
                }
                cs.moveTo(50, y); cs.lineTo(545, y); cs.stroke();
                y -= 25;

                // Summary Note
                cs.setFont(fontBold, 10);
                cs.beginText(); cs.newLineAtOffset(50, y); cs.showText("ARTICLE 3: EARLY REPAYMENT & LATE PENALTY TERMS"); cs.endText(); y -= 18;
                cs.setFont(fontRegular, 9.5f);
                cs.beginText(); cs.newLineAtOffset(65, y); cs.showText("1. Prepayment / Full Settlement: Party B may settle full remaining principal anytime with 0% penalty."); cs.endText(); y -= 14;
                cs.beginText(); cs.newLineAtOffset(65, y); cs.showText("2. Late Penalty: Overdue installments incur 0.05%/day late interest fee on remaining balance."); cs.endText(); y -= 14;
                cs.beginText(); cs.newLineAtOffset(65, y); cs.showText("3. Default Action: Continuous 60-day delinquency will result in credit score freeze."); cs.endText(); y -= 20;

                drawFooter(cs, 2, 3);
            }

            // --- PAGE 3: LEGAL RIGHTS & DIGITAL SIGNATURE STAMP ---
            PDPage page3 = new PDPage(PDRectangle.A4);
            document.addPage(page3);

            try (PDPageContentStream cs = new PDPageContentStream(document, page3)) {
                float y = 800;

                cs.setFont(fontBold, 11);
                cs.beginText(); cs.newLineAtOffset(50, y); cs.showText("ARTICLE 4: RIGHTS AND OBLIGATIONS OF PARTIES"); cs.endText(); y -= 18;

                cs.setFont(fontRegular, 9.5f);
                cs.beginText(); cs.newLineAtOffset(65, y); cs.showText("1. Party A has the right to inspect disbursement usage and enforce collection upon due date."); cs.endText(); y -= 14;
                cs.beginText(); cs.newLineAtOffset(65, y); cs.showText("2. Party A commits to confidential encryption of Party B's personal banking credentials."); cs.endText(); y -= 14;
                cs.beginText(); cs.newLineAtOffset(65, y); cs.showText("3. Party B has the right to receive full disbursed funds without unauthorized deductions."); cs.endText(); y -= 14;
                cs.beginText(); cs.newLineAtOffset(65, y); cs.showText("4. Party B commits to timely repayment as stipulated in Article 2 schedule."); cs.endText(); y -= 25;

                cs.setFont(fontBold, 11);
                cs.beginText(); cs.newLineAtOffset(50, y); cs.showText("ARTICLE 5: DISPUTE RESOLUTION & E-SIGNATURE VALIDITY"); cs.endText(); y -= 18;
                cs.setFont(fontRegular, 9.5f);
                cs.beginText(); cs.newLineAtOffset(65, y); cs.showText("1. This agreement is executed electronically in accordance with Law on E-Transactions."); cs.endText(); y -= 14;
                cs.beginText(); cs.newLineAtOffset(65, y); cs.showText("2. OTP / Biometric authentication by Party B on PayGate App constitutes legally binding signature."); cs.endText(); y -= 14;
                cs.beginText(); cs.newLineAtOffset(65, y); cs.showText("3. Disputes shall be resolved at Commercial Arbitration Center of Vietnam."); cs.endText(); y -= 45;

                // Signatures Section
                float sigY = y;
                cs.setFont(fontBold, 10);
                cs.beginText(); cs.newLineAtOffset(80, sigY); cs.showText("PARTY A (LENDER)"); cs.endText();
                cs.beginText(); cs.newLineAtOffset(360, sigY); cs.showText("PARTY B (BORROWER)"); cs.endText();
                sigY -= 14;

                cs.setFont(fontOblique, 8.5f);
                cs.beginText(); cs.newLineAtOffset(65, sigY); cs.showText("(Digitally Signed & Certified)"); cs.endText();
                cs.beginText(); cs.newLineAtOffset(350, sigY); cs.showText("(Confirmed & E-Signed via App)"); cs.endText();
                sigY -= 50;

                // Party A Stamp Box
                cs.setLineWidth(1.5f);
                cs.setNonStrokingColor(240 / 255.0f, 253 / 255.0f, 244 / 255.0f);
                cs.addRect(60, sigY - 25, 170, 50);
                cs.fill();
                cs.setStrokingColor(5 / 255.0f, 150 / 255.0f, 105 / 255.0f);
                cs.addRect(60, sigY - 25, 170, 50);
                cs.stroke();

                cs.setFont(fontBold, 9);
                cs.setNonStrokingColor(4 / 255.0f, 120 / 255.0f, 87 / 255.0f);
                cs.beginText(); cs.newLineAtOffset(70, sigY + 12); cs.showText("✓ PAYGATE DIGITAL SIGNED"); cs.endText();
                cs.setFont(fontRegular, 7.5f);
                cs.beginText(); cs.newLineAtOffset(70, sigY - 2); cs.showText("Timestamp: " + (loan.getDisbursedAt() != null ? loan.getDisbursedAt().format(DATE_FMT) : "PENDING")); cs.endText();
                cs.beginText(); cs.newLineAtOffset(70, sigY - 14); cs.showText("Certificate ID: PG-CA-998822"); cs.endText();

                // Party B Stamp Box
                cs.setNonStrokingColor(239 / 255.0f, 246 / 255.0f, 255 / 255.0f);
                cs.addRect(340, sigY - 25, 170, 50);
                cs.fill();
                cs.setStrokingColor(37 / 255.0f, 99 / 255.0f, 235 / 255.0f);
                cs.addRect(340, sigY - 25, 170, 50);
                cs.stroke();

                cs.setFont(fontBold, 9);
                cs.setNonStrokingColor(29 / 255.0f, 78 / 255.0f, 216 / 255.0f);
                cs.beginText(); cs.newLineAtOffset(350, sigY + 12); cs.showText("✓ USER E-ACCEPTED & SIGNED"); cs.endText();
                cs.setFont(fontRegular, 7.5f);
                cs.beginText(); cs.newLineAtOffset(350, sigY - 2); cs.showText("User: " + cleanText(user.getUsername())); cs.endText();
                cs.beginText(); cs.newLineAtOffset(350, sigY - 14); cs.showText("Status: FULLY DISBURSED"); cs.endText();

                cs.setNonStrokingColor(0.0f, 0.0f, 0.0f);
                cs.setStrokingColor(0.0f, 0.0f, 0.0f);

                drawFooter(cs, 3, 3);
            }

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            document.save(baos);
            return baos.toByteArray();
        }
    }

    private static String cleanText(String text) {
        if (text == null) return "";
        String normalized = java.text.Normalizer.normalize(text, java.text.Normalizer.Form.NFD);
        String unaccented = normalized.replaceAll("\\p{M}", "");
        unaccented = unaccented.replace('đ', 'd').replace('Đ', 'D');
        return unaccented.replaceAll("[^\\x00-\\x7F]", "");
    }

    private static void drawBulletPoint(PDPageContentStream cs, String label, String value, float x, float y, PDType1Font font) throws IOException {
        String safeLabel = cleanText(label);
        String safeValue = cleanText(value);
        cs.beginText();
        cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 9.5f);
        cs.newLineAtOffset(x, y);
        cs.showText("• " + safeLabel + " ");
        cs.endText();

        float labelWidth = (new PDType1Font(Standard14Fonts.FontName.HELVETICA).getStringWidth("• " + safeLabel + " ") / 1000) * 9.5f;
        cs.beginText();
        cs.setFont(font, 9.5f);
        cs.newLineAtOffset(x + labelWidth, y);
        cs.showText(safeValue);
        cs.endText();
    }

    private static void drawTextCentered(PDPageContentStream cs, String text, float x, float y, float pageWidth, PDType1Font font, float fontSize) throws IOException {
        String safeText = cleanText(text);
        float titleWidth = (font.getStringWidth(safeText) / 1000) * fontSize;
        float startX = (pageWidth - titleWidth) / 2;
        cs.beginText();
        cs.setFont(font, fontSize);
        cs.newLineAtOffset(startX, y);
        cs.showText(safeText);
        cs.endText();
    }

    private static void drawFooter(PDPageContentStream cs, int pageNum, int totalPages) throws IOException {
        cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 8);
        cs.setNonStrokingColor(120, 120, 120);
        cs.beginText();
        cs.newLineAtOffset(50, 30);
        cs.showText("PayGate Digital Banking - Confidential Consumer Loan Agreement Protocol");
        cs.endText();

        cs.beginText();
        cs.newLineAtOffset(500, 30);
        cs.showText("Page " + pageNum + " / " + totalPages);
        cs.endText();
        cs.setNonStrokingColor(0, 0, 0);
    }

    private static String formatVnd(BigDecimal amount) {
        if (amount == null) return "0 VND";
        NumberFormat formatter = NumberFormat.getCurrencyInstance(new Locale("en", "US"));
        return formatter.format(amount).replace("$", "") + " VND";
    }
}
