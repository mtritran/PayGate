-- Migration for creating merchant_settlements table (30-day escrow auto-settlement)
CREATE TABLE IF NOT EXISTS merchant_settlements (
    id BIGSERIAL PRIMARY KEY,
    settlement_ref VARCHAR(64) UNIQUE NOT NULL,
    original_transaction_ref VARCHAR(64) UNIQUE NOT NULL,
    merchant_id BIGINT NOT NULL,
    amount NUMERIC(19, 2) NOT NULL,
    status VARCHAR(32) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_settlements_settlement_ref ON merchant_settlements(settlement_ref);
CREATE INDEX IF NOT EXISTS idx_settlements_orig_tx_ref ON merchant_settlements(original_transaction_ref);
CREATE INDEX IF NOT EXISTS idx_settlements_merchant_id ON merchant_settlements(merchant_id);
