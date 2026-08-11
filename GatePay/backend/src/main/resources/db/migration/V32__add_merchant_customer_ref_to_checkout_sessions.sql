ALTER TABLE checkout_sessions
    ADD COLUMN IF NOT EXISTS merchant_customer_ref VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_checkout_sessions_merchant_customer_ref
    ON checkout_sessions(merchant_id, merchant_customer_ref)
    WHERE merchant_customer_ref IS NOT NULL;
