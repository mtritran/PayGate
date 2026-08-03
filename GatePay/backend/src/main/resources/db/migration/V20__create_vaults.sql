CREATE TABLE IF NOT EXISTS vaults (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    account_id BIGINT UNIQUE REFERENCES accounts(id),
    name VARCHAR(100) NOT NULL,
    description VARCHAR(500),
    target_amount DECIMAL(15,2) NOT NULL CHECK (target_amount > 0),
    deadline DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    closed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_vaults_user_id ON vaults(user_id);
CREATE INDEX IF NOT EXISTS idx_vaults_status ON vaults(status);
