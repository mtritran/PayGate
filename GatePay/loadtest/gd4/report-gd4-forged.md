# GD4 - Forged Amount Security Report

> **Lưu ý:** Đây là evidence lịch sử của run `gd4-forged-20260812-001305`. Báo cáo GĐ4 mới nhất trên `develop/cab84ca`, gồm re-test 50 và 100 VUs, nằm tại [`report-gd4.md`](./report-gd4.md).

**Status:** PASS on the isolated PayGate environment described below.

## 1. Objective and acceptance criteria

Verify that PayGate rejects a bank webhook which has a valid HMAC and a real checkout transfer content but an amount different from the checkout amount.

The scenario passes only when:

- Every forged request returns exactly HTTP `400` with `Amount mismatch`.
- No forged request returns `2xx`, `401`, `5xx`, or another response.
- The checkout remains `PENDING` with no transaction reference.
- No settlement transaction or ledger entry is created.
- The SYSTEM account balance does not change.

This scenario uses a valid bank HMAC. It validates the business amount-integrity guard after authentication; it does not model an unauthenticated attacker who lacks the bank secret.

## 2. System under test

| Item | Value |
|---|---|
| Run ID | `gd4-forged-20260812-001305` |
| Backend / load-test SHA | `d6fe8efa8b24f8f3ba223ac2e2b1bd56aa5a2398` |
| Official feature baseline | `4a6cee5` with `develop` reconciliation `04cfa1e` |
| Script | [`gd4-forged-amount-test.js`](./gd4-forged-amount-test.js) |
| Executed script SHA-256 | `70D73A4ECD381FA911935127558DED05AE150181F175BABB7B682FF15B0306C8` |
| Relocated script SHA-256 | `1BFE9D517B44E0D31028FBA9BAAB4D7E1637DAF0B16E5700997B5CF92F87C6D0` |
| Database | Disposable local database `paygate_lt_gd4_20260811_01` |
| k6 | `v2.1.0`, Windows amd64 |
| Profile | 10 constant VUs for 15 seconds |
| Checkout amount | VND 100,000 |
| Forged amount | VND 50,000 |
| Merchant callback | Disabled (`webhook_url = NULL`) |

The relocated script changes only shared-helper import paths and its file name; scenario behavior is unchanged.

## 3. Result

| Evidence | Observed result |
|---|---|
| Forged webhook requests | 24,317 |
| Exact `400 Amount mismatch` | 24,317 / 24,317, **100%** |
| Unexpected `2xx` accepted | 0, **0%** |
| HMAC authentication failures (`401`) | 0 |
| Server errors (`5xx`) | 0 |
| Other responses | 0 |
| k6 checks | 97,268 / 97,268 passed, 100% |
| `gd4_forged_duration` | avg 4.74 ms; p90 5.79 ms; **p95 6.26 ms**; max 22.57 ms |
| Forged-request throughput | **1,617.66 requests/s** |
| Checkout post-condition | 1 session; `PENDING`; amount VND 100,000; no transaction reference |
| Settlement transaction / ledger | 0 / 0 |
| SYSTEM balance | VND 99,000,300,000 before and after |
| Decision | **PASS - all signed wrong-amount requests were rejected without mutation** |

The k6 total of 24,318 HTTP requests includes one setup request to create the real checkout fixture. The forged-request rate therefore comes from `gd4_forged_exact_mismatch_rejected`, not the global `http_reqs` metric.

## 4. Evidence

- [Run manifest](./evidence/gd4-forged-20260812-001305/manifest.md)
- [k6 console output](./evidence/gd4-forged-20260812-001305/gd4-forged-console.log)
- [k6 summary](./evidence/gd4-forged-20260812-001305/gd4-forged-summary.json)
- [Preflight SQL](./evidence/gd4-forged-20260812-001305/gd4-forged-preflight.sql)
- [Preflight result](./evidence/gd4-forged-20260812-001305/gd4-forged-preflight.txt)
- [Post-check SQL](./evidence/gd4-forged-20260812-001305/gd4-forged-postcheck.sql)
- [Post-check result](./evidence/gd4-forged-20260812-001305/gd4-forged-postcheck.txt)
- [Captured exit code](./evidence/gd4-forged-20260812-001305/gd4-forged-exit-code.txt)

## 5. Security conclusion

The amount guard is effective for the tested pending-checkout path. PayGate authenticated the webhook, found the real checkout, detected the VND 50,000 mismatch against the expected VND 100,000, and rejected every request before any settlement write.

HTTP rejection alone is not the proof of safety. The retained SQL result confirms that the fixture stayed pending, no transaction or ledger entry appeared, and the SYSTEM balance remained unchanged.
