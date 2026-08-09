ALTER TABLE checkout_sessions
    ADD COLUMN IF NOT EXISTS method VARCHAR(30),
    ADD COLUMN IF NOT EXISTS upfront_amount DECIMAL(15,2),
    ADD COLUMN IF NOT EXISTS finance_amount DECIMAL(15,2),
    ADD COLUMN IF NOT EXISTS customer_id BIGINT,
    ADD COLUMN IF NOT EXISTS credit_score INT,
    ADD COLUMN IF NOT EXISTS risk_grade VARCHAR(20),
    ADD COLUMN IF NOT EXISTS approved_limit DECIMAL(15,2),
    ADD COLUMN IF NOT EXISTS maximum_financed_amount DECIMAL(15,2),
    ADD COLUMN IF NOT EXISTS assessment_reason VARCHAR(80);

CREATE TABLE IF NOT EXISTS bnpl_proposals (
    id BIGSERIAL PRIMARY KEY,
    proposal_ref VARCHAR(80) NOT NULL UNIQUE,
    checkout_token VARCHAR(100) NOT NULL REFERENCES checkout_sessions(token),
    user_id BIGINT NOT NULL REFERENCES users(id),
    merchant_id BIGINT NOT NULL REFERENCES merchants(id),
    financed_amount DECIMAL(15,2) NOT NULL,
    upfront_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    tenor_months INT NOT NULL,
    monthly_installment DECIMAL(15,2) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING_CONFIRMATION',
    loan_id BIGINT REFERENCES loans(id),
    transaction_ref VARCHAR(50),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_bnpl_proposals_checkout ON bnpl_proposals(checkout_token);
CREATE INDEX IF NOT EXISTS idx_bnpl_proposals_user ON bnpl_proposals(user_id);

INSERT INTO users (id, username, email, password, full_name, role, active)
VALUES (
    1024,
    'customer1024',
    'customer1024@paygate.dev',
    '$2a$10$dXJ3SW6G7P50lGmMkkmwe.20cQQubK3.HZWmXBDdcCNSrTQyTZbaG',
    'Nguyen Van Tot',
    'USER',
    TRUE
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO accounts (owner_id, owner_type, account_number, balance, currency, status)
SELECT 1024, 'USER', 'USR0000000000001024', 0.00, 'VND', 'ACTIVE'
WHERE NOT EXISTS (
    SELECT 1
    FROM accounts
    WHERE owner_id = 1024
      AND owner_type = 'USER'
);

SELECT setval(pg_get_serial_sequence('users', 'id'), (SELECT MAX(id) FROM users));
