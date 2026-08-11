# GD3 Run Manifest

| Field | Value |
|---|---|
| Run ID | `gd3-final-20260811-224105` |
| Start time | 2026-08-11 22:41:19 +07:00 (2026-08-11 15:41:19 UTC) |
| End time | 2026-08-11 22:41:23 +07:00 (2026-08-11 15:41:23 UTC) |
| Ledger verification | 2026-08-11 22:54:07 +07:00 (2026-08-11 15:54:07 UTC) |
| System | Local isolated PayGate environment |
| Database | `paygate_lt_gd3_20260811_01` |
| Load-test HEAD | `d6fe8efa8b24f8f3ba223ac2e2b1bd56aa5a2398` |
| Executed script SHA-256 | `79C25387B6B76DA4B010E7A14119FFE1423C4BA8696C9CA4B02D30A38DD912B6` |
| Relocated script SHA-256 | `43557375C27A80523564D9C6AB2BED863F2955C6B4C77CDB8F18B3F769BFA47D` |
| Backend branch | `test/paygate-gd3-idempotency-combined` |
| Backend SHA | `970348247a503ca0cb0d30e95fba9fa61c624f13` |
| Backend fix commits | `96d4ecd`, `9703482` |
| k6 | `v2.1.0` (`83a87a41e2`, Windows amd64) |
| Profile | 10 VUs x 1 iteration, 3-second barrier |
| Source / destination | Account 12 / account 10 |
| Amount | VND 10,000 |
| Idempotency key | `GD3-IDEM-gd3-final-20260811-224105` |

## Current equivalent command after relocation

Run from the `GatePay/` application root.

```powershell
& 'C:\Program Files\k6\k6.exe' run `
  --summary-export 'loadtest/gd3/evidence/gd3-final-20260811-224105/gd3-summary.json' `
  loadtest/gd3/gd3-idempotency-test.js `
  2>&1 | Tee-Object 'loadtest/gd3/evidence/gd3-final-20260811-224105/gd3-console.log'
```

The recorded run used the executed script hash above before the phase-folder relocation. The command now points to the equivalent relocated script. Credentials were supplied through process environment variables and are not retained. The token-bearing fields in exported setup data were removed immediately after the run. A JWT-value scan of the final evidence directory returned no matches.

## Outcome

- k6 exit code: 0
- Checks: 20/20 passed
- Responses: 10 x HTTP 201, all `TXN-PAY-EAC5CB9E`
- Payment p95: 346.35 ms
- SQL: one transaction, one debit, one credit
- Balance delta: source -VND 10,000; destination +VND 10,000
- Global ledger endpoint: HTTP 200, `balanced=true`
