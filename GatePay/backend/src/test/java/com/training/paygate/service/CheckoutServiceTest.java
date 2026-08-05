package com.training.paygate.service;

import com.training.paygate.dto.request.CheckoutCreateRequest;
import com.training.paygate.dto.request.CheckoutProcessRequest;
import com.training.paygate.dto.request.PaymentRequest;
import com.training.paygate.dto.response.CheckoutCreateResponse;
import com.training.paygate.dto.response.CheckoutInfoResponse;
import com.training.paygate.dto.response.TransactionResponse;
import com.training.paygate.entity.Account;
import com.training.paygate.entity.CheckoutSession;
import com.training.paygate.entity.Merchant;
import com.training.paygate.enums.MerchantStatus;
import com.training.paygate.enums.OwnerType;
import com.training.paygate.exception.BadRequestException;
import com.training.paygate.exception.ResourceNotFoundException;
import com.training.paygate.repository.AccountRepository;
import com.training.paygate.repository.CheckoutSessionRepository;
import com.training.paygate.repository.MerchantRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
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

import com.training.paygate.mapper.CheckoutSessionMapper;

import com.training.paygate.dto.response.CheckoutProcessResponse;
import com.training.paygate.entity.User;
import com.training.paygate.repository.UserRepository;

@ExtendWith(MockitoExtension.class)
class CheckoutServiceTest {

        @Mock
        private MerchantRepository merchantRepository;

        @Mock
        private CheckoutSessionRepository checkoutSessionRepository;

        @Mock
        private AccountRepository accountRepository;

        @Mock
        private UserRepository userRepository;

        @Mock
        private TransactionService transactionService;

        @Mock
        private OtpService otpService;

        @Mock
        private CheckoutSessionMapper checkoutSessionMapper;

        @InjectMocks
        private CheckoutService checkoutService;

        private Merchant activeMerchant;
        private CheckoutCreateRequest validCreateRequest;

        @BeforeEach
        void setUp() {
                ReflectionTestUtils.setField(checkoutService, "frontendUrl", "http://localhost:4201");

                activeMerchant = Merchant.builder()
                                .userId(1L)
                                .merchantName("Marketplace Store")
                                .merchantCode("MK_STORE")
                                .apiKey("valid-api-key-123")
                                .webhookUrl("http://marketplace.test/webhook")
                                .active(true)
                                .status(MerchantStatus.ACTIVE)
                                .build();
                activeMerchant.setId(10L);

                validCreateRequest = new CheckoutCreateRequest(
                                "valid-api-key-123",
                                "ORD-9988",
                                new BigDecimal("500000"),
                                "Payment for order #ORD-9988",
                                "http://marketplace.test/success",
                                "http://marketplace.test/cancel");
        }

        private User createUser(Long id, String username, boolean active) {
                User u = User.builder().username(username).active(active).build();
                u.setId(id);
                return u;
        }

        @Test
        @DisplayName("createCheckoutSession - Valid request creates session successfully")
        void createCheckoutSession_validRequest_success() {
                when(merchantRepository.findByApiKey("valid-api-key-123")).thenReturn(Optional.of(activeMerchant));
                when(checkoutSessionRepository.save(any(CheckoutSession.class))).thenAnswer(inv -> inv.getArgument(0));

                CheckoutCreateResponse response = checkoutService.createCheckoutSession(validCreateRequest);

                assertThat(response.token()).isNotNull();
                assertThat(response.paymentUrl()).startsWith("http://localhost:4201/checkout?token=");
                assertThat(response.expiresAt()).isNotNull();

                ArgumentCaptor<CheckoutSession> captor = ArgumentCaptor.forClass(CheckoutSession.class);
                verify(checkoutSessionRepository).save(captor.capture());
                CheckoutSession savedSession = captor.getValue();
                assertThat(savedSession.getMerchantId()).isEqualTo(10L);
                assertThat(savedSession.getOrderId()).isEqualTo("ORD-9988");
                assertThat(savedSession.getAmount()).isEqualByComparingTo("500000");
                assertThat(savedSession.getStatus()).isEqualTo("PENDING");
        }

