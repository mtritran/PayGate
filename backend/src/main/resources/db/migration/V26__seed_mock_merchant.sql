-- Seed a mock merchant user
INSERT INTO users (username, email, password, full_name, role, active)
VALUES ('mock_merchant_owner', 'mock_merchant@paygate.dev', '$2a$10$dXJ3SW6G7P50lGmMkkmwe.20cQQubK3.HZWmXBDdcCNSrTQyTZbaG', 'Mock Merchant Owner', 'USER', TRUE)
ON CONFLICT (username) DO NOTHING;

-- Seed the merchant
INSERT INTO merchants (user_id, merchant_name, merchant_code, api_key, webhook_url, active, status)
SELECT u.id, 'Mock Merchant Shop', 'MOCK_MERCHANT', 'mock-merchant-api-key-123456', 'http://localhost:8082/api/paygate-webhook', TRUE, 'ACTIVE'
FROM users u WHERE u.username = 'mock_merchant_owner'
ON CONFLICT (merchant_code) DO NOTHING;

-- Seed merchant wallet account
INSERT INTO accounts (owner_id, owner_type, account_number, balance, currency, status)
SELECT m.id, 'MERCHANT', 'MER' || LPAD(m.id::text, 15, '0'), 0.00, 'VND', 'ACTIVE'
FROM merchants m WHERE m.merchant_code = 'MOCK_MERCHANT'
  AND NOT EXISTS (
    SELECT 1 FROM accounts a WHERE a.owner_type = 'MERCHANT' AND a.owner_id = m.id
  );
