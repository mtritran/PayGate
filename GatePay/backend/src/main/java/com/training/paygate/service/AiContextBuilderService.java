package com.training.paygate.service;

import com.training.paygate.entity.*;
import com.training.paygate.enums.OwnerType;
import com.training.paygate.enums.TransactionStatus;
import com.training.paygate.enums.TransactionType;
import com.training.paygate.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;

@Service
@Slf4j
@RequiredArgsConstructor
public class AiContextBuilderService {

    private final AccountRepository accountRepository;
    private final TransactionRepository transactionRepository;
    private final UserRepository userRepository;
    private final LinkedBankRepository linkedBankRepository;
    private final RecurringPaymentRepository recurringPaymentRepository;
    private final VaultRepository vaultRepository;
    private final LoanRepository loanRepository;
    private final BillSubscriptionRepository billSubscriptionRepository;
    private final MerchantRepository merchantRepository;

    private static final DateTimeFormatter VN_DATE_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    /**
     * Build deep comprehensive financial & system context for the logged in user across ALL features.
     */
    public String buildFinancialContext(Long reqUserId, String username) {
        try {
            Optional<User> userOpt = Optional.empty();

            if (reqUserId != null) {
                userOpt = userRepository.findById(reqUserId);
            }

            if (userOpt.isEmpty() && username != null) {
                userOpt = userRepository.findByUsername(username);
                if (userOpt.isEmpty()) {
                    List<User> users = userRepository.findAllByUsernameIgnoreCase(username);
                    if (!users.isEmpty()) {
                        userOpt = Optional.of(users.get(0));
                    }
                }
            }

            if (userOpt.isEmpty()) {
                List<User> allUsers = userRepository.findAll();
                if (!allUsers.isEmpty()) {
                    userOpt = Optional.of(allUsers.get(0));
                }
            }

            if (userOpt.isEmpty()) {
                log.warn("User not found by reqUserId={} username={}", reqUserId, username);
                return "";
            }

            User user = userOpt.get();
            Long userId = user.getId();
            String fullName = user.getFullName();
            String email = user.getEmail();
            String role = user.getRole().name();

            Optional<Account> accountOpt = accountRepository.findByOwnerIdAndOwnerType(userId, OwnerType.USER);

            StringBuilder ctx = new StringBuilder();
            ctx.append("=== PAYGATE COMPREHENSIVE SYSTEM & USER CONTEXT ===\n");
            ctx.append("👤 Account Holder: ").append(fullName != null ? fullName : username)
                    .append(" (Username: ").append(username).append(", Email: ").append(email).append(", Role: ").append(role).append(")\n");

            if (accountOpt.isPresent()) {
                Account account = accountOpt.get();
                Long accountId = account.getId();

                ctx.append("🏦 PayGate Account Number: ").append(account.getAccountNumber()).append("\n");
                ctx.append("💰 Available Main Balance: ").append(formatVnd(account.getBalance())).append("\n\n");

                // 1. Savings Vaults Section
                try {
                    List<Vault> vaults = vaultRepository.findByUserIdOrderByCreatedAtDesc(userId);
                    ctx.append("🐷 SAVINGS VAULTS (").append(vaults.size()).append(" vaults):\n");
                    if (vaults.isEmpty()) {
                        ctx.append("   - No active savings vaults.\n");
                    } else {
                        for (Vault v : vaults) {
                            BigDecimal vBal = BigDecimal.ZERO;
                            if (v.getAccountId() != null) {
                                Optional<Account> vAcc = accountRepository.findById(v.getAccountId());
                                if (vAcc.isPresent()) vBal = vAcc.get().getBalance();
                            }
                            ctx.append(String.format("   - [#%d] Name: %s | Saved: %s / Target: %s | Status: %s\n",
                                    v.getId(), v.getName(), formatVnd(vBal), formatVnd(v.getTargetAmount()), v.getStatus()));
                        }
                    }
                    ctx.append("\n");
                } catch (Exception e) {
                    log.warn("Vaults query exception: {}", e.getMessage());
                }

                // 2. Loans & Credit Lines Section
                try {
                    List<Loan> loans = loanRepository.findByUserId(userId, PageRequest.of(0, 10)).getContent();
                    ctx.append("💵 CONSUMER LOANS & CREDIT (").append(loans.size()).append(" loans):\n");
                    if (loans.isEmpty()) {
                        ctx.append("   - No consumer loans on record.\n");
                    } else {
                        for (Loan l : loans) {
                            ctx.append(String.format("   - [%s] Principal: %s | Term: %d months | Remaining: %s | Status: %s\n",
                                    l.getLoanRef(), formatVnd(l.getAmount()), l.getTermMonths(), formatVnd(l.getRemainingAmount()), l.getStatus()));
                        }
                    }
                    ctx.append("\n");
                } catch (Exception e) {
                    log.warn("Loans query exception: {}", e.getMessage());
                }

                // 3. Bill Subscriptions Section
                try {
                    List<BillSubscription> billSubs = billSubscriptionRepository.findByUserIdOrderByCreatedAtDesc(userId);
                    ctx.append("⚡ REGISTERED BILL SUBSCRIPTIONS (").append(billSubs.size()).append(" bills):\n");
                    if (billSubs.isEmpty()) {
                        ctx.append("   - No registered utility bills.\n");
                    } else {
                        for (BillSubscription bs : billSubs) {
                            ctx.append(String.format("   - Provider ID: %d | Customer Code: %s | Amount: %s | Status: %s\n",
                                    bs.getProviderId(), bs.getCustomerCode(), formatVnd(bs.getCycleAmount()), bs.getStatus()));
                        }
                    }
                    ctx.append("\n");
                } catch (Exception e) {
                    log.warn("BillSubscriptions query exception: {}", e.getMessage());
                }

                // 4. Linked Bank Accounts
                List<LinkedBank> linkedBanks = linkedBankRepository.findByUserIdAndStatus(userId, "ACTIVE");
                ctx.append("🏦 LINKED BANK ACCOUNTS (").append(linkedBanks.size()).append(" banks):\n");
                if (linkedBanks.isEmpty()) {
                    ctx.append("   - No linked bank accounts.\n");
                } else {
                    for (LinkedBank lb : linkedBanks) {
                        ctx.append(String.format("   - %s | Acc: %s | Holder: %s\n",
                                lb.getBankName(), maskAccountNumber(lb.getAccountNumber()), lb.getAccountHolder()));
                    }
                }
                ctx.append("\n");

                // 5. Recent 15 Transactions
                List<Transaction> transactions = transactionRepository
                        .findAllWithFiltersAndOwner(accountId, null, null, null, null, null,
                                PageRequest.of(0, 15, Sort.by(Sort.Direction.DESC, "createdAt")))
                        .getContent();

                if (!transactions.isEmpty()) {
                    ctx.append("📋 RECENT TRANSACTIONS (Last 15):\n");
                    int idx = 1;
                    for (Transaction t : transactions) {
                        String dir = t.getSourceAccountId().equals(accountId) ? "Out" : "In";
                        String dateStr = t.getCreatedAt() != null ? t.getCreatedAt().format(VN_DATE_FMT) : "N/A";
                        ctx.append(String.format("%d. [%s] %s | %s | %s | Date: %s | Ref: %s\n",
                                idx++, dir, formatVnd(t.getAmount()), translateType(t.getType()), translateStatus(t.getStatus()), dateStr, t.getTransactionRef()));
                    }
                } else {
                    ctx.append("📋 TRANSACTIONS: No transactions yet.\n");
                }
            } else {
                ctx.append("⚠️ User has no active personal wallet.\n");
            }

            // 6. Admin Overview Context (If user is ROLE_ADMIN)
            if ("ROLE_ADMIN".equalsIgnoreCase(role) || "ADMIN".equalsIgnoreCase(role)) {
                ctx.append("\n👑 SYSTEM ADMIN OVERVIEW:\n");
                ctx.append("   - Admin Console: Access double-entry ledger audits, merchant approvals, and webhook retries at /admin/dashboard.\n");
                ctx.append("   - Total Registered Merchants: ").append(merchantRepository.count()).append("\n");
            }

            // All Feature Capabilities Summary
            ctx.append("\n💡 ALL PAYGATE PRO FEATURES OVERVIEW:\n");
            ctx.append("1. Balance & TopUp: Quick VietQR deposit into wallet.\n");
            ctx.append("2. Transfers: Instant P2P money transfer via Account ID or Account Number AC00...\n");
            ctx.append("3. Savings Vaults: Create goal-oriented 3D piggy bank savings vaults.\n");
            ctx.append("4. Consumer Loans: Apply for consumer credit up to 50M VND with instant disbursement.\n");
            ctx.append("5. Utility Bills: Pay Electricity (EVN), Water, Internet, Tuition fees automatically.\n");
            ctx.append("6. Vouchers & Rewards: Earn reward points on transactions and redeem discount vouchers.\n");
            ctx.append("7. Merchant Gateway: Integration API keys, dynamic Checkout Sessions & Webhooks.\n");
            ctx.append("8. Double-Entry Ledger: Financial integrity audit system.\n");

            String result = ctx.toString();
            log.info("Built comprehensive financial context for user={}:\n{}", username, result);
            return result;

        } catch (Exception e) {
            log.warn("Could not build financial context for user={}: {}", username, e.getMessage(), e);
            return "";
        }
    }