        @Test
        @DisplayName("createCheckoutSession - Invalid API Key throws BadRequestException")
        void createCheckoutSession_invalidApiKey_throwsBadRequest() {
                when(merchantRepository.findByApiKey("invalid-key")).thenReturn(Optional.empty());

                CheckoutCreateRequest request = new CheckoutCreateRequest(
                                "invalid-key", "ORD-1", new BigDecimal("100000"), "Desc", "http://return.url", null);

                assertThatThrownBy(() -> checkoutService.createCheckoutSession(request))
                                .isInstanceOf(BadRequestException.class)
                                .hasMessageContaining("Invalid Merchant API Key");

                verify(checkoutSessionRepository, never()).save(any());
        }

        @Test
        @DisplayName("createCheckoutSession - Inactive Merchant throws BadRequestException")
        void createCheckoutSession_inactiveMerchant_throwsBadRequest() {
                Merchant inactiveMerchant = Merchant.builder()
                                .apiKey("disabled-key")
                                .active(false)
                                .status(MerchantStatus.REJECTED)
                                .build();
                inactiveMerchant.setId(11L);

                when(merchantRepository.findByApiKey("disabled-key")).thenReturn(Optional.of(inactiveMerchant));

                CheckoutCreateRequest request = new CheckoutCreateRequest(
                                "disabled-key", "ORD-2", new BigDecimal("100000"), "Desc", "http://return.url", null);

                assertThatThrownBy(() -> checkoutService.createCheckoutSession(request))
                                .isInstanceOf(BadRequestException.class)
                                .hasMessageContaining("Merchant account is currently inactive or disabled");
        }

        @Test
        @DisplayName("createCheckoutSession - Null description defaults to Order Payment #orderId")
        void createCheckoutSession_nullDescription_usesDefaultDescription() {
                when(merchantRepository.findByApiKey("valid-api-key-123")).thenReturn(Optional.of(activeMerchant));
                when(checkoutSessionRepository.save(any(CheckoutSession.class))).thenAnswer(inv -> inv.getArgument(0));

                CheckoutCreateRequest nullDescRequest = new CheckoutCreateRequest(
                                "valid-api-key-123",
                                "ORD-NULL-DESC",
                                new BigDecimal("500000"),
                                null,
                                "http://marketplace.test/success",
                                null);

                checkoutService.createCheckoutSession(nullDescRequest);

                ArgumentCaptor<CheckoutSession> captor = ArgumentCaptor.forClass(CheckoutSession.class);
                verify(checkoutSessionRepository).save(captor.capture());
                assertThat(captor.getValue().getDescription()).isEqualTo("Order Payment #ORD-NULL-DESC");
        }

        @Test
        @DisplayName("createCheckoutSession - Active boolean is true but status is not ACTIVE throws BadRequestException")
        void createCheckoutSession_activeTrueButStatusNotActive_throwsBadRequest() {
                Merchant suspendedMerchant = Merchant.builder()
                                .apiKey("suspended-key")
                                .active(true)
                                .status(MerchantStatus.REJECTED)
                                .build();
                suspendedMerchant.setId(12L);

                when(merchantRepository.findByApiKey("suspended-key")).thenReturn(Optional.of(suspendedMerchant));

                CheckoutCreateRequest request = new CheckoutCreateRequest(
                                "suspended-key", "ORD-3", new BigDecimal("100000"), "Desc", "http://return.url", null);

                assertThatThrownBy(() -> checkoutService.createCheckoutSession(request))
                                .isInstanceOf(BadRequestException.class)
                                .hasMessageContaining("Merchant account is currently inactive or disabled");
        }

        @Test
        @DisplayName("createCheckoutSession - Frontend URL with trailing slash formats paymentUrl without double slashes")
        void createCheckoutSession_frontendUrlWithTrailingSlash_formatsUrlCorrectly() {
                ReflectionTestUtils.setField(checkoutService, "frontendUrl", "http://localhost:4201/");

                when(merchantRepository.findByApiKey("valid-api-key-123")).thenReturn(Optional.of(activeMerchant));
                when(checkoutSessionRepository.save(any(CheckoutSession.class))).thenAnswer(inv -> inv.getArgument(0));

                CheckoutCreateResponse response = checkoutService.createCheckoutSession(validCreateRequest);

                assertThat(response.paymentUrl()).startsWith("http://localhost:4201/checkout?token=");
                assertThat(response.paymentUrl()).doesNotContain("//checkout");
        }

