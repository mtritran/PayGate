package com.training.paygate.config;

import com.training.paygate.entity.User;
import com.training.paygate.enums.OwnerType;
import com.training.paygate.enums.Role;
import com.training.paygate.repository.UserRepository;
import com.training.paygate.service.AccountService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
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
        if (!userRepository.existsByUsername(adminUsername)) {
            log.info(">>> Seeding default ADMIN account: username={}", adminUsername);

            User adminUser = User.builder()
                    .username(adminUsername)
                    .email(adminEmail)
                    .password(passwordEncoder.encode(adminPassword))
                    .fullName("System Administrator")
                    .role(Role.ADMIN)
                    .active(true)
                    .build();

            User savedAdmin = userRepository.save(adminUser);

            // Tự động khởi tạo Ví tài khoản cho Admin
            try {
                accountService.createAccount(savedAdmin.getId(), OwnerType.USER);
                log.info(">>> Provisioned User Wallet account for ADMIN successfully (ID: {})", savedAdmin.getId());
            } catch (Exception e) {
                log.warn(">>> Account wallet provisioning for ADMIN skipped or failed: {}", e.getMessage());
            }

            log.info(">>> Default ADMIN account created successfully with username: {}", adminUsername);
        } else {
            log.info(">>> ADMIN account '{}' already exists. Skipping data seeding.", adminUsername);
        }
    }
}
