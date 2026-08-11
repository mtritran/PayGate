SELECT merchant_code, active, webhook_url
FROM merchants
WHERE merchant_code = 'MARKETPLACE_MP';

SELECT id, balance
FROM accounts
WHERE owner_id = 0 AND owner_type = 'SYSTEM';

SELECT COUNT(*) AS checkout_sessions
FROM checkout_sessions
WHERE order_id = 'ORD-GD4-FORGED-gd4-forged-20260812-001305';

SELECT COUNT(*) AS transactions
FROM transactions
WHERE description = 'VietQR Bank Settlement for Order #ORD-GD4-FORGED-gd4-forged-20260812-001305';

SELECT COUNT(*) AS ledger_entries
FROM ledger_entries le
JOIN transactions t ON t.id = le.transaction_id
WHERE t.description = 'VietQR Bank Settlement for Order #ORD-GD4-FORGED-gd4-forged-20260812-001305';