        @Test
        @DisplayName("getCheckoutInfo - Token exists returns info")
        void getCheckoutInfo_existingToken_returnsInfo() {
                CheckoutSession session = CheckoutSession.builder()
                                .token("CHK_123")
                                .merchantName("Store")
                                .merchantCode("STORE")
                                .orderId("ORD-1")
                                .amount(new BigDecimal("200000"))
                                .status("PENDING")
                                .expiresAt(LocalDateTime.now().plusMinutes(10))
                                .build();

                CheckoutInfoResponse mockInfo = new CheckoutInfoResponse(
                                "CHK_123", "Store", "STORE", "ORD-1", new BigDecimal("200000"),
                                "Desc", "http://return.url", null, "PENDING", LocalDateTime.now(),
                                LocalDateTime.now().plusMinutes(10));

                when(checkoutSessionRepository.findByToken("CHK_123")).thenReturn(Optional.of(session));
                when(checkoutSessionMapper.toCheckoutInfoResponse(session)).thenReturn(mockInfo);

                CheckoutInfoResponse info = checkoutService.getCheckoutInfo("CHK_123");

                assertThat(info.token()).isEqualTo("CHK_123");
                assertThat(info.orderId()).isEqualTo("ORD-1");
                assertThat(info.status()).isEqualTo("PENDING");
        }

        @Test
        @DisplayName("getCheckoutInfo - Expired pending session is updated to EXPIRED")
        void getCheckoutInfo_expiredSession_updatesStatusToExpired() {
                CheckoutSession expiredSession = CheckoutSession.builder()
                                .token("CHK_OLD")
                                .merchantName("Store")
                                .orderId("ORD-2")
                                .amount(new BigDecimal("200000"))
                                .status("PENDING")
                                .expiresAt(LocalDateTime.now().minusMinutes(5))
                                .build();

                CheckoutInfoResponse mockInfo = new CheckoutInfoResponse(
                                "CHK_OLD", "Store", "STORE", "ORD-2", new BigDecimal("200000"),
                                "Desc", "http://return.url", null, "EXPIRED", LocalDateTime.now(),
                                LocalDateTime.now().minusMinutes(5));

                when(checkoutSessionRepository.findByToken("CHK_OLD")).thenReturn(Optional.of(expiredSession));
                when(checkoutSessionMapper.toCheckoutInfoResponse(expiredSession)).thenReturn(mockInfo);

                CheckoutInfoResponse info = checkoutService.getCheckoutInfo("CHK_OLD");

                assertThat(info.status()).isEqualTo("EXPIRED");
                verify(checkoutSessionRepository).save(expiredSession);
        }

        @Test
        @DisplayName("getCheckoutInfo - Empty or null token throws BadRequestException")
        void getCheckoutInfo_emptyToken_throwsBadRequest() {
                assertThatThrownBy(() -> checkoutService.getCheckoutInfo(""))
                                .isInstanceOf(BadRequestException.class)
                                .hasMessageContaining("Checkout token cannot be empty");
        }

        @Test
        @DisplayName("getCheckoutInfo - Expired time but status COMPLETED does not change status or call save")
        void getCheckoutInfo_expiredTimeButStatusCompleted_doesNotChangeStatus() {
                CheckoutSession completedSession = CheckoutSession.builder()
                                .token("CHK_COMPLETED")
                                .status("COMPLETED")
                                .expiresAt(LocalDateTime.now().minusMinutes(10))
                                .build();

                CheckoutInfoResponse mockInfo = new CheckoutInfoResponse(
                                "CHK_COMPLETED", "Store", "STORE", "ORD-1", new BigDecimal("200000"),
                                "Desc", "http://return.url", null, "COMPLETED", LocalDateTime.now(),
                                LocalDateTime.now().minusMinutes(10));

                when(checkoutSessionRepository.findByToken("CHK_COMPLETED")).thenReturn(Optional.of(completedSession));
                when(checkoutSessionMapper.toCheckoutInfoResponse(completedSession)).thenReturn(mockInfo);

                CheckoutInfoResponse info = checkoutService.getCheckoutInfo("CHK_COMPLETED");

                assertThat(info.status()).isEqualTo("COMPLETED");
                verify(checkoutSessionRepository, never()).save(any());
        }

        @Test
        @DisplayName("getCheckoutInfo - Non existent token throws ResourceNotFoundException")
        void getCheckoutInfo_notFound_throwsException() {
                when(checkoutSessionRepository.findByToken("CHK_UNKNOWN")).thenReturn(Optional.empty());

                assertThatThrownBy(() -> checkoutService.getCheckoutInfo("CHK_UNKNOWN"))
                                .isInstanceOf(ResourceNotFoundException.class);
        }

