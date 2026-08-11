/**
 * GĐ4 — PayGate Forged Webhook Security Test (k6)
 *
 * Mục tiêu: Kiểm thử tính toàn vẹn và cơ chế chống Giả mạo Số tiền (Amount Mismatch Security Guard).
 * Kịch bản: Kẻ gian có được `transferContent` hợp lệ của đơn hàng 100,000 VND và HMAC Signature hợp lệ,
 * nhưng cố tình điều chỉnh `amount` xuống 99,999 VND.
 *
 * Tiêu chí đánh giá ĐẠT (PASS):
 *   1. 100% Request PHẢI BỊ TỪ CHỐI với HTTP 400 Bad Request.
 *   2. Response Body PHẢI chứa thông điệp lỗi "Amount mismatch: expected 100000.00, got 99999.00".
 *   3. Không chấp nhận HTTP 401 (Lỗi Auth) hay HTTP 500 (Lỗi server).
 *
 * Chạy script:
 *   & 'C:\Program Files\k6\k6.exe' run loadtest/paygate/webhook-forged-test.js
 */

import http from 'k6/http';
import { check, fail } from 'k6';
import { Counter, Trend, Rate } from 'k6/metrics';
import crypto from 'k6/crypto';
import exec from 'k6/execution';

// ─── CẤU HÌNH ENV ──────────────────────────────────────────────────
const BASE_URL = __ENV.BASE_URL || 'http://localhost:8081';
const WEBHOOK_SECRET = __ENV.WEBHOOK_SECRET || 'vietqr-secret-default';
const MERCHANT_CODE = __ENV.MERCHANT_CODE || 'MARKETPLACE_MP';
const MERCHANT_API_KEY = __ENV.MERCHANT_API_KEY || 'marketplace-api-key-123456';
const CHECKOUT_AMOUNT = Number(__ENV.CHECKOUT_AMOUNT || 100000);
const FORGED_AMOUNT = Number(__ENV.FORGED_AMOUNT || 99999);

const forgedRejectedCount = new Counter('forged_rejected_count');
const forgedAcceptedCount = new Counter('forged_accepted_count');
const forgedReqDuration = new Trend('forged_req_duration');
const forgedRejectRate = new Rate('forged_reject_rate');

export const options = {
  scenarios: {
    forged_amount_mismatch_blast: {
      executor: 'constant-vus',
      vus: 10,
      duration: '15s',
    },
  },
  thresholds: {
    forged_reject_rate: ['rate==1.0'], // 100% forged requests MUST be rejected with Amount Mismatch
    forged_req_duration: ['p(95)<1000'],
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

// ─── SETUP: Tạo PENDING Checkout Session chuẩn cho đơn hàng 100k ──────
export function setup() {
  const orderId = `ORD-FORGED-${Date.now()}-${randomString(4)}`;
  const checkoutBody = JSON.stringify({
    orderId,
    amount: CHECKOUT_AMOUNT,
    paymentMethod: 'VIETQR',
    description: 'GD4 Forged Webhook Security Test Session',
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
    'setup checkout has valid transferContent': (r) => Boolean(r.json('data.transferContent')),
  });

  if (!setupOk) {
    fail(`❌ Failed to prepare checkout session: HTTP ${checkoutRes.status} — ${checkoutRes.body}`);
  }

  const json = checkoutRes.json();
  const transferContent = json.data.transferContent;
  const token = json.data.token;

  console.log(`🔒 Prepared Checkout Session for Forged Webhook Security Test:`);
  console.log(`   OrderId: ${orderId}`);
  console.log(`   TransferContent: ${transferContent}`);
  console.log(`   Real Amount: ${CHECKOUT_AMOUNT} VND`);
  console.log(`   Forged Amount: ${FORGED_AMOUNT} VND (Mismatch Intentional)`);

  return { orderId, transferContent, token, amount: CHECKOUT_AMOUNT, forgedAmount: FORGED_AMOUNT };
}

// ─── MAIN: Gửi Webhook Giả mạo Số tiền ──────────────────────────────
export default function (data) {
  const iterId = exec.scenario.iterationInTest;
  const payload = JSON.stringify({
    bankCode: 'MB',
    bankTransactionNo: `FORGED-TXN-${Date.now()}-${iterId}-${randomString(4)}`,
    accountNumber: 'SYS0000000000000001',
    amount: data.forgedAmount,
    transferContent: data.transferContent,
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
  forgedReqDuration.add(duration);

  // Verification NGHIÊM NGẶT:
  // PHẢI trả về HTTP 400 VÀ message PHẢI chứa "Amount mismatch"
  let isAmountMismatchRejected = false;
  try {
    const message = res.json('message') || '';
    isAmountMismatchRejected = res.status === 400 && message.includes('Amount mismatch');
  } catch (e) {
    isAmountMismatchRejected = false;
  }

  const isAccepted = res.status >= 200 && res.status < 300;

  check(res, {
    'forged webhook rejected with HTTP 400': (r) => r.status === 400,
    'forged webhook rejected with Amount mismatch message': () => isAmountMismatchRejected,
    'forged webhook NOT accepted': () => !isAccepted,
  });

  forgedRejectRate.add(isAmountMismatchRejected);
  if (isAmountMismatchRejected) {
    forgedRejectedCount.add(1);
  }
  if (isAccepted) {
    forgedAcceptedCount.add(1);
  }
}

// ─── TEARDOWN ────────────────────────────────────────────────────────
export function teardown(data) {
  console.log('\n' + '═'.repeat(65));
  console.log('🛡️ HOÀN TẤT GD4 FORGED WEBHOOK SECURITY TEST');
  console.log('═'.repeat(65));
  console.log(`   Target Session OrderId: ${data.orderId}`);
  console.log(`   Real Amount: ${data.amount} VND | Forged Amount: ${data.forgedAmount} VND`);
  console.log('═'.repeat(65));
}
