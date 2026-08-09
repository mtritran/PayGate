CREATE TABLE tpbank_borrowers (
    id BIGSERIAL PRIMARY KEY,
    customer_id BIGINT NOT NULL UNIQUE,
    full_name VARCHAR(150) NOT NULL,
    citizen_id VARCHAR(30),
    date_of_birth DATE,
    phone_number VARCHAR(30),
    employment_type VARCHAR(50),
    monthly_income DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tpbank_bank_accounts (
    id BIGSERIAL PRIMARY KEY,
    borrower_id BIGINT NOT NULL REFERENCES tpbank_borrowers(id),
    account_number VARCHAR(30) NOT NULL UNIQUE,
    account_type VARCHAR(30) NOT NULL,
    current_balance DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    average_monthly_inflow DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    average_monthly_outflow DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    opened_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tpbank_loans (
    id BIGSERIAL PRIMARY KEY,
    borrower_id BIGINT NOT NULL REFERENCES tpbank_borrowers(id),
    external_loan_id VARCHAR(50) NOT NULL UNIQUE,
    original_principal DECIMAL(15,2) NOT NULL,
    outstanding_principal DECIMAL(15,2) NOT NULL,
    interest_rate DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    term_months INT NOT NULL,
    opened_at DATE NOT NULL,
    maturity_date DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tpbank_installments (
    id BIGSERIAL PRIMARY KEY,
    loan_id BIGINT NOT NULL REFERENCES tpbank_loans(id),
    installment_number INT NOT NULL,
    due_date DATE NOT NULL,
    principal_due DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    interest_due DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    fee_due DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    total_due DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    paid_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    paid_at TIMESTAMP,
    days_past_due INT NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_tpbank_installment_loan_number UNIQUE (loan_id, installment_number)
);

CREATE TABLE tpbank_payments (
    id BIGSERIAL PRIMARY KEY,
    loan_id BIGINT NOT NULL REFERENCES tpbank_loans(id),
    installment_id BIGINT REFERENCES tpbank_installments(id),
    transaction_reference VARCHAR(80) NOT NULL UNIQUE,
    amount DECIMAL(15,2) NOT NULL,
    paid_at TIMESTAMP NOT NULL,
    payment_method VARCHAR(30) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'SUCCESS',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tpbank_borrowers_customer_id ON tpbank_borrowers(customer_id);
CREATE INDEX idx_tpbank_loans_borrower_status ON tpbank_loans(borrower_id, status);
CREATE INDEX idx_tpbank_installments_loan_status ON tpbank_installments(loan_id, status);
CREATE INDEX idx_tpbank_payments_loan_status ON tpbank_payments(loan_id, status);
