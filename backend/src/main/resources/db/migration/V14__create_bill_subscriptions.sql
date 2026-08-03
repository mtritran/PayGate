-- Feature 5 extension: bill_subscriptions
-- User dang ky lam khach hang cua mot provider (VD "toi la KH EVN Ha Noi voi ma PE01100001").
-- PayGate se chu dong sinh bill UNPAID moi ky theo `frequency` + `next_bill_at`.

CREATE TABLE bill_subscriptions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider_id BIGINT NOT NULL REFERENCES bill_providers(id),
    customer_code VARCHAR(50) NOT NULL,
    customer_name VARCHAR(100) NOT NULL,
    address VARCHAR(255),
    cycle_amount DECIMAL(15,2) NOT NULL,
    frequency VARCHAR(20) NOT NULL DEFAULT 'MONTHLY', -- MINUTELY, DAILY, WEEKLY, MONTHLY
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',     -- ACTIVE, PAUSED, CANCELLED
    next_bill_at TIMESTAMP NOT NULL,
    last_bill_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_bill_subscription_user_provider_code UNIQUE (user_id, provider_id, customer_code)
);

CREATE INDEX idx_bill_subscriptions_user ON bill_subscriptions(user_id);
CREATE INDEX idx_bill_subscriptions_due
    ON bill_subscriptions(status, next_bill_at)
    WHERE status = 'ACTIVE';
