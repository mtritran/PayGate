CREATE TABLE user_vouchers (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    voucher_id BIGINT NOT NULL REFERENCES vouchers(id),
    status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE',
    redeemed_at TIMESTAMP NOT NULL DEFAULT NOW(),
    used_at TIMESTAMP
);

CREATE TABLE point_transactions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    points INT NOT NULL,
    type VARCHAR(20) NOT NULL,
    description VARCHAR(255) NOT NULL,
    transaction_ref VARCHAR(50),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_vouchers_user ON user_vouchers(user_id);
CREATE INDEX idx_user_vouchers_status ON user_vouchers(user_id, status) WHERE status = 'AVAILABLE';
CREATE INDEX idx_point_txns_user ON point_transactions(user_id);