    private String maskAccountNumber(String accNum) {
        if (accNum == null || accNum.length() <= 4) return "****";
        return "****" + accNum.substring(accNum.length() - 4);
    }

    private String translateType(TransactionType type) {
        if (type == null) return "Giao dịch";
        return switch (type) {
            case PAYMENT -> "Thanh toán";
            case TOPUP -> "Nạp tiền";
            case REFUND -> "Hoàn tiền";
            case WITHDRAW -> "Rút tiền";
            case BILL_PAYMENT -> "Thanh toán hóa đơn";
            case LOAN_REPAYMENT -> "Trả nợ khoản vay";
            case LOAN_DISBURSEMENT -> "Giải ngân khoản vay";
            case VAULT_DEPOSIT -> "Nạp hũ tiết kiệm";
            case VAULT_WITHDRAW -> "Rút hũ tiết kiệm";
            default -> type.name();
        };
    }

    private String translateStatus(TransactionStatus status) {
        if (status == null) return "Unknown";
        return switch (status) {
            case COMPLETED -> "Completed";
            case PENDING -> "Pending";
            case PROCESSING -> "Processing";
            case FAILED -> "Failed";
            case EXPIRED -> "Expired";
        };
    }

    private String formatVnd(BigDecimal amount) {
        if (amount == null) return "0 VND";
        return String.format("%,.0f VND", amount);
    }
}
