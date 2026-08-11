# GD3 - Idempotency POC Report

**Status:** PASS on the patched PayGate backend described below.

## 1. Objective and acceptance criteria

Test `POST /api/v1/transactions/pay` with 10 near-simultaneous requests from one payer. Every request represents the same logical payment and uses the exact same `idempotencyKey`.

The run passes only when all of the following are true:

- Every response is a valid `201`, or a documented semantic duplicate `409`; no `5xx`, `429`, malformed response, or unrelated `4xx` is accepted.
- All successful responses refer to the same transaction.
- PostgreSQL contains exactly one transaction for the tested key.
- That transaction has exactly one debit and one credit ledger entry.
- The payer and destination balances change by the payment amount exactly once.
- `GET /api/v1/admin/ledger/verify` is executed and its response is retained.

## 2. System under test

| Item | Value |
|---|---|
| Run ID | `gd3-final-20260811-224105` |
| Run time | 2026-08-11 22:41:19 +07:00 |
| Load-test branch HEAD | `d6fe8efa8b24f8f3ba223ac2e2b1bd56aa5a2398` |
| Executed script SHA-256 | `79C25387B6B76DA4B010E7A14119FFE1423C4BA8696C9CA4B02D30A38DD912B6` |
| Relocated script SHA-256 | `43557375C27A80523564D9C6AB2BED863F2955C6B4C77CDB8F18B3F769BFA47D` |
| Backend test branch | `test/paygate-gd3-idempotency-combined` |
| Backend target SHA | `970348247a503ca0cb0d30e95fba9fa61c624f13` |
| Backend fixes under test | `96d4ecd` serializable-conflict retry; `9703482` replay lookup before fraud evaluation |
| Database | Disposable local database `paygate_lt_gd3_20260811_01` |
| k6 | `v2.1.0`, Windows amd64 |
| Load profile | 10 VUs, one iteration per VU, 3-second synchronization barrier |
| Payment | Account 12 -> account 10, VND 10,000 |
| Idempotency key | `GD3-IDEM-gd3-final-20260811-224105` |

The backend target is a local validation branch combining two independent fix commits. The result is reproducible only after the corresponding backend fix PRs are merged into the target integration branch. The relocated script changes only its import path and file location; scenario behavior is unchanged.

## 3. Result

| Metric or evidence | Observed result |
|---|---|
| Payment requests | 10 |
| Response distribution | 10 x `201`; 0 x unexpected `4xx`; 0 x `5xx` |
| Unique transaction references in responses | 1: `TXN-PAY-EAC5CB9E` |
| k6 checks | 20/20 passed, 100% |
| `gd3_pay_duration` | avg 292.80 ms; p90 343.34 ms; **p95 346.35 ms**; max 349.36 ms |
| Request send-time spread | 5 ms |
| Payment burst completion window | 354.36 ms |
| Derived payment-burst throughput | approximately **28.22 requests/s** for the 10-request burst |
| PostgreSQL transaction rows for the exact key | 1 |
| Transaction status and amount | `COMPLETED`, VND 10,000 |
| Transaction ledger entries | 1 `DEBIT` and 1 `CREDIT`, VND 10,000 each |
| Payer balance | VND 50,000 -> VND 40,000; delta -10,000 |
| Destination balance | VND 50,000 -> VND 60,000; delta +10,000 |
| Global ledger verification | HTTP 200; `balanced=true`; debit=credit=VND 1,220,000 |
| Decision | **PASS - no duplicate transaction and no double-charge** |

The `gd3_pay_requests` summary rate of 2.168 requests/s includes setup, the synchronization barrier, and teardown. It is not used as endpoint throughput. The reported 28.22 requests/s is derived from the first send timestamp through the final response completion within the payment burst.

## 4. Evidence

- [Run manifest](./evidence/gd3-final-20260811-224105/manifest.md)
- [k6 console output](./evidence/gd3-final-20260811-224105/gd3-console.log)
- [Redacted k6 summary](./evidence/gd3-final-20260811-224105/gd3-summary.json)
- [Preflight result](./evidence/gd3-final-20260811-224105/gd3-preflight.txt)
- [Post-check SQL](./evidence/gd3-final-20260811-224105/gd3-postcheck.sql)
- [Post-check result](./evidence/gd3-final-20260811-224105/gd3-postcheck.txt)
- [Ledger verification response](./evidence/gd3-final-20260811-224105/gd3-ledger-verify.txt)

The summary was scrubbed after the run because k6 `--summary-export` included the `setup_data` object. A secret-pattern scan confirmed that the retained final-run evidence contains no JWT.

## 5. Idempotency lifecycle and architecture analysis

The caller derives one stable key for one logical payment and reuses it for every retry. PayGate does not generate a replacement key for `/transactions/pay`; it receives the caller's key and persists it in `transactions.idempotency_key`.

The patched request path performs the following controls:

1. Check the Redis idempotency cache.
2. Fall back to a database lookup by idempotency key.
3. Only for a genuinely new payment, load the user and perform fraud evaluation.
4. Re-check the database before insertion.
5. Persist under `SERIALIZABLE` isolation with a database unique constraint.
6. Retry transient serialization conflicts through a fresh proxied transaction, then return the existing transaction when the competing request has committed.

Redis improves the replay path, while the database lookup, unique constraint, transaction isolation, and transaction retry provide the durable concurrency controls. HTTP status alone is not proof of idempotency because a replay may also return `201`; the transaction-scoped SQL, ledger rows, and balance deltas are the authoritative evidence.

## 6. Conclusion and release condition

The tested build safely handled 10 near-simultaneous requests for one logical payment: all clients received the same transaction reference, PostgreSQL stored one transaction, and money moved once.

GD3 is functionally complete. Release sign-off remains conditional on merging the two independent backend fixes represented by commits `96d4ecd` and `9703482`, then confirming that the integration branch contains their equivalent changes.
