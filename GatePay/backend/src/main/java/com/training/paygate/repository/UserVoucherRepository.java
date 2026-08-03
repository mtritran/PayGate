package com.training.paygate.repository;

import com.training.paygate.entity.UserVoucher;
import com.training.paygate.enums.UserVoucherStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface UserVoucherRepository extends JpaRepository<UserVoucher, Long> {

    List<UserVoucher> findByUserIdAndStatus(Long userId, UserVoucherStatus status);

    List<UserVoucher> findByUserId(Long userId);

    Optional<UserVoucher> findByUserIdAndVoucherIdAndStatus(Long userId, Long voucherId, UserVoucherStatus status);

    @Query("SELECT uv FROM UserVoucher uv JOIN uv.voucher v WHERE uv.user.id = :userId AND v.code = :voucherCode AND uv.status = :status")
    Optional<UserVoucher> findByUserIdAndVoucherCodeAndStatus(
            @Param("userId") Long userId,
            @Param("voucherCode") String voucherCode,
            @Param("status") UserVoucherStatus status);
}