        @Test
        @DisplayName("getCheckoutInfoByTxnRef - Empty transactionRef throws BadRequestException")
        void getCheckoutInfoByTxnRef_emptyRef_throwsBadRequest() {
                assertThatThrownBy(() -> checkoutService.getCheckoutInfoByTxnRef(""))
                                .isInstanceOf(BadRequestException.class)
                                .hasMessageContaining("Transaction reference cannot be empty");
        }

        @Test
        @DisplayName("getCheckoutInfoByTxnRef - Non existent transactionRef throws ResourceNotFoundException")
        void getCheckoutInfoByTxnRef_notFound_throwsResourceNotFoundException() {
                when(checkoutSessionRepository.findByTransactionRef("TXN_NOT_EXIST")).thenReturn(Optional.empty());

                assertThatThrownBy(() -> checkoutService.getCheckoutInfoByTxnRef("TXN_NOT_EXIST"))
                                .isInstanceOf(ResourceNotFoundException.class);
        }

        @Test
        @DisplayName("getCheckoutInfoByTxnRef - Happy Path active non-expired session returns info without calling save")
        void getCheckoutInfoByTxnRef_validAndActive_successWithoutSave() {
                CheckoutSession activeSession = CheckoutSession.builder()
                                .token("CHK_ACTIVE")
                                .transactionRef("TXN-ACTIVE-200")
                                .merchantName("Store")
                                .status("PENDING")
                                .expiresAt(LocalDateTime.now().plusMinutes(10))
                                .build();

                CheckoutInfoResponse mockInfo = new CheckoutInfoResponse(
                                "CHK_ACTIVE", "Store", "STORE", "ORD-1", new BigDecimal("200000"),
                                "Desc", "http://return.url", null, "PENDING", LocalDateTime.now(),
                                LocalDateTime.now().plusMinutes(10));

                when(checkoutSessionRepository.findByTransactionRef("TXN-ACTIVE-200"))
                                .thenReturn(Optional.of(activeSession));
                when(checkoutSessionMapper.toCheckoutInfoResponse(activeSession)).thenReturn(mockInfo);

                CheckoutInfoResponse info = checkoutService.getCheckoutInfoByTxnRef("TXN-ACTIVE-200");

                assertThat(info.token()).isEqualTo("CHK_ACTIVE");
                assertThat(info.status()).isEqualTo("PENDING");
                verify(checkoutSessionRepository, never()).save(any());
        }

        @Test
        @DisplayName("getCheckoutInfoByTxnRef - Expired pending transactionRef updates status to EXPIRED")
        void getCheckoutInfoByTxnRef_validRef_success() {
                CheckoutSession expiredSession = CheckoutSession.builder()
                                .token("CHK_TXN_EXPIRED")
                                .transactionRef("TXN-100")
                                .merchantName("Store")
                                .status("PENDING")
                                .expiresAt(LocalDateTime.now().minusMinutes(10))
                                .build();

                CheckoutInfoResponse mockInfo = new CheckoutInfoResponse(
                                "CHK_TXN_EXPIRED", "Store", "STORE", "ORD-1", new BigDecimal("200000"),
                                "Desc", "http://return.url", null, "EXPIRED", LocalDateTime.now(),
                                LocalDateTime.now().minusMinutes(10));

                when(checkoutSessionRepository.findByTransactionRef("TXN-100")).thenReturn(Optional.of(expiredSession));
                when(checkoutSessionMapper.toCheckoutInfoResponse(expiredSession)).thenReturn(mockInfo);

                CheckoutInfoResponse info = checkoutService.getCheckoutInfoByTxnRef("TXN-100");

                assertThat(info.token()).isEqualTo("CHK_TXN_EXPIRED");
                assertThat(info.status()).isEqualTo("EXPIRED");
                verify(checkoutSessionRepository).save(expiredSession);
        }

