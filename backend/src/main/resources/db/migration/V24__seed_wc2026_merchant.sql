-- Seed Admin user if missing (so it is guaranteed to exist before inserting merchants)
INSERT INTO users (username, email, password, full_name, role, active)
VALUES ('admin', 'admin@paygate.dev', '$2a$10$dXJ3SW6G7P50lGmMkkmwe.20cQQubK3.HZWmXBDdcCNSrTQyTZbaG', 'System Administrator', 'ADMIN', TRUE)
ON CONFLICT (username) DO NOTHING;

-- Seed WC2026 Ticket Platform as a merchant on PayGate
-- Uses admin user as the merchant owner
INSERT INTO merchants (user_id, merchant_name, merchant_code, api_key, webhook_url, active, status)
SELECT u.id, 'WC2026 Ticket Platform', 'WC2026_TICKETS', '2b834fbb-f02c-4d84-8dbf-b93e39e1f309',
        'http://localhost:8080/api/v1/payments/paygate-webhook', true, 'ACTIVE'
FROM users u WHERE u.username = 'admin'
ON CONFLICT (api_key) DO UPDATE
    SET webhook_url = EXCLUDED.webhook_url,
        merchant_name = EXCLUDED.merchant_name,
        status = 'ACTIVE';
