SELECT
  COUNT(*) AS session_count,
  COUNT(*) FILTER (WHERE status = 'PENDING') AS pending_count,
  COUNT(transaction_ref) AS sessions_with_transaction,
  MIN(amount) AS expected_amount
FROM checkout_sessions
WHERE order_id = 'ORD-GD4-FORGED-gd4-forged-20260812-001305';

SELECT COUNT(*) AS transaction_count
FROM transactions
WHERE description = 'VietQR Bank Settlement for Order #ORD-GD4-FORGED-gd4-forged-20260812-001305';

SELECT COUNT(*) AS ledger_entries
FROM ledger_entries le
JOIN transactions t ON t.id = le.transaction_id
WHERE t.description = 'VietQR Bank Settlement for Order #ORD-GD4-FORGED-gd4-forged-20260812-001305';

SELECT id, balance
FROM accounts
WHERE owner_id = 0 AND owner_type = 'SYSTEM';
