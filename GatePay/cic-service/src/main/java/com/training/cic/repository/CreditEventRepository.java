package com.training.cic.repository;

import com.training.cic.entity.CreditEvent;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CreditEventRepository extends JpaRepository<CreditEvent, Long> {

    boolean existsByEventId(String eventId);
}
