-- Synchronize PostgreSQL sequence generators with maximum existing IDs to avoid duplicate key violations
SELECT setval('users_id_seq', (SELECT COALESCE(MAX(id), 1) FROM users));
SELECT setval('merchants_id_seq', (SELECT COALESCE(MAX(id), 1) FROM merchants));
SELECT setval('accounts_id_seq', (SELECT COALESCE(MAX(id), 1) FROM accounts));
SELECT setval('vaults_id_seq', (SELECT COALESCE(MAX(id), 1) FROM vaults));
