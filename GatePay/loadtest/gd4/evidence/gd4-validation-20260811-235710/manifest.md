# GD4 Validation Run Manifest

| Field | Value |
|---|---|
| Run ID | `gd4-validation-20260811-235710` |
| Start time | 2026-08-11 23:57:24 +07:00 (2026-08-11 16:57:24 UTC) |
| End time | 2026-08-11 23:58:24 +07:00 (2026-08-11 16:58:24 UTC) |
| SQL post-check | 2026-08-11 23:59:14 +07:00 (2026-08-11 16:59:14 UTC) |
| System | Local isolated PayGate environment |
| Database | `paygate_lt_gd4_20260811_01` |
| Backend / load-test HEAD | `d6fe8efa8b24f8f3ba223ac2e2b1bd56aa5a2398` |
| Official feature baseline | `4a6cee5`; includes `develop` reconciliation `04cfa1e` |
| Script | `loadtest/gd4/gd4-validation-test.js` |
| Executed script SHA-256 | `C6A9B930AE2E86362C5BD16A0A185AD00EE99D202BA3B0B3F8E6B3267B526460` |
| Relocated script SHA-256 | `7C34A56A46FF58FBFB2EB105CAF490C95E925345A94EF7311D8593D01A6EA4B4` |
| k6 | `v2.1.0` (`83a87a41e2`, Windows amd64) |
| Profile | 30 constant VUs for 60 seconds |
| Authentication | Valid bank HMAC; no JWT |
| Merchant | `MARKETPLACE_MP`, callback disabled |

## Current equivalent command after relocation

Run from the `GatePay/` application root.

```powershell
& 'C:\Program Files\k6\k6.exe' run --no-color `
  --summary-export 'loadtest/gd4/evidence/gd4-validation-20260811-235710/gd4-validation-summary.json' `
  loadtest/gd4/gd4-validation-test.js `
  2>&1 | Tee-Object 'loadtest/gd4/evidence/gd4-validation-20260811-235710/gd4-validation-console.log'
```

The recorded run used the executed script hash above before the phase-folder relocation. The command now points to the equivalent relocated script. The bank HMAC secret was supplied through the process environment and is not retained. A secret-pattern scan of the retained directory returned zero matches. The exit code was not written to a separate file; the retained console and summary show a completed run with all thresholds met and no threshold error.

## Outcome

- Checks: 349,497 / 349,497 passed.
- Requests: 116,499, all HTTP 404; no 2xx, 401, or 5xx.
- p95: 20.7863 ms.
- Throughput: 1,941.267774 requests/s.
- SQL before and after: zero matching checkout sessions, transactions, and ledger entries.
