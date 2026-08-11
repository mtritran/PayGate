SELECT merchant_code, active, webhook_url
FROM merchants
WHERE merchant_code = 'MARKETPLACE_MP';

SELECT id, balance
FROM accounts
WHERE owner_id = 0 AND owner_type = 'SYSTEM';

SELECT COUNT(*) AS checkout_sessions
FROM checkout_sessions
WHERE order_id LIKE 'ORD-GD4-SETTLEMENT-gd4-settlement-20260812-000715-%';

SELECT COUNT(*) AS transactions
FROM transactions
WHERE description LIKE
  'VietQR Bank Settlement for Order #ORD-GD4-SETTLEMENT-gd4-settlement-20260812-000715-%';

SELECT COUNT(*) AS ledger_entries
FROM ledger_entries
WHERE transaction_id IN (
  SELECT id
  FROM transactions
  WHERE description LIKE
    'VietQR Bank Settlement for Order #ORD-GD4-SETTLEMENT-gd4-settlement-20260812-000715-%'
);
