CREATE TABLE IF NOT EXISTS linked_banks (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    bank_name VARCHAR(100) NOT NULL,
    account_number VARCHAR(50) NOT NULL,
    account_holder VARCHAR(100) NOT NULL,
    balance NUMERIC(15, 2) NOT NULL DEFAULT 5000000.00,
    icon_type VARCHAR(20) NOT NULL DEFAULT 'BANK',
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_linked_banks_user_id ON linked_banks(user_id);
CREATE INDEX IF NOT EXISTS idx_linked_banks_status ON linked_banks(status);
