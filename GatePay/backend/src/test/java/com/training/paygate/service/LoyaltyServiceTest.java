package com.training.paygate.service;

import com.training.paygate.entity.PointTransaction;
import com.training.paygate.entity.User;
import com.training.paygate.repository.PointTransactionRepository;
import com.training.paygate.repository.UserRepository;
import com.training.paygate.service.impl.LoyaltyServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class LoyaltyServiceTest {

    @Mock
    private PointTransactionRepository pointTransactionRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private LoyaltyServiceImpl loyaltyService;

    @Test
    void earnPoints_usesCurrentTenThousandVndRate() {
        User user = User.builder().username("user1").build();
        user.setId(1L);

        when(pointTransactionRepository.existsByTransactionRef("TXN-PAY-100K")).thenReturn(false);
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));

        loyaltyService.earnPoints(1L, BigDecimal.valueOf(100_000), "TXN-PAY-100K");

        ArgumentCaptor<PointTransaction> captor = ArgumentCaptor.forClass(PointTransaction.class);
        verify(pointTransactionRepository).save(captor.capture());
        assertThat(captor.getValue().getPoints()).isEqualTo(10);
        assertThat(captor.getValue().getTransactionRef()).isEqualTo("TXN-PAY-100K");
    }
}
