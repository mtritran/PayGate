-- GD3 final run: gd3-final-20260811-224105
SELECT COUNT(*) AS existing_transactions
FROM transactions
WHERE idempotency_key = 'GD3-IDEM-gd3-final-20260811-224105';

SELECT id, balance
FROM accounts
WHERE id IN (12, 10)
ORDER BY id;
