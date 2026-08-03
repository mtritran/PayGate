CREATE TABLE IF NOT EXISTS fraud_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT,
    username VARCHAR(100),
    transaction_ref VARCHAR(100),
    risk_score INT NOT NULL,
    risk_level VARCHAR(20) NOT NULL,
    rule_triggered VARCHAR(100) NOT NULL,
    action_taken VARCHAR(50) NOT NULL,
    details TEXT,
    client_ip VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_fraud_logs_user_id ON fraud_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_fraud_logs_risk_level ON fraud_logs(risk_level);
CREATE INDEX IF NOT EXISTS idx_fraud_logs_created_at ON fraud_logs(created_at);
