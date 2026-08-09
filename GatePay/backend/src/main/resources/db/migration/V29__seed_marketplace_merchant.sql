-- Seed MarketPlace merchant used by BNPL checkout integration.
INSERT INTO users (username, email, password, full_name, role, active)
VALUES (
    'marketplace_owner',
    'marketplace@paygate.dev',
    '$2a$10$dXJ3SW6G7P50lGmMkkmwe.20cQQubK3.HZWmXBDdcCNSrTQyTZbaG',
    'MarketPlace Owner',
    'USER',
    TRUE
)
ON CONFLICT (username) DO NOTHING;

INSERT INTO merchants (user_id, merchant_name, merchant_code, api_key, webhook_url, active, status)
SELECT
    u.id,
    'MarketPlace Demo',
    'MARKETPLACE_MP',
    'marketplace-api-key-123456',
    'http://localhost:8082/api/paygate-webhook',
    TRUE,
    'ACTIVE'
FROM users u
WHERE u.username = 'marketplace_owner'
ON CONFLICT (merchant_code) DO UPDATE
    SET merchant_name = EXCLUDED.merchant_name,
        api_key = EXCLUDED.api_key,
        webhook_url = EXCLUDED.webhook_url,
        active = TRUE,
        status = 'ACTIVE',
        updated_at = CURRENT_TIMESTAMP;

INSERT INTO accounts (owner_id, owner_type, account_number, balance, currency, status)
SELECT m.id, 'MERCHANT', 'MER' || LPAD(m.id::text, 15, '0'), 0.00, 'VND', 'ACTIVE'
FROM merchants m
WHERE m.merchant_code = 'MARKETPLACE_MP'
  AND NOT EXISTS (
      SELECT 1
      FROM accounts a
      WHERE a.owner_type = 'MERCHANT'
        AND a.owner_id = m.id
  );
