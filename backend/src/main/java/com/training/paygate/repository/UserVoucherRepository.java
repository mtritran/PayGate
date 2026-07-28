package com.training.paygate.repository;

import com.training.paygate.entity.UserVoucher;
import com.training.paygate.enums.UserVoucherStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserVoucherRepository extends JpaRepository<UserVoucher, Long> {

    List<UserVoucher> findByUserIdAndStatus(Long userId, UserVoucherStatus status);

    List<UserVoucher> findByUserId(Long userId);

    Optional<UserVoucher> findByUserIdAndVoucherIdAndStatus(Long userId, Long voucherId, UserVoucherStatus status);
}
