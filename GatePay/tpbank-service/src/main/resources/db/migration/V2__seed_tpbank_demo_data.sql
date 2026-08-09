INSERT INTO tpbank_borrowers (customer_id, full_name, citizen_id, date_of_birth, phone_number, employment_type, monthly_income, status)
VALUES
    (1024, 'Nguyen Van Tot', '001102400001', '1995-01-10', '0900001024', 'SALARIED', 18000000.00, 'ACTIVE'),
    (1025, 'Tran Thi Trung Binh', '001102500001', '1992-05-20', '0900001025', 'SELF_EMPLOYED', 12000000.00, 'ACTIVE'),
    (1026, 'Le Van Xau', '001102600001', '1988-09-15', '0900001026', 'FREELANCER', 7000000.00, 'ACTIVE')
ON CONFLICT (customer_id) DO NOTHING;

INSERT INTO tpbank_bank_accounts (borrower_id, account_number, account_type, current_balance, average_monthly_inflow, average_monthly_outflow, status, opened_at)
SELECT b.id, 'TPB1024000001', 'PAYMENT', 7000000.00, 18000000.00, 11000000.00, 'ACTIVE', CURRENT_TIMESTAMP - INTERVAL '24 months'
FROM tpbank_borrowers b WHERE b.customer_id = 1024
ON CONFLICT (account_number) DO NOTHING;

INSERT INTO tpbank_bank_accounts (borrower_id, account_number, account_type, current_balance, average_monthly_inflow, average_monthly_outflow, status, opened_at)
SELECT b.id, 'TPB1025000001', 'PAYMENT', 3000000.00, 12000000.00, 10000000.00, 'ACTIVE', CURRENT_TIMESTAMP - INTERVAL '18 months'
FROM tpbank_borrowers b WHERE b.customer_id = 1025
ON CONFLICT (account_number) DO NOTHING;

INSERT INTO tpbank_bank_accounts (borrower_id, account_number, account_type, current_balance, average_monthly_inflow, average_monthly_outflow, status, opened_at)
SELECT b.id, 'TPB1026000001', 'PAYMENT', 500000.00, 7000000.00, 8500000.00, 'ACTIVE', CURRENT_TIMESTAMP - INTERVAL '10 months'
FROM tpbank_borrowers b WHERE b.customer_id = 1026
ON CONFLICT (account_number) DO NOTHING;

INSERT INTO tpbank_loans (borrower_id, external_loan_id, original_principal, outstanding_principal, interest_rate, term_months, opened_at, maturity_date, status)
SELECT b.id, 'TPB-LOAN-1024-001', 6000000.00, 3000000.00, 12.00, 6, CURRENT_DATE - INTERVAL '5 months', CURRENT_DATE + INTERVAL '1 month', 'ACTIVE'
FROM tpbank_borrowers b WHERE b.customer_id = 1024
ON CONFLICT (external_loan_id) DO NOTHING;

INSERT INTO tpbank_loans (borrower_id, external_loan_id, original_principal, outstanding_principal, interest_rate, term_months, opened_at, maturity_date, status)
SELECT b.id, 'TPB-LOAN-1025-001', 7000000.00, 5000000.00, 14.00, 6, CURRENT_DATE - INTERVAL '4 months', CURRENT_DATE + INTERVAL '2 months', 'ACTIVE'
FROM tpbank_borrowers b WHERE b.customer_id = 1025
ON CONFLICT (external_loan_id) DO NOTHING;

INSERT INTO tpbank_loans (borrower_id, external_loan_id, original_principal, outstanding_principal, interest_rate, term_months, opened_at, maturity_date, status)
SELECT b.id, 'TPB-LOAN-1026-001', 8000000.00, 8000000.00, 18.00, 6, CURRENT_DATE - INTERVAL '7 months', CURRENT_DATE - INTERVAL '1 month', 'OVERDUE'
FROM tpbank_borrowers b WHERE b.customer_id = 1026
ON CONFLICT (external_loan_id) DO NOTHING;

INSERT INTO tpbank_installments (loan_id, installment_number, due_date, principal_due, interest_due, fee_due, total_due, paid_amount, paid_at, days_past_due, status)
SELECT l.id, gs.n, CURRENT_DATE - INTERVAL '5 months' + (gs.n || ' months')::interval,
       1000000.00, 60000.00, 0.00, 1060000.00, 1060000.00,
       CURRENT_TIMESTAMP - INTERVAL '5 months' + (gs.n || ' months')::interval - INTERVAL '1 day',
       0, 'PAID'
FROM tpbank_loans l
CROSS JOIN generate_series(1, 8) AS gs(n)
WHERE l.external_loan_id = 'TPB-LOAN-1024-001'
ON CONFLICT (loan_id, installment_number) DO NOTHING;

INSERT INTO tpbank_installments (loan_id, installment_number, due_date, principal_due, interest_due, fee_due, total_due, paid_amount, paid_at, days_past_due, status)
SELECT l.id, gs.n, CURRENT_DATE - INTERVAL '4 months' + (gs.n || ' months')::interval,
       1000000.00, 80000.00, 0.00, 1080000.00, 1080000.00,
       CASE WHEN gs.n <= 3 THEN CURRENT_TIMESTAMP - INTERVAL '4 months' + (gs.n || ' months')::interval + INTERVAL '2 days' ELSE NULL END,
       CASE WHEN gs.n <= 3 THEN 2 ELSE 0 END,
       CASE WHEN gs.n <= 3 THEN 'PAID' ELSE 'PENDING' END
FROM tpbank_loans l
CROSS JOIN generate_series(1, 5) AS gs(n)
WHERE l.external_loan_id = 'TPB-LOAN-1025-001'
ON CONFLICT (loan_id, installment_number) DO NOTHING;

INSERT INTO tpbank_installments (loan_id, installment_number, due_date, principal_due, interest_due, fee_due, total_due, paid_amount, paid_at, days_past_due, status)
SELECT l.id, gs.n, CURRENT_DATE - INTERVAL '7 months' + (gs.n || ' months')::interval,
       1200000.00, 120000.00, 0.00, 1320000.00,
       CASE WHEN gs.n = 1 THEN 1320000.00 ELSE 0.00 END,
       CASE WHEN gs.n = 1 THEN CURRENT_TIMESTAMP - INTERVAL '7 months' + (gs.n || ' months')::interval + INTERVAL '20 days' ELSE NULL END,
       CASE WHEN gs.n = 1 THEN 20 ELSE GREATEST(0, (CURRENT_DATE - (CURRENT_DATE - INTERVAL '7 months' + (gs.n || ' months')::interval)::date)) END,
       CASE WHEN gs.n = 1 THEN 'PAID' ELSE 'OVERDUE' END
FROM tpbank_loans l
CROSS JOIN generate_series(1, 6) AS gs(n)
WHERE l.external_loan_id = 'TPB-LOAN-1026-001'
ON CONFLICT (loan_id, installment_number) DO NOTHING;

INSERT INTO tpbank_payments (loan_id, installment_id, transaction_reference, amount, paid_at, payment_method, status)
SELECT i.loan_id, i.id, 'TPB-PAY-' || l.external_loan_id || '-' || i.installment_number,
       i.paid_amount, i.paid_at, 'BANK_TRANSFER', 'SUCCESS'
FROM tpbank_installments i
JOIN tpbank_loans l ON l.id = i.loan_id
WHERE i.status = 'PAID'
ON CONFLICT (transaction_reference) DO NOTHING;