        @Test
        @DisplayName("processCheckout - Valid OTP and pending session completes payment")
        void processCheckout_validOtp_success() {
                User activeUser = createUser(1L, "user@test.com", true);
                CheckoutSession session = CheckoutSession.builder()
                                .token("CHK_PROCESS")
                                .merchantId(10L)
                                .merchantName("Marketplace Store")
                                .orderId("ORD-9988")
                                .amount(new BigDecimal("500000"))
                                .returnUrl("http://marketplace.test/success")
                                .status("PENDING")
                                .expiresAt(LocalDateTime.now().plusMinutes(10))
                                .build();

                Account merchantAccount = Account.builder().id(50L).ownerId(10L).ownerType(OwnerType.MERCHANT).build();

                TransactionResponse txResponse = new TransactionResponse(
                                "TXN_REF_123", "PROCESSING", new BigDecimal("500000"),
                                1L, 50L, "PAYMENT", "Desc", LocalDateTime.now());

                when(userRepository.findByUsername("user@test.com")).thenReturn(Optional.of(activeUser));
                when(checkoutSessionRepository.findByToken("CHK_PROCESS")).thenReturn(Optional.of(session));
                when(otpService.verifyOtp("user@test.com", "OTP verification for order payment", "123456"))
                                .thenReturn(true);
                when(accountRepository.findByOwnerIdAndOwnerType(10L, OwnerType.MERCHANT))
                                .thenReturn(Optional.of(merchantAccount));
                when(transactionService.processPayment(any(PaymentRequest.class), eq("user@test.com"), eq("127.0.0.1")))
                                .thenReturn(txResponse);

                CheckoutProcessRequest processRequest = new CheckoutProcessRequest("CHK_PROCESS", "123456");

                CheckoutProcessResponse response = checkoutService.processCheckout("user@test.com", processRequest,
                                "127.0.0.1");

                assertThat(response.transactionRef()).isEqualTo("TXN_REF_123");
                assertThat(response.redirectUrl()).contains("status=PROCESSING");
                assertThat(session.getStatus()).isEqualTo("PROCESSING");
                assertThat(session.getTransactionRef()).isEqualTo("TXN_REF_123");
                verify(checkoutSessionRepository).save(session);
        }

        @Test
        @DisplayName("processCheckout - Empty or null username throws BadRequestException")
        void processCheckout_emptyUsername_throwsBadRequest() {
                CheckoutProcessRequest processRequest = new CheckoutProcessRequest("CHK_PROCESS", "123456");

                assertThatThrownBy(() -> checkoutService.processCheckout("", processRequest, "127.0.0.1"))
                                .isInstanceOf(BadRequestException.class)
                                .hasMessageContaining("Username cannot be empty");
        }

        @Test
        @DisplayName("processCheckout - User not found in repository throws BadRequestException")
        void processCheckout_userNotFound_throwsBadRequest() {
                when(userRepository.findByUsername("unknown@test.com")).thenReturn(Optional.empty());
                CheckoutProcessRequest processRequest = new CheckoutProcessRequest("CHK_PROCESS", "123456");

                assertThatThrownBy(
                                () -> checkoutService.processCheckout("unknown@test.com", processRequest, "127.0.0.1"))
                                .isInstanceOf(BadRequestException.class)
                                .hasMessageContaining("Authenticated user not found");
        }

        @Test
        @DisplayName("processCheckout - User account is inactive throws BadRequestException")
        void processCheckout_userInactive_throwsBadRequest() {
                User inactiveUser = createUser(2L, "inactive@test.com", false);
                when(userRepository.findByUsername("inactive@test.com")).thenReturn(Optional.of(inactiveUser));
                CheckoutProcessRequest processRequest = new CheckoutProcessRequest("CHK_PROCESS", "123456");

                assertThatThrownBy(
                                () -> checkoutService.processCheckout("inactive@test.com", processRequest, "127.0.0.1"))
                                .isInstanceOf(BadRequestException.class)
                                .hasMessageContaining("User account is currently inactive or disabled");
        }

        @Test
        @DisplayName("processCheckout - Checkout session does not exist throws ResourceNotFoundException")
        void processCheckout_sessionNotFound_throwsResourceNotFound() {
                User activeUser = createUser(1L, "user@test.com", true);
                when(userRepository.findByUsername("user@test.com")).thenReturn(Optional.of(activeUser));
                when(checkoutSessionRepository.findByToken("CHK_NOT_EXIST")).thenReturn(Optional.empty());

                CheckoutProcessRequest processRequest = new CheckoutProcessRequest("CHK_NOT_EXIST", "123456");

                assertThatThrownBy(() -> checkoutService.processCheckout("user@test.com", processRequest, "127.0.0.1"))
                                .isInstanceOf(ResourceNotFoundException.class)
                                .hasMessageContaining("Checkout session does not exist");
        }

