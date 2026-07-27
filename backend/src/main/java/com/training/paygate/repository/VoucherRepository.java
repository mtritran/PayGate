package com.training.paygate.repository;

import com.training.paygate.entity.Voucher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.Optional;

public interface VoucherRepository extends JpaRepository<Voucher, Long> {

    Optional<Voucher> findByCode(String code);

    boolean existsByCode(String code);

    Page<Voucher> findByRemainingQtyGreaterThanAndExpiresAtAfter(int minQty, LocalDateTime now, Pageable pageable);
}
