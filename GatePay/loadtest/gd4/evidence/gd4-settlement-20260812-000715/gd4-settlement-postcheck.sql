SELECT
  COUNT(*) AS session_count,
  COUNT(*) FILTER (WHERE status = 'COMPLETED') AS completed_count,
  COUNT(DISTINCT transaction_ref) AS distinct_transaction_refs,
  SUM(amount) AS total_amount
FROM checkout_sessions
WHERE order_id LIKE 'ORD-GD4-SETTLEMENT-gd4-settlement-20260812-000715-%';

SELECT
  COUNT(*) AS transaction_count,
  COUNT(DISTINCT transaction_ref) AS distinct_transaction_refs,
  SUM(amount) AS total_amount
FROM transactions
WHERE description LIKE
  'VietQR Bank Settlement for Order #ORD-GD4-SETTLEMENT-gd4-settlement-20260812-000715-%';

SELECT
  le.entry_type,
  COUNT(*) AS entry_count,
  SUM(le.amount) AS total_amount
FROM ledger_entries le
JOIN transactions t ON t.id = le.transaction_id
WHERE t.description LIKE
  'VietQR Bank Settlement for Order #ORD-GD4-SETTLEMENT-gd4-settlement-20260812-000715-%'
GROUP BY le.entry_type
ORDER BY le.entry_type;

SELECT id, balance
FROM accounts
WHERE owner_id = 0 AND owner_type = 'SYSTEM';
