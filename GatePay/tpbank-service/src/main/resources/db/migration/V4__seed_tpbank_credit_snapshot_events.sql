INSERT INTO tpbank_outbox_events (
    event_id,
    event_type,
    provider,
    customer_id,
    payload_json,
    status
)
SELECT
    'TPB-SNAPSHOT-' || b.customer_id,
    'ACCOUNT_SNAPSHOT_UPDATED',
    'TPBANK',
    b.customer_id,
    json_build_object(
        'eventId', 'TPB-SNAPSHOT-' || b.customer_id,
        'eventType', 'ACCOUNT_SNAPSHOT_UPDATED',
        'provider', 'TPBANK',
        'customerId', b.customer_id,
        'totalTransactions', COALESCE(p.total_transactions, 0),
        'onTimePayments', COALESCE(i.on_time_payments, 0),
        'missedPayments', COALESCE(i.missed_payments, 0),
        'currentBalance', COALESCE(a.current_balance, 0),
        'usedCredit', COALESCE(l.used_credit, 0),
        'maxDaysPastDue', COALESCE(i.max_days_past_due, 0),
        'activeBadDebt', CASE WHEN COALESCE(i.max_days_past_due, 0) >= 90 THEN true ELSE false END,
        'writeOff', CASE WHEN COALESCE(l.has_write_off, false) THEN true ELSE false END,
        'providerFraudReported', false,
        'occurredAt', CURRENT_TIMESTAMP
    )::text,
    'PENDING'
FROM tpbank_borrowers b
LEFT JOIN (
    SELECT borrower_id, SUM(current_balance) AS current_balance
    FROM tpbank_bank_accounts
    WHERE status = 'ACTIVE'
    GROUP BY borrower_id
) a ON a.borrower_id = b.id
LEFT JOIN (
    SELECT borrower_id,
           SUM(CASE WHEN status IN ('ACTIVE', 'OVERDUE', 'RESTRUCTURED') THEN outstanding_principal ELSE 0 END) AS used_credit,
           BOOL_OR(status = 'WRITTEN_OFF') AS has_write_off
    FROM tpbank_loans
    GROUP BY borrower_id
) l ON l.borrower_id = b.id
LEFT JOIN (
    SELECT lo.borrower_id, COUNT(p.id) AS total_transactions
    FROM tpbank_loans lo
    LEFT JOIN tpbank_payments p ON p.loan_id = lo.id AND p.status = 'SUCCESS'
    GROUP BY lo.borrower_id
) p ON p.borrower_id = b.id
LEFT JOIN (
    SELECT lo.borrower_id,
           COUNT(inst.id) FILTER (WHERE inst.status = 'PAID' AND inst.days_past_due = 0) AS on_time_payments,
           COUNT(inst.id) FILTER (
               WHERE inst.status IN ('OVERDUE', 'PARTIALLY_PAID')
                  OR (inst.status = 'PAID' AND inst.days_past_due > 0)
           ) AS missed_payments,
           MAX(inst.days_past_due) AS max_days_past_due
    FROM tpbank_loans lo
    JOIN tpbank_installments inst ON inst.loan_id = lo.id
    GROUP BY lo.borrower_id
) i ON i.borrower_id = b.id
ON CONFLICT (event_id) DO NOTHING;
