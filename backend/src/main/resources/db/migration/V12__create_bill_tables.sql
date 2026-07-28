-- Feature 5: Bill Payment System
-- Creates bill_providers, bills, saved_bills + seed data.

CREATE TABLE bill_providers (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(30) NOT NULL,
    merchant_id BIGINT NOT NULL REFERENCES merchants(id),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE bills (
    id BIGSERIAL PRIMARY KEY,
    provider_id BIGINT NOT NULL REFERENCES bill_providers(id),
    customer_code VARCHAR(50) NOT NULL,
    customer_name VARCHAR(100) NOT NULL,
    address VARCHAR(255),
    amount DECIMAL(15,2) NOT NULL,
    period VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'UNPAID',
    transaction_ref VARCHAR(50),
    paid_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE saved_bills (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    provider_id BIGINT NOT NULL REFERENCES bill_providers(id),
    customer_code VARCHAR(50) NOT NULL,
    nickname VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_saved_bill_user_provider_code UNIQUE (user_id, provider_id, customer_code)
);

CREATE INDEX idx_bills_customer ON bills(provider_id, customer_code);
CREATE INDEX idx_bills_status ON bills(status) WHERE status = 'UNPAID';
CREATE INDEX idx_saved_bills_user ON saved_bills(user_id);

-- Seed users (Provider Merchant owners). Password BCrypt hash of "Provider@123".
INSERT INTO users (username, email, password, full_name, role, active) VALUES
    ('evn_provider',   'evn@paygate.dev',   '$2a$10$dXJ3SW6G7P50lGmMkkmwe.20cQQubK3.HZWmXBDdcCNSrTQyTZbaG', 'EVN Provider Account',   'USER', TRUE),
    ('water_provider', 'water@paygate.dev', '$2a$10$dXJ3SW6G7P50lGmMkkmwe.20cQQubK3.HZWmXBDdcCNSrTQyTZbaG', 'Water Provider Account', 'USER', TRUE),
    ('isp_provider',   'isp@paygate.dev',   '$2a$10$dXJ3SW6G7P50lGmMkkmwe.20cQQubK3.HZWmXBDdcCNSrTQyTZbaG', 'ISP Provider Account',   'USER', TRUE)
ON CONFLICT (username) DO NOTHING;

-- Seed merchants tied to those users.
INSERT INTO merchants (user_id, merchant_name, merchant_code, api_key, active, status)
SELECT u.id, 'EVN Merchant', 'EVN_MERCHANT', 'apikey_evn_seed_' || u.id, TRUE, 'ACTIVE'
FROM users u WHERE u.username = 'evn_provider'
ON CONFLICT (merchant_code) DO NOTHING;

INSERT INTO merchants (user_id, merchant_name, merchant_code, api_key, active, status)
SELECT u.id, 'Water Merchant', 'WATER_MERCHANT', 'apikey_water_seed_' || u.id, TRUE, 'ACTIVE'
FROM users u WHERE u.username = 'water_provider'
ON CONFLICT (merchant_code) DO NOTHING;

INSERT INTO merchants (user_id, merchant_name, merchant_code, api_key, active, status)
SELECT u.id, 'ISP Merchant', 'ISP_MERCHANT', 'apikey_isp_seed_' || u.id, TRUE, 'ACTIVE'
FROM users u WHERE u.username = 'isp_provider'
ON CONFLICT (merchant_code) DO NOTHING;

-- Seed merchant accounts.
INSERT INTO accounts (owner_id, owner_type, account_number, balance, currency, status)
SELECT m.id, 'MERCHANT', 'MER' || LPAD(m.id::text, 15, '0'), 0.00, 'VND', 'ACTIVE'
FROM merchants m WHERE m.merchant_code IN ('EVN_MERCHANT', 'WATER_MERCHANT', 'ISP_MERCHANT')
  AND NOT EXISTS (
    SELECT 1 FROM accounts a WHERE a.owner_type = 'MERCHANT' AND a.owner_id = m.id
  );

-- Seed bill_providers referencing seeded merchants.
INSERT INTO bill_providers (code, name, type, merchant_id, active)
SELECT 'EVN_HANOI', 'EVN Ha Noi', 'ELECTRICITY', m.id, TRUE
FROM merchants m WHERE m.merchant_code = 'EVN_MERCHANT'
ON CONFLICT (code) DO NOTHING;

INSERT INTO bill_providers (code, name, type, merchant_id, active)
SELECT 'EVN_HCM', 'EVN TP.HCM', 'ELECTRICITY', m.id, TRUE
FROM merchants m WHERE m.merchant_code = 'EVN_MERCHANT'
ON CONFLICT (code) DO NOTHING;

INSERT INTO bill_providers (code, name, type, merchant_id, active)
SELECT 'SAWACO', 'Nuoc Sai Gon SAWACO', 'WATER', m.id, TRUE
FROM merchants m WHERE m.merchant_code = 'WATER_MERCHANT'
ON CONFLICT (code) DO NOTHING;

INSERT INTO bill_providers (code, name, type, merchant_id, active)
SELECT 'VNPT_HN', 'VNPT Internet Ha Noi', 'INTERNET', m.id, TRUE
FROM merchants m WHERE m.merchant_code = 'ISP_MERCHANT'
ON CONFLICT (code) DO NOTHING;

INSERT INTO bill_providers (code, name, type, merchant_id, active)
SELECT 'FPT_HCM', 'FPT Telecom TP.HCM', 'INTERNET', m.id, TRUE
FROM merchants m WHERE m.merchant_code = 'ISP_MERCHANT'
ON CONFLICT (code) DO NOTHING;

-- Seed sample UNPAID bills.
INSERT INTO bills (provider_id, customer_code, customer_name, address, amount, period, status)
SELECT p.id, 'PE0100112233', 'Nguyen Van A', 'So 123 Giang Vo, Ha Noi', 520000.00, '07/2026', 'UNPAID'
FROM bill_providers p WHERE p.code = 'EVN_HANOI'
  AND NOT EXISTS (SELECT 1 FROM bills b WHERE b.provider_id = p.id AND b.customer_code = 'PE0100112233' AND b.period = '07/2026');

INSERT INTO bills (provider_id, customer_code, customer_name, address, amount, period, status)
SELECT p.id, 'PE0100998877', 'Pham Thi D', 'Cau Giay, Ha Noi', 380000.00, '07/2026', 'UNPAID'
FROM bill_providers p WHERE p.code = 'EVN_HANOI'
  AND NOT EXISTS (SELECT 1 FROM bills b WHERE b.provider_id = p.id AND b.customer_code = 'PE0100998877' AND b.period = '07/2026');

INSERT INTO bills (provider_id, customer_code, customer_name, address, amount, period, status)
SELECT p.id, 'ND0200445566', 'Tran Thi B', 'Quan 1, TP.HCM', 180000.00, '07/2026', 'UNPAID'
FROM bill_providers p WHERE p.code = 'SAWACO'
  AND NOT EXISTS (SELECT 1 FROM bills b WHERE b.provider_id = p.id AND b.customer_code = 'ND0200445566' AND b.period = '07/2026');

INSERT INTO bills (provider_id, customer_code, customer_name, address, amount, period, status)
SELECT p.id, 'INT030077889', 'Le Van C', 'Ba Dinh, Ha Noi', 250000.00, '07/2026', 'UNPAID'
FROM bill_providers p WHERE p.code = 'VNPT_HN'
  AND NOT EXISTS (SELECT 1 FROM bills b WHERE b.provider_id = p.id AND b.customer_code = 'INT030077889' AND b.period = '07/2026');

INSERT INTO bills (provider_id, customer_code, customer_name, address, amount, period, status)
SELECT p.id, 'FPT040011223', 'Vo Thi E', 'Quan 3, TP.HCM', 300000.00, '07/2026', 'UNPAID'
FROM bill_providers p WHERE p.code = 'FPT_HCM'
  AND NOT EXISTS (SELECT 1 FROM bills b WHERE b.provider_id = p.id AND b.customer_code = 'FPT040011223' AND b.period = '07/2026');
