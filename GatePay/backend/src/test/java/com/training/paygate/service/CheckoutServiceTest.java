package com.training.paygate.service;

import com.training.paygate.config.VietQrProperties;
import com.training.paygate.dto.request.CheckoutCreateRequest;
import com.training.paygate.dto.request.CheckoutProcessRequest;
import com.training.paygate.dto.response.CheckoutCreateResponse;
import com.training.paygate.dto.response.CheckoutInfoResponse;
import com.training.paygate.dto.response.CheckoutProcessResponse;
import com.training.paygate.dto.response.TransactionResponse;
import com.training.paygate.entity.Account;
import com.training.paygate.entity.CheckoutSession;
import com.training.paygate.entity.Merchant;
import com.training.paygate.enums.AccountStatus;
import com.training.paygate.enums.MerchantStatus;
import com.training.paygate.enums.OwnerType;
import com.training.paygate.enums.PaymentMethod;
import com.training.paygate.exception.BadRequestException;
import com.training.paygate.exception.ResourceNotFoundException;
import com.training.paygate.mapper.CheckoutMapper;
import com.training.paygate.repository.AccountRepository;
import com.training.paygate.repository.CheckoutSessionRepository;
import com.training.paygate.repository.MerchantRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CheckoutServiceTest {

    @Mock private MerchantRepository merchantRepository;
    @Mock private CheckoutSessionRepository checkoutSessionRepository;
    @Mock private AccountRepository accountRepository;
    @Mock private TransactionService transactionService;
    @Mock private OtpService otpService;
    @Mock private VietQrProperties vietQrProperties;
    @Mock private CheckoutMapper checkoutMapper;

    @InjectMocks
    private CheckoutService checkoutService;

    private Merchant activeMerchant;
    private CheckoutSession pendingSession;
    private Account merchantAccount;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(checkoutService, "frontendBaseUrl", "http://localhost:4201");
        ReflectionTestUtils.setField(checkoutService, "sessionTtlMinutes", 15);

        activeMerchant = Merchant.builder()
                .merchantCode("MC_SHOP1")
                .merchantName("Shop ABC")
                .apiKey("KEY_VALID_123")
                .active(true)
                .status(MerchantStatus.ACTIVE)
                .build();
        activeMerchant.setId(10L);

        pendingSession = CheckoutSession.builder()
                .token("CHK_TOKEN_123")
                .merchantId(10L)
                .merchantCode("MC_SHOP1")
                .merchantName("Shop ABC")
                .orderId("ORD-999")
                .amount(new BigDecimal("250000.00"))
                .description("Thanh toan ORD-999")
                .returnUrl("http://merchant.com/callback")
                .cancelUrl("http://merchant.com/cancel")
                .status("PENDING")
                .expiresAt(LocalDateTime.now().plusMinutes(15))
                .build();

        sysAccount = Account.builder()
                .id(1L)
                .ownerId(0L)
                .ownerType(OwnerType.SYSTEM)
                .accountNumber("099988887777")
                .balance(new BigDecimal("99000000000.00"))
                .status(AccountStatus.ACTIVE)
                .build();

        merchantAccount = Account.builder()
                .id(100L)
                .ownerId(10L)
                .ownerType(OwnerType.MERCHANT)
                .balance(new BigDecimal("5000000.00"))
                .status(AccountStatus.ACTIVE)
                .build();
    }

    private Account sysAccount;

    @Test
    @DisplayName("createCheckoutSession_PayGate: Successfully creates session with paymentUrl")
    void createCheckoutSession_PayGate() {
        CheckoutCreateRequest request = new CheckoutCreateRequest(
                "KEY_VALID_123",
                "ORD-999",
                new BigDecimal("250000.00"),
                "Thanh toan ORD-999",
                PaymentMethod.PAYGATE,
                "http://merchant.com/callback",
                "http://merchant.com/cancel"
        );

        when(merchantRepository.findByApiKey("KEY_VALID_123")).thenReturn(Optional.of(activeMerchant));
        when(checkoutMapper.toEntity(eq(request), eq(activeMerchant), any(), any())).thenReturn(pendingSession);

        CheckoutCreateResponse response = checkoutService.createCheckoutSession(request);

        assertThat(response).isNotNull();
        assertThat(response.paymentMethod()).isEqualTo(PaymentMethod.PAYGATE);
        assertThat(response.paymentUrl()).startsWith("http://localhost:4201/checkout?token=CHK_");
        verify(checkoutSessionRepository).save(pendingSession);
    }

    @Test
    @DisplayName("createCheckoutSession_VietQR: Successfully creates session with VietQR payload and URL")
    void createCheckoutSession_VietQR() {
        CheckoutCreateRequest request = new CheckoutCreateRequest(
                "KEY_VALID_123",
                "ORD-999",
                new BigDecimal("250000.00"),
                "Thanh toan ORD-999",
                PaymentMethod.VIETQR,
                "http://merchant.com/callback",
                "http://merchant.com/cancel"
        );

        when(merchantRepository.findByApiKey("KEY_VALID_123")).thenReturn(Optional.of(activeMerchant));
        when(checkoutMapper.toEntity(eq(request), eq(activeMerchant), any(), any())).thenReturn(pendingSession);
        when(accountRepository.findByOwnerIdAndOwnerType(0L, OwnerType.SYSTEM)).thenReturn(Optional.of(sysAccount));
        when(vietQrProperties.getBankBin()).thenReturn("970422");
        when(vietQrProperties.getAccountName()).thenReturn("PAYGATE GATEWAY");
        when(vietQrProperties.getBankCode()).thenReturn("MB");

        CheckoutCreateResponse response = checkoutService.createCheckoutSession(request);

        assertThat(response).isNotNull();
        assertThat(response.paymentMethod()).isEqualTo(PaymentMethod.VIETQR);
        assertThat(response.transferContent()).isEqualTo("PAYGATE ORD-999");
        assertThat(response.vietQrUrl()).contains("img.vietqr.io/image/970422-099988887777-compact2.png");
        assertThat(response.qrCodePayload()).isNotEmpty();
        verify(checkoutSessionRepository).save(pendingSession);
    }

    @Test
    @DisplayName("getCheckoutInfo: Returns checkout details")
    void getCheckoutInfo_Success() {
        when(checkoutSessionRepository.findByToken("CHK_TOKEN_123")).thenReturn(Optional.of(pendingSession));
        when(checkoutMapper.toInfoResponse(pendingSession)).thenReturn(new CheckoutInfoResponse(
                "CHK_TOKEN_123",
                "Shop ABC",
                "MC_SHOP1",
                "ORD-999",
                new BigDecimal("250000.00"),
                "Thanh toan ORD-999",
                "http://merchant.com/callback",
                "http://merchant.com/cancel",
                "PENDING",
                LocalDateTime.now(),
                LocalDateTime.now().plusMinutes(15)
        ));

        CheckoutInfoResponse info = checkoutService.getCheckoutInfo("CHK_TOKEN_123");

        assertThat(info).isNotNull();
        assertThat(info.token()).isEqualTo("CHK_TOKEN_123");
        assertThat(info.orderId()).isEqualTo("ORD-999");
        assertThat(info.amount()).isEqualByComparingTo("250000.00");
    }

    @Test
    @DisplayName("processCheckout: Validates OTP, invokes payment, and returns redirectUrl")
    void processCheckout_Success() {
        CheckoutProcessRequest request = new CheckoutProcessRequest("CHK_TOKEN_123", "123456");

        when(checkoutSessionRepository.findByToken("CHK_TOKEN_123")).thenReturn(Optional.of(pendingSession));
        when(otpService.verifyOtp("user_buyer", "OTP verification for order payment", "123456")).thenReturn(true);
        when(accountRepository.findByOwnerIdAndOwnerType(0L, OwnerType.SYSTEM)).thenReturn(Optional.of(merchantAccount));
        when(transactionService.processPayment(any(), eq("user_buyer"), eq("127.0.0.1")))
                .thenReturn(new TransactionResponse(
                        "TXN_REF_001",
                        "PROCESSING",
                        new BigDecimal("250000.00"),
                        1L,
                        100L,
                        "PAYMENT",
                        "Payment",
                        LocalDateTime.now()
                ));

        CheckoutProcessResponse response = checkoutService.processCheckout("user_buyer", request, "127.0.0.1");

        assertThat(response).isNotNull();
        assertThat(response.transactionRef()).isEqualTo("TXN_REF_001");
        assertThat(response.redirectUrl()).contains("status=PROCESSING&orderId=ORD-999&transactionRef=TXN_REF_001");
        assertThat(pendingSession.getStatus()).isEqualTo("PROCESSING");
        assertThat(pendingSession.getTransactionRef()).isEqualTo("TXN_REF_001");
        verify(checkoutSessionRepository).save(pendingSession);
    }

    @Test
    @DisplayName("processCheckout_InvalidOtp: Throws BadRequestException")
    void processCheckout_InvalidOtp() {
        CheckoutProcessRequest request = new CheckoutProcessRequest("CHK_TOKEN_123", "999999");

        when(checkoutSessionRepository.findByToken("CHK_TOKEN_123")).thenReturn(Optional.of(pendingSession));
        when(otpService.verifyOtp("user_buyer", "OTP verification for order payment", "999999")).thenReturn(false);

        assertThatThrownBy(() -> checkoutService.processCheckout("user_buyer", request, "127.0.0.1"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Invalid or expired OTP code");
    }
}
