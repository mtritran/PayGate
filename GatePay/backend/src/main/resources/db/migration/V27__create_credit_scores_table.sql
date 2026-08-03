-- V27: credit_scores — lưu điểm tín dụng dài hạn của khách (tách riêng khỏi fraud_logs).
-- Fraud = chấm từng giao dịch; Credit = đánh giá lịch sử/person để quyết hạn mức BNPL / vay.

CREATE TABLE credit_scores (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT,
    username    VARCHAR(100),
    score       INTEGER NOT NULL,
    tier        VARCHAR(20) NOT NULL,
    summary     VARCHAR(500),
    created_at  TIMESTAMP,
    updated_at  TIMESTAMP
);

CREATE INDEX idx_credit_scores_user_id ON credit_scores(user_id);
CREATE INDEX idx_credit_scores_username ON credit_scores(username);
CREATE INDEX idx_credit_scores_score ON credit_scores(score);