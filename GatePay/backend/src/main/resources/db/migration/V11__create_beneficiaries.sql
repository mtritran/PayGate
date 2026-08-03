-- Migration V11: Create beneficiaries table for quick transfer contact book

CREATE TABLE beneficiaries (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    beneficiary_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    account_number VARCHAR(50) NOT NULL,
    account_holder_name VARCHAR(100) NOT NULL,
    nick_name VARCHAR(100),
    bank_name VARCHAR(50) DEFAULT 'PayGate Ví',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_user_beneficiary_account UNIQUE (user_id, account_number)
);

CREATE INDEX idx_beneficiaries_user_id ON beneficiaries(user_id);
