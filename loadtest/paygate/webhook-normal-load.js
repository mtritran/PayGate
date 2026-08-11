/**
 * GĐ4 — PayGate VietQR Webhook Normal Load Test (k6)
 *
 * Mục tiêu: Đo throughput, p95 latency và độ ổn định của luồng gạch nợ VietQR hợp lệ
 * trên 30 Checkout Session PENDING ĐỘC LẬP (Valid Checkout Session + Exact Matching Amount + Valid Bank HMAC).
 *
 * Chạy script:
 *   & 'C:\Program Files\k6\k6.exe' run -e WEBHOOK_SECRET=vietqr-secret-default -e MERCHANT_CODE=MARKETPLACE_MP -e MERCHANT_API_KEY=marketplace-api-key-123456 loadtest/paygate/webhook-normal-load.js
 */

import http from 'k6/http';
import { check, fail } from 'k6';
import { Counter, Trend } from 'k6/metrics';
import crypto from 'k6/crypto';
import exec from 'k6/execution';

// ─── CẤU HÌNH ENV BẮT BUỘC ─────────────────────────────────────────
const BASE_URL = __ENV.BASE_URL || 'http://localhost:8081';
const WEBHOOK_SECRET = __ENV.WEBHOOK_SECRET;
const MERCHANT_CODE = __ENV.MERCHANT_CODE || 'MARKETPLACE_MP';
const MERCHANT_API_KEY = __ENV.MERCHANT_API_KEY;
const CHECKOUT_AMOUNT = Number(__ENV.CHECKOUT_AMOUNT || 100000);
const TARGET_VUS = Number(__ENV.TARGET_VUS || 30);

if (!WEBHOOK_SECRET || !MERCHANT_API_KEY) {
  fail('❌ MANDATORY ENV MISSING: Please specify -e WEBHOOK_SECRET=<secret> -e MERCHANT_API_KEY=<key>');
}

const webhookSuccessCount = new Counter('webhook_success_count');
const webhookReqDuration = new Trend('webhook_req_duration');

export const options = {
  scenarios: {
    normal_webhook_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '15s', target: TARGET_VUS },
        { duration: '30s', target: TARGET_VUS },
        { duration: '15s', target: 0 },
      ],
    },
  },
  thresholds: {
    webhook_req_duration: ['p(95)<1000'],
    http_req_failed: ['rate<0.01'],
  },
};

function randomString(len) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < len; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function sign(body, secret) {
  return crypto.hmac('sha256', secret, body, 'base64');
}

// ─── SETUP: Tạo 30 PENDING Checkout Session ĐỘC LẬP cho 30 VUs ───────
export function setup() {
  const runId = `RUN-${Date.now()}-${randomString(4)}`;
  const sessions = [];

  console.log(`🚀 Preparing ${TARGET_VUS} independent PENDING Checkout Sessions for Normal Webhook Load Test...`);

  for (let i = 1; i <= TARGET_VUS; i++) {
    const orderId = `ORD-LOAD-${runId}-${i}`;
    const checkoutBody = JSON.stringify({
      orderId,
      amount: CHECKOUT_AMOUNT,
      paymentMethod: 'VIETQR',
      description: `GD4 Normal Webhook Session #${i}`,
      returnUrl: 'http://localhost:3000/return',
      cancelUrl: 'http://localhost:3000/cancel',
    });

    const checkoutRes = http.post(`${BASE_URL}/api/v1/checkout/create`, checkoutBody, {
      headers: {
        'Content-Type': 'application/json',
        'X-Merchant-Code': MERCHANT_CODE,
        'X-Signature': sign(checkoutBody, MERCHANT_API_KEY),
      },
    });

    const setupOk = check(checkoutRes, {
      'setup checkout status is 200/201': (r) => r.status >= 200 && r.status < 300,
    });

    if (!setupOk) {
      fail(`❌ Failed to prepare checkout session #${i}: HTTP ${checkoutRes.status} — ${checkoutRes.body}`);
    }

    const json = checkoutRes.json();
    sessions.push({
      orderId,
      transferContent: json.data.transferContent,
      token: json.data.token,
      amount: CHECKOUT_AMOUNT,
    });
  }

  console.log(`✅ Successfully prepared ${sessions.length} independent Checkout Sessions.`);
  console.log(`   Sample TransferContent: ${sessions[0].transferContent}`);

  return { runId, sessions };
}

// ─── MAIN: Gửi Webhook Gạch nợ Hợp lệ ────────────────────────────────
export default function (data) {
  const vuIndex = (__VU - 1) % data.sessions.length;
  const session = data.sessions[vuIndex];
  const iterId = exec.scenario.iterationInTest;

  const payload = JSON.stringify({
    bankCode: 'MB',
    bankTransactionNo: `BANK-TXN-${Date.now()}-${vuIndex}-${iterId}-${randomString(4)}`,
    accountNumber: '099988887777',
    amount: session.amount,
    transferContent: session.transferContent,
    transactionTime: new Date().toISOString(),
  });

  const startTime = Date.now();
  const res = http.post(`${BASE_URL}/api/v1/integration/bank-webhook`, payload, {
    headers: {
      'Content-Type': 'application/json',
      'X-Bank-Signature': sign(payload, WEBHOOK_SECRET),
    },
  });
  const duration = Date.now() - startTime;
  webhookReqDuration.add(duration);

  // Validation NGHIÊM NGẶT: Chỉ HTTP 2xx + success=true mới được tính là ĐẠT
  const isAccepted = res.status >= 200 && res.status < 300 && Boolean(res.json('success') === true);

  check(res, {
    'webhook HTTP status is 2xx': (r) => r.status >= 200 && r.status < 300,
    'webhook body success is true': (r) => Boolean(r.json('success') === true),
  });

  if (isAccepted) {
    webhookSuccessCount.add(1);
  }
}

// ─── TEARDOWN ────────────────────────────────────────────────────────
export function teardown(data) {
  console.log('\n' + '═'.repeat(65));
  console.log('📊 HOÀN TẤT GD4 NORMAL WEBHOOK LOAD TEST (30 INDEPENDENT SESSIONS)');
  console.log('═'.repeat(65));
  console.log(`   Run ID: ${data.runId}`);
  console.log(`   Total Independent Sessions Tested: ${data.sessions.length}`);
  console.log('═'.repeat(65));
}
