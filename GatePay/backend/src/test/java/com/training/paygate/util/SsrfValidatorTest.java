package com.training.paygate.util;

import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SsrfValidatorTest {

    @Test
    void localhostIsAllowedWhenExplicitlyConfiguredForLocalDevelopment() {
        SsrfValidator validator = new SsrfValidator("localhost", new MockEnvironment());

        assertThat(validator.isSafeUrl("http://localhost:8080/api/v1/webhooks/gatepay")).isTrue();
    }

    @Test
    void loopbackAddressIsBlockedWhenItIsNotAllowlisted() {
        SsrfValidator validator = new SsrfValidator("localhost", new MockEnvironment());

        assertThat(validator.isSafeUrl("http://127.0.0.1:8080/internal")).isFalse();
    }

    @Test
    void nonHttpSchemeIsBlocked() {
        SsrfValidator validator = new SsrfValidator("localhost", new MockEnvironment());

        assertThat(validator.isSafeUrl("file://localhost/etc/passwd")).isFalse();
    }

    @Test
    void productionRejectsInternalHostAllowlist() {
        MockEnvironment environment = new MockEnvironment();
        environment.setActiveProfiles("prod");

        assertThatThrownBy(() -> new SsrfValidator("localhost", environment))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("WEBHOOK_ALLOWED_INTERNAL_HOSTS");
    }
}
