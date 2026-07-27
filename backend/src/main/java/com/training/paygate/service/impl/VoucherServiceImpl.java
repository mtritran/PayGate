package com.training.paygate.service.impl;

import com.training.paygate.dto.request.VoucherApplyRequest;
import com.training.paygate.dto.request.VoucherCreateRequest;
import com.training.paygate.dto.request.VoucherRedeemRequest;
import com.training.paygate.dto.response.UserVoucherResponse;
import com.training.paygate.dto.response.VoucherApplyResponse;
import com.training.paygate.dto.response.VoucherResponse;
import com.training.paygate.entity.PointTransaction;
import com.training.paygate.entity.User;
import com.training.paygate.entity.UserVoucher;
import com.training.paygate.entity.Voucher;
import com.training.paygate.enums.PointTransactionType;
import com.training.paygate.enums.UserVoucherStatus;
import com.training.paygate.enums.VoucherApplicableType;
import com.training.paygate.exception.BadRequestException;
import com.training.paygate.exception.DuplicateResourceException;
import com.training.paygate.exception.ResourceNotFoundException;
import com.training.paygate.repository.PointTransactionRepository;
import com.training.paygate.repository.UserRepository;
import com.training.paygate.repository.UserVoucherRepository;
import com.training.paygate.repository.VoucherRepository;
import com.training.paygate.service.VoucherService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class VoucherServiceImpl implements VoucherService {

    private final VoucherRepository voucherRepository;
    private final UserVoucherRepository userVoucherRepository;
    private final PointTransactionRepository pointTransactionRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional
    public VoucherResponse createVoucher(VoucherCreateRequest request) {
        if (voucherRepository.existsByCode(request.code())) {
            throw new DuplicateResourceException("Voucher", "code", request.code());
        }

        Voucher voucher = Voucher.builder()
                .code(request.code())
                .title(request.title())
                .discountAmount(request.discountAmount())
                .pointsRequired(request.pointsRequired())
                .minOrderAmount(request.minOrderAmount() != null ? request.minOrderAmount() : BigDecimal.ZERO)
                .applicableType(request.applicableType() != null ? request.applicableType() : VoucherApplicableType.ALL)
                .totalQuantity(request.totalQuantity())
                .remainingQty(request.totalQuantity())
                .expiresAt(request.expiresAt())
                .build();

        Voucher saved = voucherRepository.save(voucher);
        log.info("[VOUCHER] Created voucher code: {}", saved.getCode());
        return mapToVoucherResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<VoucherResponse> getShopVouchers(Pageable pageable) {
        return voucherRepository.findByRemainingQtyGreaterThanAndExpiresAtAfter(0, LocalDateTime.now(), pageable)
                .map(this::mapToVoucherResponse);
    }

    @Override
    @Transactional
    public UserVoucherResponse redeemVoucher(Long userId, VoucherRedeemRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));

        Voucher voucher = voucherRepository.findById(request.voucherId())
                .orElseThrow(() -> new ResourceNotFoundException("Voucher", request.voucherId()));

        if (voucher.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new BadRequestException("Voucher has expired");
        }

        if (voucher.getRemainingQty() <= 0) {
            throw new BadRequestException("Voucher is out of stock");
        }

        // Check User Points
        Integer currentPoints = pointTransactionRepository.getTotalPointsByUserId(userId);
        if (currentPoints < voucher.getPointsRequired()) {
            throw new BadRequestException("Insufficient reward points. Required: " + voucher.getPointsRequired() + ", current: " + currentPoints);
        }

        // Atomic update for remaining quantity to handle concurrency
        int updated = voucherRepository.decreaseRemainingQty(voucher.getId());
        if (updated == 0) {
            throw new BadRequestException("Voucher is out of stock (concurrent update)");
        }

        // Deduct points
        PointTransaction redeemTx = PointTransaction.builder()
                .user(user)
                .points(-voucher.getPointsRequired())
                .type(PointTransactionType.REDEEM)
                .description("Đổi mã giảm giá: " + voucher.getCode())
                .build();
        pointTransactionRepository.save(redeemTx);

        // Save UserVoucher
        UserVoucher userVoucher = UserVoucher.builder()
                .user(user)
                .voucher(voucher)
                .status(UserVoucherStatus.AVAILABLE)
                .redeemedAt(LocalDateTime.now())
                .build();

        UserVoucher savedUserVoucher = userVoucherRepository.save(userVoucher);
        log.info("[VOUCHER] User {} redeemed voucher {} successfully", userId, voucher.getCode());

        return mapToUserVoucherResponse(savedUserVoucher);
    }

    @Override
    @Transactional(readOnly = true)
    public List<UserVoucherResponse> getMyVouchers(Long userId) {
        return userVoucherRepository.findByUserId(userId).stream()
                .map(this::mapToUserVoucherResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public VoucherApplyResponse applyVoucher(Long userId, VoucherApplyRequest request) {
        Voucher voucher = voucherRepository.findByCode(request.voucherCode())
                .orElseThrow(() -> new ResourceNotFoundException("Voucher not found with code: " + request.voucherCode()));

        UserVoucher userVoucher = userVoucherRepository.findByUserIdAndVoucherIdAndStatus(userId, voucher.getId(), UserVoucherStatus.AVAILABLE)
                .orElseThrow(() -> new BadRequestException("Voucher code not found or not available in your collection"));

        if (voucher.getExpiresAt().isBefore(LocalDateTime.now())) {
            return VoucherApplyResponse.builder()
                    .valid(false)
                    .message("Voucher has expired")
                    .build();
        }

        if (request.originalAmount().compareTo(voucher.getMinOrderAmount()) < 0) {
            return VoucherApplyResponse.builder()
                    .valid(false)
                    .message("Order amount is below minimum order requirement of " + voucher.getMinOrderAmount())
                    .build();
        }

        if (voucher.getApplicableType() != VoucherApplicableType.ALL && voucher.getApplicableType() != request.transactionType()) {
            return VoucherApplyResponse.builder()
                    .valid(false)
                    .message("Voucher is not applicable for transaction type " + request.transactionType())
                    .build();
        }

        BigDecimal discountAmount = voucher.getDiscountAmount();
        BigDecimal finalAmount = request.originalAmount().subtract(discountAmount);
        if (finalAmount.compareTo(BigDecimal.ZERO) < 0) {
            finalAmount = BigDecimal.ZERO;
        }

        return VoucherApplyResponse.builder()
                .valid(true)
                .discountAmount(discountAmount)
                .finalAmount(finalAmount)
                .userVoucherId(userVoucher.getId())
                .message("Voucher applied successfully")
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public Page<VoucherResponse> getAllVouchersForAdmin(Pageable pageable) {
        return voucherRepository.findAll(pageable).map(this::mapToVoucherResponse);
    }

    @Override
    @Transactional
    public VoucherResponse updateVoucher(Long id, VoucherCreateRequest request) {
        Voucher voucher = voucherRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Voucher", id));

        voucher.setTitle(request.title());
        if (request.discountAmount() != null) voucher.setDiscountAmount(request.discountAmount());
        if (request.pointsRequired() != null) voucher.setPointsRequired(request.pointsRequired());
        if (request.minOrderAmount() != null) voucher.setMinOrderAmount(request.minOrderAmount());
        if (request.applicableType() != null) voucher.setApplicableType(request.applicableType());
        if (request.expiresAt() != null) voucher.setExpiresAt(request.expiresAt());

        Voucher updated = voucherRepository.save(voucher);
        return mapToVoucherResponse(updated);
    }

    private VoucherResponse mapToVoucherResponse(Voucher voucher) {
        return VoucherResponse.builder()
                .id(voucher.getId())
                .code(voucher.getCode())
                .title(voucher.getTitle())
                .discountAmount(voucher.getDiscountAmount())
                .pointsRequired(voucher.getPointsRequired())
                .minOrderAmount(voucher.getMinOrderAmount())
                .applicableType(voucher.getApplicableType())
                .totalQuantity(voucher.getTotalQuantity())
                .remainingQty(voucher.getRemainingQty())
                .expiresAt(voucher.getExpiresAt())
                .createdAt(voucher.getCreatedAt())
                .build();
    }

    private UserVoucherResponse mapToUserVoucherResponse(UserVoucher userVoucher) {
        Voucher voucher = userVoucher.getVoucher();
        return UserVoucherResponse.builder()
                .userVoucherId(userVoucher.getId())
                .voucherId(voucher.getId())
                .voucherCode(voucher.getCode())
                .title(voucher.getTitle())
                .discountAmount(voucher.getDiscountAmount())
                .status(userVoucher.getStatus())
                .redeemedAt(userVoucher.getRedeemedAt())
                .usedAt(userVoucher.getUsedAt())
                .expiresAt(voucher.getExpiresAt())
                .build();
    }
}
