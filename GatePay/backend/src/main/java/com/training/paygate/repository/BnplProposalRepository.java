package com.training.paygate.repository;

import com.training.paygate.entity.BnplProposal;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface BnplProposalRepository extends JpaRepository<BnplProposal, Long> {

    Optional<BnplProposal> findByProposalRef(String proposalRef);
}
