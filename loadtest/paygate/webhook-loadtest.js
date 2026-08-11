/**
 * GD4 - PayGate webhook load test.
 *
 * Scenario 1: normal webhook load with random transferContent.
 * Scenario 2: forged webhook security test using a real checkout transferContent
 *             but intentionally mismatched amount.
 *
 * Run:
 *   & 'C:\Program Files\k6\k6.exe' run loadtest/paygate/webhook-loadtest.js
 */

import http from 'k6/http';
import { check, fail, sleep } from 'k6';
import { Counter, Rate } from 'k6/metrics';
import crypto from 'k6/crypto';
import exec from 'k6/execution';

// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:8081';
const WEBHOOK_SECRET = __ENV.WEBHOOK_SECRET || 'vietqr-secret-default';
const MERCHANT_CODE = __ENV.MERCHANT_CODE || 'MOCK_MERCHANT';
const MERCHANT_API_KEY = __ENV.MERCHANT_API_KEY || 'mock-merchant-api-key-123456';
const CHECKOUT_AMOUNT = Number(__ENV.CHECKOUT_AMOUNT || 100000);
const FORGED_AMOUNT = Number(__ENV.FORGED_AMOUNT || CHECKOUT_AMOUNT - 1);
const FORGED_SLEEP_SECONDS = Number(__ENV.FORGED_SLEEP_SECONDS || 0);

// Scenario 1 metrics
const webhookAccepted = new Counter('webhook_accepted');
const webhookRejected = new Counter('webhook_rejected');

// Scenario 2 metrics
const forgedTotal = new Counter('forged_total');
const forgedAccepted = new Counter('forged_accepted');
const forgedRejected = new Counter('forged_rejected');
const forgedErrors = new Counter('forged_errors');
const forgedRejectRate = new Rate('forged_reject_rate');
const forgedAcceptanceRate = new Rate('forged_acceptance_rate');

const defaultScenarios = {
  load_normal: {
    executor: 'ramping-vus',
    exec: 'scenario1NormalLoad',
    startVUs: 0,
    stages: [
      { duration: '15s', target: 30 },
      { duration: '30s', target: 30 },
      { duration: '15s', target: 0 },
    ],
  },
  forged_amount_mismatch: {
    executor: 'constant-vus',
    exec: 'scenario2ForgedAmountMismatch',
    vus: Number(__ENV.FORGED_VUS || 10),
    duration: __ENV.FORGED_DURATION || '30s',
    startTime: __ENV.FORGED_START_TIME || '65s',
  },
};

const forgedOnlyScenarios = {
  forged_amount_mismatch: {
    executor: 'constant-vus',
    exec: 'scenario2ForgedAmountMismatch',
    vus: Number(__ENV.FORGED_VUS || 5),
    duration: __ENV.FORGED_DURATION || '20s',
  },
};

