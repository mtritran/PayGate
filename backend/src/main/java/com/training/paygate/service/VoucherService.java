package com.training.paygate.service;

import com.training.paygate.dto.request.VoucherApplyRequest;
import com.training.paygate.dto.request.VoucherCreateRequest;
import com.training.paygate.dto.request.VoucherRedeemRequest;
import com.training.paygate.dto.response.UserVoucherResponse;
import com.training.paygate.dto.response.VoucherApplyResponse;
import com.training.paygate.dto.response.VoucherResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface VoucherService {

    VoucherResponse createVoucher(VoucherCreateRequest request);

    Page<VoucherResponse> getShopVouchers(Pageable pageable);

    UserVoucherResponse redeemVoucher(Long userId, VoucherRedeemRequest request);

    List<UserVoucherResponse> getMyVouchers(Long userId);

    VoucherApplyResponse applyVoucher(Long userId, VoucherApplyRequest request);

    Page<VoucherResponse> getAllVouchersForAdmin(Pageable pageable);

    VoucherResponse updateVoucher(Long id, VoucherCreateRequest request);
}
