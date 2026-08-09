CREATE TABLE tpbank_outbox_events (
    id BIGSERIAL PRIMARY KEY,
    event_id VARCHAR(80) NOT NULL UNIQUE,
    event_type VARCHAR(50) NOT NULL,
    provider VARCHAR(50) NOT NULL DEFAULT 'TPBANK',
    customer_id BIGINT NOT NULL,
    payload_json TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    attempts INT NOT NULL DEFAULT 0,
    last_error VARCHAR(1000),
    next_attempt_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    sent_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tpbank_outbox_status_next_attempt
    ON tpbank_outbox_events(status, next_attempt_at);
