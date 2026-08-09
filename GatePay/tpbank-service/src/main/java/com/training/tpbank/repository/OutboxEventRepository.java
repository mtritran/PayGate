package com.training.tpbank.repository;

import com.training.tpbank.entity.OutboxEvent;
import com.training.tpbank.enums.OutboxStatus;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

public interface OutboxEventRepository extends JpaRepository<OutboxEvent, Long> {

    List<OutboxEvent> findByStatusInAndNextAttemptAtLessThanEqualOrderByCreatedAtAsc(
            Collection<OutboxStatus> statuses,
            LocalDateTime nextAttemptAt,
            Pageable pageable
    );
}
