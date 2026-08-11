ALTER TABLE cic_credit_assessments
    ADD COLUMN suggested_upfront_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00;
