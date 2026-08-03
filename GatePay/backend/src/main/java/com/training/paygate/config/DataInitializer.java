package com.training.paygate.config;

import com.training.paygate.entity.Account;
import com.training.paygate.entity.User;
import com.training.paygate.enums.AccountStatus;
import com.training.paygate.enums.OwnerType;
import com.training.paygate.enums.Role;
import com.training.paygate.repository.AccountRepository;
import com.training.paygate.repository.UserRepository;
import com.training.paygate.service.AccountService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final AccountRepository accountRepository;
    private final PasswordEncoder passwordEncoder;
    private final AccountService accountService;

    @Value("${app.admin.username:admin}")
    private String adminUsername;

    @Value("${app.admin.password:Admin@123456!}")
    private String adminPassword;

    @Value("${app.admin.email:admin@paygate.dev}")
    private String adminEmail;

    @Override
    @Transactional
    public void run(String... args) {
        // 1. Seed SYSTEM account if missing
        if (accountRepository.findByOwnerIdAndOwnerType(0L, OwnerType.SYSTEM).isEmpty()) {
            log.info(">>> Provisioning SYSTEM Central Fund Account...");
            Account sysAcc = Account.builder()
                    .ownerId(0L)
                    .ownerType(OwnerType.SYSTEM)
                    .accountNumber("SYS0000000000000001")
                    .balance(BigDecimal.valueOf(99_000_000_000.00))
                    .currency("VND")
                    .status(AccountStatus.ACTIVE)
                    .build();
            accountRepository.save(sysAcc);
            log.info(">>> SYSTEM Central Fund Account created successfully.");
        }

        // 2. Seed default ADMIN account if missing
        User adminUser;
        if (!userRepository.existsByUsername(adminUsername)) {
            log.info(">>> Seeding default ADMIN account: username={}", adminUsername);

            User newAdmin = User.builder()
                    .username(adminUsername)
                    .email(adminEmail)
                    .password(passwordEncoder.encode(adminPassword))
                    .fullName("System Administrator")
                    .role(Role.ADMIN)
                    .active(true)
                    .build();

            adminUser = userRepository.save(newAdmin);
            log.info(">>> Default ADMIN account created successfully with username: {}", adminUsername);
        } else {
            adminUser = userRepository.findByUsername(adminUsername).orElse(null);
            log.info(">>> ADMIN account '{}' already exists.", adminUsername);
        }

        // 3. Ensure ADMIN user has a wallet account
        if (adminUser != null && accountRepository.findByOwnerIdAndOwnerType(adminUser.getId(), OwnerType.USER).isEmpty()) {
            try {
                accountService.createAccount(adminUser.getId(), OwnerType.USER);
                log.info(">>> Provisioned User Wallet account for ADMIN successfully (ID: {})", adminUser.getId());
            } catch (Exception e) {
                log.warn(">>> Account wallet provisioning for ADMIN skipped or failed: {}", e.getMessage());
            }
        }
    }
}
