# GD4 Scenario 2 - Forged Webhook Security Test

## Goal

Create one valid VIETQR checkout session, then send multiple signed bank webhook requests using the same real `transferContent` but an intentionally incorrect `amount`.

The test measures:

- total forged requests
- rejected requests
- accepted requests
- reject rate
- forged acceptance rate

## Source Contracts Verified From Code

| Item | Value |
|---|---|
| Checkout endpoint | `POST /api/v1/checkout/create` |
| Checkout auth | `X-Merchant-Code` + `X-Signature` HMAC header |
| Checkout response transfer content | `data.transferContent` |
| Bank webhook endpoint | `POST /api/v1/integration/bank-webhook` |
| Bank webhook auth | `X-Bank-Signature` HMAC header |
| Bank webhook DTO | `bankCode`, `bankTransactionNo`, `accountNumber`, `amount`, `transferContent`, `transactionTime` |
| Success condition | HTTP 2xx with response body `success=true` |
| Amount mismatch handling | `AmountMismatchException`, returned as HTTP 400 |

## Evidence

### Manual Swagger Verification

Real checkout created from Swagger:

| Field | Value |
|---|---|
| Token | `CHK_87EF7AC18F2A4354A0465D21C2ED086C` |
| Payment method | `VIETQR` |
| Real transferContent | `PAYGATE GD4-SC2-20260811-001` |
| Real checkout amount | `100000` |

Forged webhook sent from Swagger:

| Field | Value |
|---|---|
| `bankTransactionNo` | `GD4-FORGED-001` |
| `transferContent` | `PAYGATE GD4-SC2-20260811-001` |
| Forged `amount` | `99999` |
| Response code | `400` |
| Response message | `Amount mismatch: expected 100000.00, got 99999.00` |

### k6 Load Test Verification

Command:

```powershell
docker run --rm -i -v "${PWD}:/work" -w /work grafana/k6 run -e BASE_URL=http://host.docker.internal:8081 -e GD4_SCENARIO=forged-only -e FORGED_VUS=2 -e FORGED_DURATION=15s -e FORGED_SLEEP_SECONDS=0.1 loadtest/paygate/webhook-loadtest.js
```

Checkout prepared by k6:

| Field | Value |
|---|---|
| Token | `CHK_48B538A1925C458A9FB6620F1A9DEBCE` |
| Real transferContent | `PAYGATE GD4-SC2-1786431273809-342AMq` |
| Real checkout amount | `100000` |
| Forged webhook amount | `99999` |

Result metrics:

| Metric | Value |
|---|---:|
| Total forged requests | `268` |
| Rejected forged requests | `268` |
| Accepted forged requests | `0` |
| Reject rate | `100.00%` |
| Forged acceptance rate | `0.00%` |
| Network / timeout errors | `0` |
| p95 latency | `9.99 ms` |

## Conclusion

PayGate rejected every forged webhook in this evidence run. Reusing a valid checkout `transferContent` was not enough to mark the checkout as paid when the webhook `amount` differed from the checkout amount.

The measured forged acceptance rate was `0.00%` (`0 / 268`).
