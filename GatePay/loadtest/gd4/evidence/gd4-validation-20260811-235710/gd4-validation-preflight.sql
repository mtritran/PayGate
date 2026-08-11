SELECT merchant_code, active, webhook_url
FROM merchants
WHERE merchant_code = 'MARKETPLACE_MP';

SELECT COUNT(*) AS checkout_sessions
FROM checkout_sessions
WHERE order_id LIKE 'LT-VALIDATION-gd4-validation-20260811-235710-%';

SELECT COUNT(*) AS transactions
FROM transactions
WHERE description LIKE
  'VietQR Bank Settlement for Order #LT-VALIDATION-gd4-validation-20260811-235710-%';

SELECT COUNT(*) AS ledger_entries
FROM ledger_entries
WHERE transaction_id IN (
  SELECT id
  FROM transactions
  WHERE description LIKE
    'VietQR Bank Settlement for Order #LT-VALIDATION-gd4-validation-20260811-235710-%'
);
