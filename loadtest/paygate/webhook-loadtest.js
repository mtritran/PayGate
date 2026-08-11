/**
 * GĐ4 — PayGate: webhook load test (`/bank-webhook`)
 *
 * Kịch bản 1 — Load thường: 30 VU, transferContent random → đo throughput
 *
 * Cách chạy:
 *   & 'C:\Program Files\k6\k6.exe' run loadtest/paygate/webhook-loadtest.js
 */

import http from 'k6/http';
import { check } from 'k6';
import { Counter } from 'k6/metrics';
import crypto from 'k6/crypto';

// ─── CẤU HÌNH ───────────────────────────────────────────────────────
const BASE_URL = 'http://localhost:8081';
const WEBHOOK_SECRET = 'vietqr-secret-default';

// ─── CUSTOM METRICS ──────────────────────────────────────────────────
const webhookAccepted = new Counter('webhook_accepted');
const webhookRejected = new Counter('webhook_rejected');

// ─── K6 OPTIONS ──────────────────────────────────────────────────────
export const options = {
  scenarios: {
    load_normal: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '15s', target: 30 },
        { duration: '30s', target: 30 },
        { duration: '15s', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<1000'],
  },
};

// ─── HELPER ──────────────────────────────────────────────────────────
function randomString(len) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < len; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// ─── MAIN: Load thường — transferContent random ──────────────────────
export default function () {
  const payload = JSON.stringify({
    bankCode: 'VCB',
    bankTransactionNo: `BT-${randomString(12)}`,
    accountNumber: '0123456789',
    amount: 100000,
    transferContent: `RANDOM-${randomString(8)}-${Date.now()}`,
    transactionTime: new Date().toISOString(),
  });

  const signature = crypto.hmac('sha256', WEBHOOK_SECRET, payload, 'base64');

  const res = http.post(`${BASE_URL}/api/v1/integration/bank-webhook`, payload, {
    headers: {
      'Content-Type': 'application/json',
      'X-Bank-Signature': signature,
    },
  });

  const is2xx = res.status >= 200 && res.status < 300;
  check(res, {
    'response received': () => true,
    'status < 500': (r) => r.status < 500,
  });

  if (is2xx) {
    webhookAccepted.add(1);
  } else {
    webhookRejected.add(1);
  }
}

// ─── TEARDOWN ────────────────────────────────────────────────────────
export function teardown() {
  console.log('\n' + '═'.repeat(60));
  console.log('📊 GĐ4 — KẾT QUẢ WEBHOOK LOAD TEST (Kịch bản 1)');
  console.log('═'.repeat(60));
  console.log('→ Xem k6 metrics: http_req_duration, throughput, webhook_accepted/rejected');
  console.log('═'.repeat(60));
}
