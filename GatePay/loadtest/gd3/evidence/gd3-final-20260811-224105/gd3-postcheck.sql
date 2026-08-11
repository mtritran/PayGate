SELECT COUNT(*) AS transaction_count,
       COUNT(DISTINCT transaction_ref) AS distinct_transaction_refs
FROM transactions
WHERE idempotency_key = 'GD3-IDEM-gd3-final-20260811-224105';

SELECT id, transaction_ref, idempotency_key, amount, status,
       source_account_id, dest_account_id
FROM transactions
WHERE idempotency_key = 'GD3-IDEM-gd3-final-20260811-224105';

SELECT le.entry_type,
       COUNT(*) AS entry_count,
       SUM(le.amount) AS total_amount
FROM ledger_entries le
JOIN transactions t ON t.id = le.transaction_id
WHERE t.idempotency_key = 'GD3-IDEM-gd3-final-20260811-224105'
GROUP BY le.entry_type
ORDER BY le.entry_type;

SELECT id, balance
FROM accounts
WHERE id IN (12, 10)
ORDER BY id;
