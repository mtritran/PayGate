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

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("UPDATE Voucher v SET v.remainingQty = v.remainingQty - 1 WHERE v.id = :id AND v.remainingQty > 0")
    int decreaseRemainingQty(@org.springframework.data.repository.query.Param("id") Long id);
}
