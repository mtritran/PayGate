package com.training.paygate.repository;

import com.training.paygate.entity.BillProvider;
import com.training.paygate.enums.BillType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BillProviderRepository extends JpaRepository<BillProvider, Long> {

    Optional<BillProvider> findByCode(String code);

    List<BillProvider> findByActiveTrue();

    List<BillProvider> findByTypeAndActiveTrue(BillType type);
}
