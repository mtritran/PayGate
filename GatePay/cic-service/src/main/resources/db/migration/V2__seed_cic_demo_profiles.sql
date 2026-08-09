INSERT INTO cic_credit_profiles (
    customer_id,
    total_transactions,
    on_time_payments,
    missed_payments,
    current_balance,
    used_credit,
    max_days_past_due,
    active_bad_debt,
    write_off,
    provider_fraud_reported
)
VALUES
    (1024, 8, 8, 0, 7000000.00, 3000000.00, 0, FALSE, FALSE, FALSE),
    (1025, 3, 0, 3, 3000000.00, 5000000.00, 2, FALSE, FALSE, FALSE),
    (1026, 1, 0, 6, 500000.00, 8000000.00, 120, TRUE, FALSE, FALSE)
ON CONFLICT (customer_id) DO NOTHING;
