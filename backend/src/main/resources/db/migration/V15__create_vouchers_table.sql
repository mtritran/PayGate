CREATE TABLE vouchers (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    title VARCHAR(150) NOT NULL,
    discount_amount DECIMAL(15,2) NOT NULL,
    points_required INT NOT NULL,
    min_order_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    applicable_type VARCHAR(30) NOT NULL DEFAULT 'ALL',
    total_quantity INT NOT NULL,
    remaining_qty INT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vouchers_code ON vouchers(code);
CREATE INDEX idx_vouchers_expires ON vouchers(expires_at) WHERE remaining_qty > 0;
