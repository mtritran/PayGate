/**
 * GD3 scale extension: run several independent idempotency races concurrently.
 *
 * Each user represents one logical payment and sends the same idempotency key
 * up to ten times. Using separate users keeps every payment:<username> bucket
 * within the production rate limit while increasing total concurrency.
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
const usernames = requireEnv('GD3_SCALE_USERNAMES')
  .split(',')
  .map((value) => value.trim())
  .filter((value) => value.length > 0);
const userPassword = requireEnv('GD3_SCALE_PASSWORD');
const adminUsername = requireEnv('ADMIN_USERNAME');
const adminPassword = requireEnv('ADMIN_PASSWORD');
const destinationAccountId = requirePositiveInteger('DEST_ACCOUNT_ID');
const paymentAmount = requirePositiveNumber('PAYMENT_AMOUNT');
const requestsPerUser = optionalPositiveInteger('GD3_SCALE_REQUESTS_PER_USER', 10);
const barrierSeconds = optionalPositiveInteger('GD3_BARRIER_SECONDS', 3);
const settlementWaitSeconds = optionalPositiveInteger('GD3_SETTLEMENT_WAIT_SECONDS', 20);

if (usernames.length < 2 || usernames.length > 20) {
  throw new Error('GD3_SCALE_USERNAMES must contain between 2 and 20 unique users');
}
if (new Set(usernames).size !== usernames.length) {
  throw new Error('GD3_SCALE_USERNAMES must not contain duplicate users');
}
if (requestsPerUser < 2 || requestsPerUser > 10) {
  throw new Error('GD3_SCALE_REQUESTS_PER_USER must be between 2 and 10 to respect the payment rate limit');
}

const totalVus = usernames.length * requestsPerUser;
const payDuration = new Trend('gd3_scale_pay_duration');
const payRequests = new Counter('gd3_scale_pay_requests');
const http201Responses = new Counter('gd3_scale_http_201_responses');
const duplicateConflictResponses = new Counter('gd3_scale_duplicate_conflict_responses');
const rateLimitedResponses = new Counter('gd3_scale_rate_limited_responses');
const serverErrorResponses = new Counter('gd3_scale_server_error_responses');
const unexpectedResponses = new Counter('gd3_scale_unexpected_responses');

export const options = {
  scenarios: {
    gd3_multi_key_concurrency: {
      executor: 'per-vu-iterations',
      vus: totalVus,
      iterations: 1,
      maxDuration: '45s',
    },
  },
  thresholds: {
    gd3_scale_pay_duration: ['p(95)<2000'],
    checks: ['rate==1'],
  },
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
};

function login(username, password, label, setupClientIp) {
  const response = http.post(
    `${baseUrl}/api/v1/auth/login`,
    JSON.stringify({ username, password }),
    {
      headers: {
        'Content-Type': 'application/json',
        // Login is limited by unauthenticated source IP. Distinct setup-only
        // addresses prevent fixture creation from becoming the measured load.
        'X-Forwarded-For': setupClientIp,
      },
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
  const payers = usernames.map((username, index) => {
    const token = login(username, userPassword, `Payer ${username}`, `198.18.0.${index + 1}`);
    return { username, token, balanceBefore: accountBalance(token) };
  });
  const adminToken = login(adminUsername, adminPassword, 'Admin', '198.18.1.1');
  const barrierAt = Date.now() + barrierSeconds * 1000;

  console.log(JSON.stringify({
    event: 'gd3_scale_setup',
    runId,
    groups: payers.length,
    requestsPerGroup: requestsPerUser,
    totalPaymentRequests: totalVus,
    paymentAmount,
    barrierAt,
  }));

  return { payers, adminToken, barrierAt };
}

export default function (data) {
  const groupIndex = Math.floor((__VU - 1) / requestsPerUser);
  const payer = data.payers[groupIndex];
  const idempotencyKey = `GD3-SCALE-${runId}-G${groupIndex + 1}`;
  const waitSeconds = (data.barrierAt - Date.now()) / 1000;
  if (waitSeconds > 0) sleep(waitSeconds);

  const body = JSON.stringify({
    idempotencyKey,
    destAccountId: destinationAccountId,
    amount: paymentAmount,
    description: `GD3 scale group ${groupIndex + 1} run ${runId}`,
    merchantId: null,
    transactionType: 'PAYMENT',
  });
  const response = http.post(`${baseUrl}/api/v1/transactions/pay`, body, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${payer.token}`,
    },
    responseCallback: http.expectedStatuses(201, 409, 429),
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
  const isRateLimited = response.status === 429;
  const isServerError = response.status >= 500;
  const isExpectedResult = isValidHttp201 || isExpectedConflict;

  if (isValidHttp201) http201Responses.add(1);
  if (isExpectedConflict) duplicateConflictResponses.add(1);
  if (isRateLimited) rateLimitedResponses.add(1);
  if (isServerError) serverErrorResponses.add(1);
  if (!isExpectedResult && !isRateLimited && !isServerError) unexpectedResponses.add(1);

  check(response, {
    'payment is one success or a semantic duplicate conflict': () => isExpectedResult,
    'payment is not rate limited': () => !isRateLimited,
    'payment never returns 5xx': () => !isServerError,
  });

  console.log(JSON.stringify({
    event: 'gd3_scale_payment_response',
    runId,
    group: groupIndex + 1,
    vu: __VU,
    status: response.status,
    outcome: isValidHttp201
      ? 'http_201'
      : isExpectedConflict
        ? 'duplicate_conflict'
        : isRateLimited
          ? 'rate_limited'
          : 'unexpected',
    transactionRef,
    durationMs: response.timings.duration,
  }));
}

export function teardown(data) {
  let pending = data.payers.map((payer) => payer.username);
  let finalBalances = new Map();

  for (let attempt = 1; attempt <= settlementWaitSeconds && pending.length > 0; attempt += 1) {
    sleep(1);
    pending = data.payers
      .filter((payer) => {
        const balance = accountBalance(payer.token);
        finalBalances.set(payer.username, balance);
        return !sameMoney(balance, payer.balanceBefore - paymentAmount);
      })
      .map((payer) => payer.username);
  }

  const verifyResponse = http.get(`${baseUrl}/api/v1/admin/ledger/verify`, {
    headers: { Authorization: `Bearer ${data.adminToken}` },
    responseCallback: http.expectedStatuses(200),
  });
  const verifyBody = jsonBody(verifyResponse);
  const ledgerBalanced = verifyBody && verifyBody.success === true
    && verifyBody.data && verifyBody.data.balanced === true;

  console.log(JSON.stringify({
    event: 'gd3_scale_teardown',
    runId,
    groups: data.payers.length,
    expectedCommittedTransactions: data.payers.length,
    correctBalanceCount: data.payers.length - pending.length,
    incorrectBalanceUsers: pending,
    globalLedgerBalanced: ledgerBalanced,
  }));

  if (pending.length > 0) {
    throw new Error(`Incorrect payer balance after settlement: ${pending.join(', ')}`);
  }
  if (!ledgerBalanced) {
    throw new Error(`Ledger verification failed: HTTP ${verifyResponse.status}`);
  }
}
