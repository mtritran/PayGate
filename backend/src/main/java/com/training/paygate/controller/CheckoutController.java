package com.training.paygate.controller;

import com.training.paygate.common.ApiResponse;
import com.training.paygate.dto.request.CheckoutCreateRequest;
import com.training.paygate.dto.request.CheckoutProcessRequest;
import com.training.paygate.dto.request.PaymentRequest;
import com.training.paygate.dto.response.CheckoutInfoResponse;
import com.training.paygate.dto.response.TransactionResponse;
import com.training.paygate.entity.Account;
import com.training.paygate.entity.CheckoutSession;
import com.training.paygate.entity.Merchant;
import com.training.paygate.enums.OwnerType;
import com.training.paygate.exception.BadRequestException;
import com.training.paygate.exception.ResourceNotFoundException;
import com.training.paygate.repository.AccountRepository;
import com.training.paygate.repository.CheckoutSessionRepository;
import com.training.paygate.repository.MerchantRepository;
import com.training.paygate.service.OtpService;
import com.training.paygate.service.TransactionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/checkout")
@RequiredArgsConstructor
@Tag(name = "Payment Gateway Checkout", description = "APIs dành cho Merchant (Bên thứ ba) khởi tạo thanh toán và khách hàng xác thực giao dịch")
public class CheckoutController {

    private final MerchantRepository merchantRepository;
    private final CheckoutSessionRepository checkoutSessionRepository;
    private final AccountRepository accountRepository;
    private final TransactionService transactionService;
    private final OtpService otpService;

