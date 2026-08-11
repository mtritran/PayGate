# GD4 Settlement Run Manifest

| Field | Value |
|---|---|
| Run ID | `gd4-settlement-20260812-000715` |
| Start time | 2026-08-12 00:07:53 +07:00 (2026-08-11 17:07:53 UTC) |
| End time | 2026-08-12 00:07:57 +07:00 (2026-08-11 17:07:57 UTC) |
| SQL post-check | 2026-08-12 00:09:47 +07:00 (2026-08-11 17:09:47 UTC) |
| System | Local isolated PayGate environment |
| Database | `paygate_lt_gd4_20260811_01` |
| Backend / load-test HEAD | `d6fe8efa8b24f8f3ba223ac2e2b1bd56aa5a2398` |
| Official feature baseline | `4a6cee5`; includes `develop` reconciliation `04cfa1e` |
| Script | `loadtest/gd4/gd4-settlement-test.js` |
| Executed script SHA-256 | `B9523DC32002618F604B404D3CBE6001D9377EBFDC46EA32F2A2652080001AA6` |
| Relocated script SHA-256 | `DD4BDFFCA84FB4381E2083D6B723934EA6245A83A0CE3BD8BDAED8D18CF231F8` |
| k6 | `v2.1.0` (`83a87a41e2`, Windows amd64) |
| Profile | 30 VUs x one iteration, 3-second synchronization barrier |
| Fixture | 30 unique pending VIETQR checkout sessions |
| Amount | VND 100,000 per settlement |
| Merchant | `MARKETPLACE_MP`, callback disabled |

## Current equivalent command after relocation

Run from the `GatePay/` application root.

```powershell
& 'C:\Program Files\k6\k6.exe' run --no-color `
  --summary-export 'loadtest/gd4/evidence/gd4-settlement-20260812-000715/gd4-settlement-summary.json' `
  loadtest/gd4/gd4-settlement-test.js `
  2>&1 | Tee-Object 'loadtest/gd4/evidence/gd4-settlement-20260812-000715/gd4-settlement-console.log'
```

The recorded run used the executed script hash above before the phase-folder relocation. The command now points to the equivalent relocated script. The bank HMAC secret and merchant API key were supplied through process environment variables and are not retained. A secret-pattern scan of the retained directory returned zero matches; exported setup data contains only fixture identifiers, transfer content, amounts, and the barrier timestamp.

## Outcome

- k6 exit code: 0.
- Checks: 90 / 90 passed.
- Responses: 30 / 30 HTTP 200 with `success=true`.
- Settlement p95: 440.576515 ms.
- Request send spread: 15 ms.
- Completion window: 471.267 ms; derived burst throughput 63.6582 settlements/s.
- SQL: 30 completed sessions, 30 distinct transactions, and 30 CREDIT ledger entries totaling VND 3,000,000.
- SYSTEM balance: VND 99,000,000,000 to VND 99,003,000,000.
