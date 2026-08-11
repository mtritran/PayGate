/**
 * GD3: ten concurrent direct-payment requests for one logical payment.
 * Every VU uses the exact same IDEMPOTENCY_KEY supplied by the operator.
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';
import {
  jsonBody,
  optionalPositiveInteger,
  requireEnv,
  requirePositiveInteger,
  requirePositiveNumber,
  responseMessage,
} from '../common/env.js';

const baseUrl = __ENV.BASE_URL || 'http://localhost:8081';
const runId = requireEnv('GD3_RUN_ID');
const username = requireEnv('PAYGATE_USERNAME');
const password = requireEnv('PAYGATE_PASSWORD');
const adminUsername = requireEnv('ADMIN_USERNAME');
const adminPassword = requireEnv('ADMIN_PASSWORD');
const idempotencyKey = requireEnv('IDEMPOTENCY_KEY');
const destinationAccountId = requirePositiveInteger('DEST_ACCOUNT_ID');
const paymentAmount = requirePositiveNumber('PAYMENT_AMOUNT');
const vus = optionalPositiveInteger('GD3_VUS', 10);
const barrierSeconds = optionalPositiveInteger('GD3_BARRIER_SECONDS', 3);
const settlementWaitSeconds = optionalPositiveInteger('GD3_SETTLEMENT_WAIT_SECONDS', 15);

if (vus < 8 || vus > 10) {
  throw new Error('GD3_VUS must be between 8 and 10 to respect the test requirement and payment rate limit');
}

const payDuration = new Trend('gd3_pay_duration');
const payRequests = new Counter('gd3_pay_requests');
const http201Responses = new Counter('gd3_http_201_responses');
const duplicateConflictResponses = new Counter('gd3_duplicate_conflict_responses');
const serverErrorResponses = new Counter('gd3_server_error_responses');
const unexpectedResponses = new Counter('gd3_unexpected_responses');

export const options = {
  scenarios: {
    gd3_same_key_concurrency: {
      executor: 'per-vu-iterations',
      vus,
      iterations: 1,
      maxDuration: '30s',
    },
  },
  thresholds: {
    gd3_pay_duration: ['p(95)<2000'],
    checks: ['rate==1'],
  },
};

function login(loginUsername, loginPassword, label) {
  const response = http.post(
    `${baseUrl}/api/v1/auth/login`,
    JSON.stringify({ username: loginUsername, password: loginPassword }),
    {
      headers: { 'Content-Type': 'application/json' },
      responseCallback: http.expectedStatuses(200),
    }
  );
  const body = jsonBody(response);
  const token = body && body.data && body.data.accessToken;
  if (!token) {
    throw new Error(`${label} login failed: HTTP ${response.status}`);
  }
  return token;
}

function accountBalance(token) {
  const response = http.get(`${baseUrl}/api/v1/accounts/me`, {
    headers: { Authorization: `Bearer ${token}` },
    responseCallback: http.expectedStatuses(200),
  });
  const body = jsonBody(response);
  const balance = body && body.data && Number(body.data.balance);
  if (!Number.isFinite(balance)) {
    throw new Error(`Could not read payer balance: HTTP ${response.status}`);
  }
  return balance;
}

function sameMoney(left, right) {
  return Math.abs(left - right) < 0.000001;
}

export function setup() {
  const payerToken = login(username, password, 'Payer');
  const adminToken = login(adminUsername, adminPassword, 'Admin');
  const balanceBefore = accountBalance(payerToken);
  const barrierAt = Date.now() + barrierSeconds * 1000;

  console.log(JSON.stringify({
    event: 'gd3_setup',
    runId,
    vus,
    idempotencyKey,
    paymentAmount,
    barrierAt,
    payerBalanceBefore: balanceBefore,
  }));

  return { payerToken, adminToken, balanceBefore, barrierAt };
}

export default function (data) {
  const waitSeconds = (data.barrierAt - Date.now()) / 1000;
  if (waitSeconds > 0) sleep(waitSeconds);

  const body = JSON.stringify({
    idempotencyKey,
    destAccountId: destinationAccountId,
    amount: paymentAmount,
    description: `GD3 idempotency run ${runId}`,
    merchantId: null,
    transactionType: 'PAYMENT',
  });
  const sentAtEpochMs = Date.now();
  const response = http.post(`${baseUrl}/api/v1/transactions/pay`, body, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${data.payerToken}`,
    },
    responseCallback: http.expectedStatuses(201, 409),
  });
  payRequests.add(1);
  payDuration.add(response.timings.duration);

  const message = responseMessage(response);
  const payload = jsonBody(response);
  const transactionRef = payload && payload.data ? payload.data.transactionRef : null;
  const isValidHttp201 = response.status === 201
    && payload && payload.success === true
    && typeof transactionRef === 'string' && transactionRef.trim() !== '';
  const isExpectedConflict = response.status === 409
    && payload && payload.success === false
    && /(database constraint violation|duplicate resource|duplicate|constraint|concurrent payment conflict)/i.test(message);
  const isServerError = response.status >= 500;

  if (isValidHttp201) http201Responses.add(1);
  if (isExpectedConflict) duplicateConflictResponses.add(1);
  if (isServerError) serverErrorResponses.add(1);
  if (!isValidHttp201 && !isExpectedConflict && !isServerError) unexpectedResponses.add(1);

  check(response, {
    'payment has a valid HTTP 201 response or semantic duplicate conflict': () => isValidHttp201 || isExpectedConflict,
    'payment never returns 5xx': () => !isServerError,
  });

  console.log(JSON.stringify({
    event: 'gd3_payment_response',
    runId,
    vu: __VU,
    status: response.status,
    outcome: isValidHttp201 ? 'http_201' : isExpectedConflict ? 'duplicate_conflict' : 'unexpected',
    transactionRef,
    message: isValidHttp201 ? null : message,
    sentAtEpochMs,
    durationMs: response.timings.duration,
  }));
}

export function teardown(data) {
  const expectedBalanceAfter = data.balanceBefore - paymentAmount;
  let balanceAfter = data.balanceBefore;
  let balanceCheckError = null;
  try {
    for (let attempt = 1; attempt <= settlementWaitSeconds; attempt += 1) {
      sleep(1);
      balanceAfter = accountBalance(data.payerToken);
      if (sameMoney(balanceAfter, expectedBalanceAfter)) break;
    }
    if (!sameMoney(balanceAfter, expectedBalanceAfter)) {
      balanceCheckError = `Settlement evidence incomplete: expected payer balance ${expectedBalanceAfter}, received ${balanceAfter}`;
    }
  } catch (error) {
    balanceCheckError = `Settlement balance verification failed: ${error.message}`;
  }

  const verifyResponse = http.get(`${baseUrl}/api/v1/admin/ledger/verify`, {
    headers: { Authorization: `Bearer ${data.adminToken}` },
    responseCallback: http.expectedStatuses(200),
  });
  const verifyBody = jsonBody(verifyResponse);
  if (!verifyBody || verifyBody.success !== true || !verifyBody.data) {
    throw new Error(`Ledger verification API failed: HTTP ${verifyResponse.status}`);
  }

  console.log(JSON.stringify({
    event: 'gd3_teardown',
    runId,
    idempotencyKey,
    payerBalanceBefore: data.balanceBefore,
    payerBalanceAfter: balanceAfter,
    payerDelta: data.balanceBefore - balanceAfter,
    globalLedgerBalanced: verifyBody.data && verifyBody.data.balanced,
    globalLedgerMessage: verifyBody.data && verifyBody.data.message,
  }));

  if (balanceCheckError) {
    throw new Error(balanceCheckError);
  }
}
