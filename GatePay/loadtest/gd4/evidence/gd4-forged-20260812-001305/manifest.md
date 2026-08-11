# GD4 Forged-Amount Run Manifest

| Field | Value |
|---|---|
| Run ID | `gd4-forged-20260812-001305` |
| Start time | 2026-08-12 00:13:31 +07:00 (2026-08-11 17:13:31 UTC) |
| End time | 2026-08-12 00:13:46 +07:00 (2026-08-11 17:13:46 UTC) |
| SQL post-check | 2026-08-12 00:15:20 +07:00 (2026-08-11 17:15:20 UTC) |
| System | Local isolated PayGate environment |
| Database | `paygate_lt_gd4_20260811_01` |
| Backend / load-test HEAD | `d6fe8efa8b24f8f3ba223ac2e2b1bd56aa5a2398` |
| Official feature baseline | `4a6cee5`; includes `develop` reconciliation `04cfa1e` |
| Script | `loadtest/gd4/gd4-forged-amount-test.js` |
| Executed script SHA-256 | `70D73A4ECD381FA911935127558DED05AE150181F175BABB7B682FF15B0306C8` |
| Relocated script SHA-256 | `1BFE9D517B44E0D31028FBA9BAAB4D7E1637DAF0B16E5700997B5CF92F87C6D0` |
| k6 | `v2.1.0` (`83a87a41e2`, Windows amd64) |
| Profile | 10 constant VUs for 15 seconds |
| Checkout / forged amount | VND 100,000 / VND 50,000 |
| Authentication | Valid bank HMAC; real checkout transfer content |
| Merchant | `MARKETPLACE_MP`, callback disabled |

## Current equivalent command after relocation

Run from the `GatePay/` application root.

```powershell
& 'C:\Program Files\k6\k6.exe' run --no-color `
  --summary-export 'loadtest/gd4/evidence/gd4-forged-20260812-001305/gd4-forged-summary.json' `
  loadtest/gd4/gd4-forged-amount-test.js `
  2>&1 | Tee-Object 'loadtest/gd4/evidence/gd4-forged-20260812-001305/gd4-forged-console.log'
```

The recorded run used the executed script hash above before the phase-folder relocation. The command now points to the equivalent relocated script. The bank HMAC secret and merchant API key were supplied through process environment variables and are not retained. A secret-pattern scan of the retained directory returned zero matches; exported setup data contains only the test fixture identifier, transfer content, and amount.

## Outcome

- k6 exit code: 0.
- Checks: 97,268 / 97,268 passed.
- Exact mismatch rejection: 24,317 / 24,317, 100%.
- Unexpected accepted, authentication failure, server error, and other-response counts: 0.
- p95: 6.25722 ms; throughput 1,617.658517 forged requests/s.
- SQL: one pending checkout with no transaction reference, zero settlement transactions, and zero ledger entries.
- SYSTEM balance unchanged at VND 99,003,000,000.