    @PostMapping("/create")
    @Operation(summary = "Merchant khởi tạo phiên thanh toán (Public API dành cho Merchant)")
    public ApiResponse<Map<String, Object>> createCheckoutSession(@Valid @RequestBody CheckoutCreateRequest request) {
        Merchant merchant = merchantRepository.findByApiKey(request.apiKey())
                .orElseThrow(() -> new BadRequestException("API Key của Merchant không hợp lệ"));

        if (!merchant.isActive() || merchant.getStatus() != com.training.paygate.enums.MerchantStatus.ACTIVE) {
            throw new BadRequestException("Tài khoản Merchant hiện đang bị khóa hoặc chưa được phê duyệt");
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
                .description(request.description() != null ? request.description() : "Thanh toán đơn hàng " + request.orderId())
                .returnUrl(request.returnUrl())
                .cancelUrl(request.cancelUrl())
                .status("PENDING")
                .expiresAt(expiresAt)
                .build();

        checkoutSessionRepository.save(session);

        String paymentUrl = "http://localhost:4200/checkout?token=" + token;

        return ApiResponse.success("Tạo phiên thanh toán thành công", Map.of(
                "token", token,
                "paymentUrl", paymentUrl,
                "expiresAt", expiresAt
        ));
    }

    @GetMapping("/info/{token}")
    @Operation(summary = "Lấy thông tin đơn hàng thanh toán công khai")
    public ApiResponse<CheckoutInfoResponse> getCheckoutInfo(@PathVariable String token) {
        CheckoutSession session = checkoutSessionRepository.findByToken(token)
                .orElseThrow(() -> new ResourceNotFoundException("Phiên thanh toán không tồn tại hoặc đã hết hạn"));

        if (LocalDateTime.now().isAfter(session.getExpiresAt()) && "PENDING".equals(session.getStatus())) {
            session.setStatus("EXPIRED");
            checkoutSessionRepository.save(session);
        }

        CheckoutInfoResponse info = new CheckoutInfoResponse(
                session.getToken(),
                session.getMerchantName(),
                session.getMerchantCode(),
                session.getOrderId(),
                session.getAmount(),
                session.getDescription(),
                session.getReturnUrl(),
                session.getCancelUrl(),
                session.getStatus(),
                session.getCreatedAt(),
                session.getExpiresAt()
        );

        return ApiResponse.success(info);
    }

    @GetMapping("/info/txn/{transactionRef}")
    @Operation(summary = "Lấy thông tin đơn hàng thanh toán qua transactionRef")
    public ApiResponse<CheckoutInfoResponse> getCheckoutInfoByTxnRef(@PathVariable String transactionRef) {
        CheckoutSession session = checkoutSessionRepository.findByTransactionRef(transactionRef)
                .orElseThrow(() -> new ResourceNotFoundException("Phiên thanh toán không tồn tại"));

        CheckoutInfoResponse info = new CheckoutInfoResponse(
                session.getToken(),
                session.getMerchantName(),
                session.getMerchantCode(),
                session.getOrderId(),
                session.getAmount(),
                session.getDescription(),
                session.getReturnUrl(),
                session.getCancelUrl(),
                session.getStatus(),
                session.getCreatedAt(),
                session.getExpiresAt()
        );

        return ApiResponse.success(info);
    }

    @PostMapping("/process")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Khách hàng đăng nhập & nhập OTP để hoàn tất thanh toán đơn hàng")
    public ApiResponse<Map<String, String>> processCheckout(
            Principal principal,
            @Valid @RequestBody CheckoutProcessRequest request,
            jakarta.servlet.http.HttpServletRequest httpRequest
    ) {
        CheckoutSession session = checkoutSessionRepository.findByToken(request.token())
                .orElseThrow(() -> new ResourceNotFoundException("Phiên thanh toán không tồn tại"));

        if (!"PENDING".equals(session.getStatus())) {
            throw new BadRequestException("Phiên thanh toán này đã " + session.getStatus().toLowerCase() + " hoặc không hợp lệ");
        }

        if (LocalDateTime.now().isAfter(session.getExpiresAt())) {
            session.setStatus("EXPIRED");
            checkoutSessionRepository.save(session);
            throw new BadRequestException("Phiên thanh toán đã hết hạn (15 phút)");
        }

        // Verify OTP
        boolean otpValid = otpService.verifyOtp(principal.getName(), "Xác thực OTP thanh toán đơn hàng", request.otpCode());
        if (!otpValid) {
            throw new BadRequestException("Mã OTP không chính xác hoặc đã hết hạn");
        }

        // Tìm Merchant Account làm tài khoản đích
        Account merchantAccount = accountRepository.findByOwnerIdAndOwnerType(session.getMerchantId(), OwnerType.MERCHANT)
                .orElseThrow(() -> new ResourceNotFoundException("Tài khoản ví của Merchant không tồn tại"));

        // Process payment
        PaymentRequest paymentRequest = new PaymentRequest(
                "CHK_IDEM_" + UUID.randomUUID().toString(),
                merchantAccount.getId(),
                session.getAmount(),
                "Thanh toán đơn hàng #" + session.getOrderId() + " cho " + session.getMerchantName(),
                session.getMerchantId()
        );

        TransactionResponse tx = transactionService.processPayment(paymentRequest, principal.getName(), clientIp(httpRequest));

        session.setStatus("PROCESSING");
        session.setTransactionRef(tx.transactionRef());
        checkoutSessionRepository.save(session);

        String redirectUrl = session.getReturnUrl() + (session.getReturnUrl().contains("?") ? "&" : "?")
                + "status=PROCESSING&orderId=" + session.getOrderId() + "&transactionRef=" + tx.transactionRef();

        return ApiResponse.success("Thanh toán đơn hàng đang được xử lý", Map.of(
                "transactionRef", tx.transactionRef(),
                "redirectUrl", redirectUrl
        ));
    }

    private String clientIp(jakarta.servlet.http.HttpServletRequest request) {
        String xf = request.getHeader("X-Forwarded-For");
        if (xf != null && !xf.isEmpty()) {
            return xf.split(",")[0].trim();
        }
        return request.getRemoteAddr() != null ? request.getRemoteAddr() : "unknown_ip";
    }
}