export const options = {
  scenarios: {
    ...(__ENV.GD4_SCENARIO === 'forged-only' ? forgedOnlyScenarios : defaultScenarios),
  },
  thresholds: {
    http_req_duration: ['p(95)<1000'],
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

function isAcceptedResponse(res) {
  if (res.status < 200 || res.status >= 300) {
    return false;
  }

  try {
    const parsed = res.json();
    return parsed && parsed.success === true;
  } catch (e) {
    return true;
  }
}

export function setup() {
  const orderId = `GD4-SC2-${Date.now()}-${randomString(6)}`;
  const checkoutBody = JSON.stringify({
    orderId,
    amount: CHECKOUT_AMOUNT,
    paymentMethod: 'VIETQR',
    description: 'GD4 Scenario 2 forged webhook security test',
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

  check(checkoutRes, {
    'setup checkout create status is 2xx': (r) => r.status >= 200 && r.status < 300,
    'setup checkout has transferContent': (r) => Boolean(r.json('data.transferContent')),
  });

  if (!isAcceptedResponse(checkoutRes)) {
    fail(`Failed to create real checkout session: status=${checkoutRes.status}, body=${checkoutRes.body}`);
  }

  const transferContent = checkoutRes.json('data.transferContent');
  const token = checkoutRes.json('data.token');

  console.log('GD4 Scenario 2 checkout prepared');
  console.log(`  token=${token}`);
  console.log(`  transferContent=${transferContent}`);
  console.log(`  checkoutAmount=${CHECKOUT_AMOUNT}`);
  console.log(`  forgedAmount=${FORGED_AMOUNT}`);

  return {
    checkout: {
      token,
      transferContent,
      amount: CHECKOUT_AMOUNT,
      forgedAmount: FORGED_AMOUNT,
    },
  };
}

// Scenario 1: normal load - random transferContent.
export function scenario1NormalLoad() {
  const payload = JSON.stringify({
    bankCode: 'VCB',
    bankTransactionNo: `BT-${randomString(12)}`,
    accountNumber: '0123456789',
    amount: 100000,
    transferContent: `RANDOM-${randomString(8)}-${Date.now()}`,
    transactionTime: new Date().toISOString(),
  });

  const res = http.post(`${BASE_URL}/api/v1/integration/bank-webhook`, payload, {
    headers: {
      'Content-Type': 'application/json',
      'X-Bank-Signature': sign(payload, WEBHOOK_SECRET),
    },
  });

  check(res, {
    'response received': () => true,
    'status < 500': (r) => r.status < 500,
  });

  if (isAcceptedResponse(res)) {
    webhookAccepted.add(1);
  } else {
    webhookRejected.add(1);
  }
}

// Scenario 2: forged webhook - real transferContent, wrong amount.
export function scenario2ForgedAmountMismatch(data) {
  const iterationId = exec.scenario.iterationInTest;
  const payload = JSON.stringify({
    bankCode: 'MB',
    bankTransactionNo: `GD4-FORGED-${iterationId}-${randomString(8)}`,
    accountNumber: 'SYS0000000000000001',
    amount: data.checkout.forgedAmount,
    transferContent: data.checkout.transferContent,
    transactionTime: new Date().toISOString(),
  });

  const res = http.post(`${BASE_URL}/api/v1/integration/bank-webhook`, payload, {
    headers: {
      'Content-Type': 'application/json',
      'X-Bank-Signature': sign(payload, WEBHOOK_SECRET),
    },
  });

  const hasHttpResponse = res.status > 0;
  const accepted = isAcceptedResponse(res);
  const rejected = hasHttpResponse && !accepted;
  const errored = !hasHttpResponse;

  forgedTotal.add(1);
  if (accepted) {
    forgedAccepted.add(1);
  } else if (rejected) {
    forgedRejected.add(1);
  } else {
    forgedErrors.add(1);
  }
  forgedAcceptanceRate.add(accepted);
  forgedRejectRate.add(rejected);

  check(res, {
    'forged webhook response received': () => true,
    'forged webhook has HTTP response': () => hasHttpResponse,
    'forged webhook status < 500': (r) => hasHttpResponse && r.status < 500,
    'forged webhook rejected': () => rejected,
  });

  if (FORGED_SLEEP_SECONDS > 0) {
    sleep(FORGED_SLEEP_SECONDS);
  }
}

export function teardown(data) {
  console.log('\n' + '='.repeat(72));
  console.log('GD4 - WEBHOOK LOAD TEST RESULT');
  console.log('='.repeat(72));
  console.log('Scenario 1: normal webhook load with random transferContent.');
  console.log('Scenario 2: forged webhook security test.');
  console.log(`  transferContent=${data.checkout.transferContent}`);
  console.log(`  checkoutAmount=${data.checkout.amount}`);
  console.log(`  forgedAmount=${data.checkout.forgedAmount}`);
  console.log('Review k6 metrics: webhook_accepted/rejected, forged_total, forged_accepted, forged_rejected, forged_errors.');
  console.log('Review k6 rates: forged_reject_rate, forged_acceptance_rate.');
  console.log('='.repeat(72));
}
