package com.training.cic.repository;

import com.training.cic.entity.CreditAssessment;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CreditAssessmentRepository extends JpaRepository<CreditAssessment, Long> {
}
