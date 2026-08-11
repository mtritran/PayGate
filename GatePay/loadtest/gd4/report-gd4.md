# GD4 - Webhook Load and Security Report

**Status:** PASS on the isolated PayGate environment described below.

## 1. Scope

GD4 contains three complementary measurements:

1. HMAC-authenticated random transfer content, measuring the lookup-and-reject path.
2. A synchronized burst of 30 independent valid settlements, measuring the real write path.
3. Signed wrong-amount spam against one real pending checkout, measuring the amount-integrity guard.

The bank webhook does not require JWT, but it is authenticated by `X-Bank-Signature` using HMAC-SHA256. It must not be described as an unauthenticated endpoint.

## 2. System under test

| Item | Value |
|---|---|
| Backend / load-test SHA | `d6fe8efa8b24f8f3ba223ac2e2b1bd56aa5a2398` |
| Official feature baseline | `4a6cee5` with `develop` reconciliation `04cfa1e` |
| Database | Disposable local database `paygate_lt_gd4_20260811_01` |
| PostgreSQL | Docker `lt-postgres`, PostgreSQL 16, host port 5434 |
| RabbitMQ | Docker `lt-rabbit`, host port 5673 |
| Redis | Local port 6379 |
| PayGate | `http://localhost:8081` |
| k6 | `v2.1.0` (`83a87a41e2`, Windows amd64) |
| Merchant | `MARKETPLACE_MP`, active |
| Merchant callback | Disabled in the disposable database (`webhook_url = NULL`) |
| Secret handling | Bank HMAC secret and merchant API key supplied through process ENV only |

All three scripts required these explicit isolation gates:

```text
GD4_TEST_ENV=isolated
GD4_ALLOW_MUTATION=true
GD4_CALLBACK_SAFE=true
```

## 3. Scenario contracts

### A. Random non-matching transfer content

| Item | Configuration |
|---|---|
| Run ID | `gd4-validation-20260811-235710` |
| Script | [`gd4-validation-test.js`](./gd4-validation-test.js) |
| Executed / relocated script SHA-256 | `C6A9B930AE2E86362C5BD16A0A185AD00EE99D202BA3B0B3F8E6B3267B526460` / `7C34A56A46FF58FBFB2EB105CAF490C95E925345A94EF7311D8593D01A6EA4B4` |
| Profile | 30 constant VUs for 60 seconds |
| Input | Unique signed transfer content and bank transaction number per request |
| Expected response | HTTP `404` because no checkout matches the generated order ID |
| Database post-condition | No checkout session, transaction, or ledger entry |

The current backend rejects unknown order IDs with `ResourceNotFoundException`. The earlier report claim that a regex rejects them with `400` is obsolete.

### B. Thirty unique valid settlements

| Item | Configuration |
|---|---|
| Run ID | `gd4-settlement-20260812-000715` |
| Script | [`gd4-settlement-test.js`](./gd4-settlement-test.js) |
| Executed / relocated script SHA-256 | `B9523DC32002618F604B404D3CBE6001D9377EBFDC46EA32F2A2652080001AA6` / `DD4BDFFCA84FB4381E2083D6B723934EA6245A83A0CE3BD8BDAED8D18CF231F8` |
| Profile | 30 VUs x one iteration, synchronized barrier |
| Fixtures | 30 unique `PENDING` VIETQR checkouts created in `setup()` |
| Input | One valid-HMAC, exact-amount webhook per unique fixture |
| Expected response | HTTP `200` and `success=true` |
| Database post-condition | 30 completed sessions, 30 transactions, 30 settlement ledger entries |

This is a burst of 30 independent settlements. It does not reuse completed fixtures and therefore does not confuse replay throughput with settlement throughput.

### C. Signed forged amount

| Item | Configuration |
|---|---|
| Run ID | `gd4-forged-20260812-001305` |
| Script | [`gd4-forged-amount-test.js`](./gd4-forged-amount-test.js) |
| Profile | 10 constant VUs for 15 seconds |
| Fixture | One real `PENDING` checkout for VND 100,000 |
| Input | Valid HMAC and transfer content, but amount VND 50,000 |
| Expected response | Exact HTTP `400 Amount mismatch` |
| Database post-condition | Fixture remains pending; no transaction, ledger entry, or balance mutation |

Detailed security analysis is retained in [`report-gd4-forged.md`](./report-gd4-forged.md).

The relocated hashes differ only because imports and file names were updated to the phase-folder architecture. Scenario logic and retained run data are unchanged.

## 4. Results

| Scenario | Requests | p95 | Throughput | Status split | SQL post-condition | Decision |
|---|---:|---:|---:|---|---|---|
| A: random/non-matching, 30 VUs / 60s | 116,499 | **20.79 ms** | **1,941.27 req/s** | 116,499 x 404; 0 x 2xx/401/5xx | 0 sessions, 0 transactions, 0 ledger entries | **PASS** |
| B: 30-way unique settlement | 30 settlements | **440.58 ms** | **63.66 settlements/s** burst | 30 x 200; 0 x 4xx/5xx | 30 completed sessions, 30 transactions, 30 CREDIT entries | **PASS** |
| C: signed forged amount, 10 VUs / 15s | 24,317 forged requests | **6.26 ms** | **1,617.66 req/s** | 24,317 exact 400; 0 x 2xx/401/5xx | 1 pending session, 0 transactions, 0 ledger entries | **PASS** |