        @Test
        @DisplayName("processCheckout - Session status is not PENDING throws BadRequestException")
        void processCheckout_sessionNotPending_throwsBadRequest() {
                User activeUser = createUser(1L, "user@test.com", true);
                CheckoutSession completedSession = CheckoutSession.builder()
                                .token("CHK_COMPLETED")
                                .status("COMPLETED")
                                .expiresAt(LocalDateTime.now().plusMinutes(10))
                                .build();

                when(userRepository.findByUsername("user@test.com")).thenReturn(Optional.of(activeUser));
                when(checkoutSessionRepository.findByToken("CHK_COMPLETED")).thenReturn(Optional.of(completedSession));

                CheckoutProcessRequest processRequest = new CheckoutProcessRequest("CHK_COMPLETED", "123456");

                assertThatThrownBy(() -> checkoutService.processCheckout("user@test.com", processRequest, "127.0.0.1"))
                                .isInstanceOf(BadRequestException.class)
                                .hasMessageContaining("cannot be processed");
        }

        @Test
        @DisplayName("processCheckout - Session expired updates status to EXPIRED and throws BadRequestException")
        void processCheckout_sessionExpired_updatesStatusAndThrowsBadRequest() {
                User activeUser = createUser(1L, "user@test.com", true);
                CheckoutSession expiredSession = CheckoutSession.builder()
                                .token("CHK_EXP")
                                .status("PENDING")
                                .expiresAt(LocalDateTime.now().minusMinutes(5))
                                .build();

                when(userRepository.findByUsername("user@test.com")).thenReturn(Optional.of(activeUser));
                when(checkoutSessionRepository.findByToken("CHK_EXP")).thenReturn(Optional.of(expiredSession));

                CheckoutProcessRequest processRequest = new CheckoutProcessRequest("CHK_EXP", "123456");

                assertThatThrownBy(() -> checkoutService.processCheckout("user@test.com", processRequest, "127.0.0.1"))
                                .isInstanceOf(BadRequestException.class)
                                .hasMessageContaining("Checkout session has expired");

                assertThat(expiredSession.getStatus()).isEqualTo("EXPIRED");
                verify(checkoutSessionRepository).save(expiredSession);
        }

        @Test
        @DisplayName("processCheckout - Invalid OTP throws BadRequestException")
        void processCheckout_invalidOtp_throwsBadRequest() {
                User activeUser = createUser(1L, "user@test.com", true);
                CheckoutSession session = CheckoutSession.builder()
                                .token("CHK_PROCESS")
                                .status("PENDING")
                                .expiresAt(LocalDateTime.now().plusMinutes(10))
                                .build();

                when(userRepository.findByUsername("user@test.com")).thenReturn(Optional.of(activeUser));
                when(checkoutSessionRepository.findByToken("CHK_PROCESS")).thenReturn(Optional.of(session));
                when(otpService.verifyOtp("user@test.com", "OTP verification for order payment", "999999"))
                                .thenReturn(false);

                CheckoutProcessRequest processRequest = new CheckoutProcessRequest("CHK_PROCESS", "999999");

                assertThatThrownBy(() -> checkoutService.processCheckout("user@test.com", processRequest, "127.0.0.1"))
                                .isInstanceOf(BadRequestException.class)
                                .hasMessageContaining("Invalid or expired OTP code");

                verify(transactionService, never()).processPayment(any(PaymentRequest.class), any(String.class),
                                any(String.class));
        }

        @Test
        @DisplayName("processCheckout - Merchant wallet account missing throws ResourceNotFoundException")
        void processCheckout_merchantAccountNotFound_throwsResourceNotFound() {
                User activeUser = createUser(1L, "user@test.com", true);
                CheckoutSession session = CheckoutSession.builder()
                                .token("CHK_PROCESS")
                                .merchantId(999L)
                                .status("PENDING")
                                .expiresAt(LocalDateTime.now().plusMinutes(10))
                                .build();

                when(userRepository.findByUsername("user@test.com")).thenReturn(Optional.of(activeUser));
                when(checkoutSessionRepository.findByToken("CHK_PROCESS")).thenReturn(Optional.of(session));
                when(otpService.verifyOtp("user@test.com", "OTP verification for order payment", "123456"))
                                .thenReturn(true);
                when(accountRepository.findByOwnerIdAndOwnerType(999L, OwnerType.MERCHANT))
                                .thenReturn(Optional.empty());

                CheckoutProcessRequest processRequest = new CheckoutProcessRequest("CHK_PROCESS", "123456");

                assertThatThrownBy(() -> checkoutService.processCheckout("user@test.com", processRequest, "127.0.0.1"))
                                .isInstanceOf(ResourceNotFoundException.class)
                                .hasMessageContaining("Merchant wallet account does not exist");
        }
}
