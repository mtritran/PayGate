CREATE TABLE IF NOT EXISTS checkout_sessions (
    id BIGSERIAL PRIMARY KEY,
    token VARCHAR(100) NOT NULL UNIQUE,
    merchant_id BIGINT NOT NULL,
    merchant_code VARCHAR(50) NOT NULL,
    merchant_name VARCHAR(255) NOT NULL,
    order_id VARCHAR(100) NOT NULL,
    amount NUMERIC(19, 2) NOT NULL,
    description VARCHAR(500),
    return_url VARCHAR(500) NOT NULL,
    cancel_url VARCHAR(500),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    transaction_ref VARCHAR(100),
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_checkout_token ON checkout_sessions(token);
