CREATE TABLE recurring_payments (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    type VARCHAR(30) NOT NULL, -- RECURRING_TRANSFER, BILL_PAYMENT
    category VARCHAR(30) NOT NULL, -- TRANSFER, ELECTRICITY, WATER, INTERNET
    provider_code VARCHAR(50),
    bill_code VARCHAR(100),
    dest_account_id BIGINT REFERENCES accounts(id),
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'VND',
    description TEXT,
    frequency VARCHAR(20) NOT NULL, -- ONCE, MINUTELY, DAILY, WEEKLY, MONTHLY
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, PAUSED, COMPLETED, CANCELLED
    start_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    next_run_at TIMESTAMP NOT NULL,
    last_run_at TIMESTAMP,
    failure_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE recurring_payment_logs (
    id BIGSERIAL PRIMARY KEY,
    recurring_payment_id BIGINT NOT NULL REFERENCES recurring_payments(id) ON DELETE CASCADE,
    transaction_ref VARCHAR(50),
    status VARCHAR(30) NOT NULL, -- SUCCESS, FAILED_INSUFFICIENT_BALANCE, FAILED_ERROR
    message TEXT,
    executed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_recurring_payments_user ON recurring_payments(user_id);
CREATE INDEX idx_recurring_payments_due ON recurring_payments(status, next_run_at) WHERE status = 'ACTIVE';
