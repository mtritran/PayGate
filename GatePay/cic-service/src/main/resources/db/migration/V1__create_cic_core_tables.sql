CREATE TABLE cic_credit_profiles (
    id BIGSERIAL PRIMARY KEY,
    customer_id BIGINT NOT NULL UNIQUE,
    total_transactions BIGINT NOT NULL DEFAULT 0,
    on_time_payments BIGINT NOT NULL DEFAULT 0,
    missed_payments BIGINT NOT NULL DEFAULT 0,
    current_balance DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    used_credit DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    max_days_past_due INT NOT NULL DEFAULT 0,
    active_bad_debt BOOLEAN NOT NULL DEFAULT FALSE,
    write_off BOOLEAN NOT NULL DEFAULT FALSE,
    provider_fraud_reported BOOLEAN NOT NULL DEFAULT FALSE,
    data_as_of TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE cic_credit_events (
    id BIGSERIAL PRIMARY KEY,
    event_id VARCHAR(80) NOT NULL UNIQUE,
    event_type VARCHAR(50) NOT NULL,
    provider VARCHAR(50) NOT NULL,
    customer_id BIGINT NOT NULL,
    total_transactions BIGINT NOT NULL DEFAULT 0,
    on_time_payments BIGINT NOT NULL DEFAULT 0,
    missed_payments BIGINT NOT NULL DEFAULT 0,
    current_balance DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    used_credit DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    max_days_past_due INT NOT NULL DEFAULT 0,
    active_bad_debt BOOLEAN NOT NULL DEFAULT FALSE,
    write_off BOOLEAN NOT NULL DEFAULT FALSE,
    provider_fraud_reported BOOLEAN NOT NULL DEFAULT FALSE,
    occurred_at TIMESTAMP NOT NULL,
    received_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE cic_credit_assessments (
    id BIGSERIAL PRIMARY KEY,
    assessment_ref VARCHAR(80) NOT NULL UNIQUE,
    customer_id BIGINT NOT NULL,
    requested_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    plan VARCHAR(50),
    approved BOOLEAN NOT NULL,
    score INT,
    tier VARCHAR(20) NOT NULL,
    approved_limit DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    max_loan_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    reason VARCHAR(80) NOT NULL,
    model_version VARCHAR(30) NOT NULL,
    rule_version VARCHAR(30) NOT NULL,
    assessed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_cic_credit_profiles_customer ON cic_credit_profiles(customer_id);
CREATE INDEX idx_cic_credit_events_customer ON cic_credit_events(customer_id);
CREATE INDEX idx_cic_credit_assessments_customer ON cic_credit_assessments(customer_id);
