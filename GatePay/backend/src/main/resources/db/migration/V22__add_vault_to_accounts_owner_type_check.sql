-- Allow VAULT as a valid owner_type in the accounts table
-- The existing CHECK constraint accounts_owner_type_check only allows
-- USER, MERCHANT, SYSTEM but Vault feature requires VAULT type.
ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_owner_type_check;
ALTER TABLE accounts ADD CONSTRAINT accounts_owner_type_check
    CHECK (owner_type IN ('USER', 'MERCHANT', 'SYSTEM', 'VAULT'));
