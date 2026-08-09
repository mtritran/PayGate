package com.training.paygate.service;

import com.training.paygate.dto.request.CheckoutCreateRequest;
import com.training.paygate.dto.request.CheckoutProcessRequest;
import com.training.paygate.dto.request.PaymentRequest;
import com.training.paygate.dto.response.CheckoutCreateResponse;
import com.training.paygate.dto.response.CheckoutInfoResponse;
import com.training.paygate.dto.response.CheckoutProcessResponse;
import com.training.paygate.dto.response.TransactionResponse;
import com.training.paygate.entity.Account;
import com.training.paygate.entity.CheckoutSession;
import com.training.paygate.entity.Merchant;
import com.training.paygate.entity.User;
import com.training.paygate.enums.MerchantStatus;
import com.training.paygate.enums.OwnerType;
import com.training.paygate.exception.BadRequestException;
import com.training.paygate.exception.ResourceNotFoundException;
import com.training.paygate.mapper.CheckoutSessionMapper;
import com.training.paygate.repository.AccountRepository;
import com.training.paygate.repository.CheckoutSessionRepository;
import com.training.paygate.repository.MerchantRepository;
import com.training.paygate.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.util.UriComponentsBuilder;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class CheckoutService {

        private final MerchantRepository merchantRepository;
        private final CheckoutSessionRepository checkoutSessionRepository;
        private final AccountRepository accountRepository;
        private final UserRepository userRepository;
        private final TransactionService transactionService;
        private final OtpService otpService;
        private final CheckoutSessionMapper checkoutSessionMapper;

        @Value("${paygate.frontend-url}")
        private String frontendUrl;

        @Transactional
        public CheckoutCreateResponse createCheckoutSession(CheckoutCreateRequest request) {
                return createCheckoutSession(request, request.apiKey());
        }

        @Transactional
        public CheckoutCreateResponse createCheckoutSession(CheckoutCreateRequest request, String merchantCode) {
                if (merchantCode == null || merchantCode.isBlank()) {
                        throw new BadRequestException("Merchant Code is missing (Not authenticated by Filter)");
                }

                validateCheckoutAmounts(request);

                Merchant merchant = merchantRepository.findByMerchantCode(merchantCode)
                                .orElseThrow(() -> new BadRequestException("Invalid Merchant Code"));

                if (!merchant.isActive() || merchant.getStatus() != MerchantStatus.ACTIVE) {
                        throw new BadRequestException("Merchant account is currently inactive or disabled");
                }

                String token = "CHK_" + UUID.randomUUID().toString().replace("-", "").toUpperCase();
                LocalDateTime expiresAt = LocalDateTime.now().plusMinutes(15);

                CheckoutSession session = CheckoutSession.builder()
                                .token(token)
                                .merchantId(merchant.getId())
                                .merchantCode(merchant.getMerchantCode())
                                .merchantName(merchant.getMerchantName())
                                .orderId(request.orderId())
                                .amount(request.amount())
                                .method(request.method())
                                .upfrontAmount(request.upfrontAmount())
                                .financeAmount(request.financeAmount())
                                .merchantCustomerRef(normalizeRef(request.merchantCustomerRef()))
                                .customerName(request.customerName())
                                .description(request.description() != null ? request.description()
                                                : "Order Payment #" + request.orderId())
                                .returnUrl(request.returnUrl())
                                .cancelUrl(request.cancelUrl())
                                .status("PENDING")
                                .expiresAt(expiresAt)
                                .build();

                checkoutSessionRepository.save(session);

                String paymentUrl = (frontendUrl.endsWith("/") ? frontendUrl : frontendUrl + "/") + "checkout?token="
                                + token;

                return new CheckoutCreateResponse(token, paymentUrl, expiresAt);
        }

        private void validateCheckoutAmounts(CheckoutCreateRequest request) {
                String method = request.method();
                if (method == null || method.isBlank()) {
                        return;
                }
                if (!"BNPL".equalsIgnoreCase(method)) {
                        return;
                }
                if (request.merchantCustomerRef() == null || request.merchantCustomerRef().isBlank()) {
                        throw new BadRequestException("merchantCustomerRef is required for BNPL checkout");
                }

                BigDecimal upfrontAmount = request.upfrontAmount() != null ? request.upfrontAmount() : BigDecimal.ZERO;
                BigDecimal financeAmount = request.financeAmount() != null ? request.financeAmount() : request.amount();
                if (financeAmount.compareTo(BigDecimal.ZERO) <= 0) {
                        throw new BadRequestException("financeAmount must be greater than 0 for BNPL");
                }
                if (financeAmount.compareTo(request.amount()) > 0) {
                        throw new BadRequestException("financeAmount cannot exceed amount");
                }
                if (upfrontAmount.add(financeAmount).compareTo(request.amount()) != 0) {
                        throw new BadRequestException("upfrontAmount + financeAmount must equal amount");
                }
        }

        private String normalizeEmail(String email) {
                return email != null ? email.trim().toLowerCase() : null;
        }

        private String normalizeRef(String ref) {
                return ref != null ? ref.trim() : null;
        }

        @Transactional
        public CheckoutInfoResponse getCheckoutInfo(String token) {
                if (token == null || token.isBlank()) {
                        throw new BadRequestException("Checkout token cannot be empty");
                }

                CheckoutSession session = checkoutSessionRepository.findByToken(token)
                                .orElseThrow(() -> new ResourceNotFoundException(
                                                "Checkout session does not exist or has expired"));

                if (LocalDateTime.now().isAfter(session.getExpiresAt()) && "PENDING".equals(session.getStatus())) {
                        session.setStatus("EXPIRED");
                        checkoutSessionRepository.save(session);
                        log.info("Checkout session for orderId {} has expired", session.getOrderId());
                }

                return checkoutSessionMapper.toCheckoutInfoResponse(session);
        }

        @Transactional
        public CheckoutInfoResponse getCheckoutInfoByTxnRef(String transactionRef) {
                if (transactionRef == null || transactionRef.isBlank()) {
                        throw new BadRequestException("Transaction reference cannot be empty");
                }
                log.info("Fetching checkout info by transaction ref: {}", transactionRef);

                CheckoutSession session = checkoutSessionRepository.findByTransactionRef(transactionRef)
                                .orElseThrow(() -> new ResourceNotFoundException(
                                                "Checkout session does not exist for transaction ref: "
                                                                + transactionRef));

                if (LocalDateTime.now().isAfter(session.getExpiresAt()) && "PENDING".equals(session.getStatus())) {
                        session.setStatus("EXPIRED");
                        checkoutSessionRepository.save(session);
                        log.info("Checkout session for transactionRef {} has expired", transactionRef);
                }

                return checkoutSessionMapper.toCheckoutInfoResponse(session);
        }

        @Transactional
        public CheckoutProcessResponse processCheckout(String username, CheckoutProcessRequest request,
                        String clientIp) {
                if (username == null || username.isBlank()) {
                        throw new BadRequestException("Username cannot be empty");
                }

                User user = userRepository.findByUsername(username)
                                .orElseThrow(() -> new BadRequestException("Authenticated user not found"));

                if (!user.isActive()) {
                        throw new BadRequestException("User account is currently inactive or disabled");
                }

                CheckoutSession session = checkoutSessionRepository.findByToken(request.token())
                                .orElseThrow(() -> new ResourceNotFoundException("Checkout session does not exist"));

                if (!"PENDING".equals(session.getStatus())) {
                        throw new BadRequestException("Checkout session status is " + session.getStatus().toLowerCase()
                                        + " and cannot be processed");
                }

                if (LocalDateTime.now().isAfter(session.getExpiresAt())) {
                        session.setStatus("EXPIRED");
                        checkoutSessionRepository.save(session);
                        throw new BadRequestException("Checkout session has expired (15 minutes)");
                }

                boolean otpValid = otpService.verifyOtp(username, "Order payment",
                                request.otpCode());
                if (!otpValid) {
                        throw new BadRequestException("Invalid or expired OTP code");
                }

                Account merchantAccount = accountRepository
                                .findByOwnerIdAndOwnerType(session.getMerchantId(), OwnerType.MERCHANT)
                                .orElseThrow(() -> new ResourceNotFoundException(
                                                "Merchant wallet account does not exist"));

                PaymentRequest paymentRequest = new PaymentRequest(
                                "CHK_IDEM_" + session.getToken(),
                                merchantAccount.getId(),
                                session.getAmount(),
                                "Order payment #" + session.getOrderId() + " for " + session.getMerchantName(),
                                session.getMerchantId());

                TransactionResponse tx = transactionService.processPayment(paymentRequest, username, clientIp);

                session.setStatus("PROCESSING");
                session.setTransactionRef(tx.transactionRef());
                checkoutSessionRepository.save(session);

                String redirectUrl = UriComponentsBuilder.fromUriString(session.getReturnUrl())
                                .queryParam("status", "PROCESSING")
                                .queryParam("orderId", session.getOrderId())
                                .queryParam("transactionRef", tx.transactionRef())
                                .build()
                                .encode()
                                .toUriString();

                return new CheckoutProcessResponse(tx.transactionRef(), redirectUrl);
        }
}
