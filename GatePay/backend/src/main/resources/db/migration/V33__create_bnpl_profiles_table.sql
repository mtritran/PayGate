CREATE TABLE bnpl_profiles (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE,
    occupation VARCHAR(120),
    company_name VARCHAR(160),
    monthly_income NUMERIC(15, 2),
    relative1_name VARCHAR(120),
    relative1_phone VARCHAR(30),
    relative1_relationship VARCHAR(60),
    relative2_name VARCHAR(120),
    relative2_phone VARCHAR(30),
    relative2_relationship VARCHAR(60),
    credit_score INTEGER,
    risk_grade VARCHAR(20),
    approved_limit NUMERIC(15, 2),
    assessment_reason VARCHAR(80),
    created_at TIMESTAMP WITHOUT TIME ZONE,
    updated_at TIMESTAMP WITHOUT TIME ZONE
);