### Scenario A details

- Checks: 349,497 / 349,497 passed.
- `gd4_validation_duration`: avg 15.15 ms; p90 18.82 ms; p95 20.79 ms; max 92.92 ms.
- Every request had a valid HMAC and returned the expected 404.
- SQL before and after confirmed no persistent row for the generated prefix.

### Scenario B details

- Checks: 90 / 90 passed.
- `gd4_settlement_duration`: avg 278.26 ms; p90 424.71 ms; p95 440.58 ms; max 456.27 ms.
- All 30 requests were sent within 15 ms.
- The completion window from the earliest send through the final response was 471.27 ms.
- Derived burst throughput: `30 / 0.47127 = 63.66 settlements/s`.
- The global `http_reqs` count is 60 because setup created 30 fixtures before the 30 webhooks. Its whole-run rate is not settlement throughput.
- SYSTEM balance increased from VND 99,000,000,000 to VND 99,003,000,000, exactly 30 x VND 100,000.
- Each bank inflow currently creates one SYSTEM `CREDIT`; the matching `DEBIT` is deferred to merchant settlement, so global ledger balance is not an acceptance condition for this scenario.

### Scenario C details

- Checks: 97,268 / 97,268 passed.
- Exact amount-mismatch reject rate: 24,317 / 24,317, 100%.
- Unexpected accepted rate: 0%.
- SYSTEM balance stayed at VND 99,003,000,000.

## 5. Evidence

### Scenario A

- [Manifest](./evidence/gd4-validation-20260811-235710/manifest.md)
- [k6 summary](./evidence/gd4-validation-20260811-235710/gd4-validation-summary.json)
- [k6 console](./evidence/gd4-validation-20260811-235710/gd4-validation-console.log)
- [Preflight result](./evidence/gd4-validation-20260811-235710/gd4-validation-preflight.txt)
- [Post-check result](./evidence/gd4-validation-20260811-235710/gd4-validation-postcheck.txt)

### Scenario B

- [Manifest](./evidence/gd4-settlement-20260812-000715/manifest.md)
- [k6 summary](./evidence/gd4-settlement-20260812-000715/gd4-settlement-summary.json)
- [k6 console](./evidence/gd4-settlement-20260812-000715/gd4-settlement-console.log)
- [Preflight result](./evidence/gd4-settlement-20260812-000715/gd4-settlement-preflight.txt)
- [Post-check result](./evidence/gd4-settlement-20260812-000715/gd4-settlement-postcheck.txt)
- [Captured exit code](./evidence/gd4-settlement-20260812-000715/gd4-settlement-exit-code.txt)

### Scenario C

- [Detailed report](./report-gd4-forged.md)
- [Manifest](./evidence/gd4-forged-20260812-001305/manifest.md)
- [k6 summary](./evidence/gd4-forged-20260812-001305/gd4-forged-summary.json)
- [k6 console](./evidence/gd4-forged-20260812-001305/gd4-forged-console.log)
- [Post-check result](./evidence/gd4-forged-20260812-001305/gd4-forged-postcheck.txt)
- [Captured exit code](./evidence/gd4-forged-20260812-001305/gd4-forged-exit-code.txt)

## 6. Authentication and database-overhead analysis

All three GD4 scenarios traverse the same bank HMAC filter, so their differences are downstream of a common authentication mechanism. The observed end-to-end p95 values were:

| Path | p95 |
|---|---:|
| HMAC + unknown-order lookup + 404 | 20.79 ms |
| HMAC + pending-session lookup + amount rejection | 6.26 ms |
| HMAC + pending-session lookup + account lock + transaction/ledger/session writes | 440.58 ms |

The valid settlement path was 419.79 ms slower at p95 than the unknown-order validation path. This difference demonstrates the cost of the full business and write path under a 30-way burst; it must not be labeled as pure database-query overhead.

The HMAC filter itself was not isolated by this test. Likewise, subtracting GD4 latency from the JWT-protected `/transactions/pay` latency does not produce JWT-filter overhead because the endpoints, traffic profiles, and business work differ. A numeric JWT-versus-HMAC comparison requires matched routes or timing instrumentation around each filter.

## 7. Optimization conclusion

If one PayGate path must be optimized based on the retained GD3/GD4 measurements, choose the valid bank-settlement write path. Its p95 of 440.58 ms is the highest measured endpoint latency, and response completion spreads across the burst while each request locks and updates the shared SYSTEM account, inserts a transaction and ledger row, and completes a checkout session.

The first investigation targets should be the shared SYSTEM-account lock and the transaction/ledger/session write sequence. Authentication is not the first optimization target because the common HMAC-authenticated rejection paths remained at 20.79 ms p95 or below.

## 8. Limitations

- Results are from one local machine and one disposable database, not a production-capacity benchmark.
- Merchant callbacks were disabled so the settlement metric measures PayGate internal processing rather than downstream HTTP retry time.
- Scenario A measures an authenticated lookup-and-reject path, not a successful settlement.
- Scenario B is a 30-request synchronized burst, not a sustained 60-second stream of unique settlements.
- Scenario C proves the amount guard for a validly signed pending-checkout request; it does not represent an outsider without the bank secret.
- GD1 and GD2 belong to the Marketplace load-test team and are not included in this report.
