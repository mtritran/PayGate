-- Migration for creating refunds table
CREATE TABLE IF NOT EXISTS refunds (
    id BIGSERIAL PRIMARY KEY,
    refund_ref VARCHAR(64) UNIQUE NOT NULL,
    order_id VARCHAR(64) UNIQUE NOT NULL,
    original_transaction_ref VARCHAR(64) NOT NULL,
    merchant_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    amount NUMERIC(19, 2) NOT NULL,
    reason VARCHAR(255),
    source_type VARCHAR(32) NOT NULL,
    installments_cancelled INT DEFAULT 0,
    status VARCHAR(32) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_refunds_order_id ON refunds(order_id);
CREATE INDEX IF NOT EXISTS idx_refunds_refund_ref ON refunds(refund_ref);
CREATE INDEX IF NOT EXISTS idx_refunds_merchant_id ON refunds(merchant_id);
