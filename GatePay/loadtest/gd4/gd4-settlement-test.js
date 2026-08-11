/**
 * GD4 valid settlement burst: one unique PENDING checkout fixture per VU.
 * It is intentionally a 30 x 1 concurrent burst, not a replay-throughput test.
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';
import {
  optionalPositiveInteger,
  requireEnv,
  requireIsolatedMutationEnvironment,
} from '../common/env.js';
import { bankWebhookHeaders, isApiSuccess } from '../common/webhook.js';
import { bankWebhookPayload, checkoutLoadtestConfig, createCheckoutFixture } from '../common/checkout.js';

requireIsolatedMutationEnvironment();
const config = checkoutLoadtestConfig();
const runId = requireEnv('GD4_RUN_ID');
const vus = optionalPositiveInteger('GD4_SETTLEMENT_VUS', 30);
const barrierSeconds = optionalPositiveInteger('GD4_SETTLEMENT_BARRIER_SECONDS', 3);

const settlementDuration = new Trend('gd4_settlement_duration');
const settlementSuccesses = new Counter('gd4_settlement_successes');
const settlementUnexpected2xx = new Counter('gd4_settlement_unexpected_2xx');
const settlementAuthenticationFailures = new Counter('gd4_settlement_authentication_failures');
const settlementOther4xx = new Counter('gd4_settlement_other_4xx');
const settlementServerErrors = new Counter('gd4_settlement_server_errors');

export const options = {
  scenarios: {
    gd4_valid_settlement_burst: {
      executor: 'per-vu-iterations',
      vus,
      iterations: 1,
      maxDuration: '45s',
    },
  },
  thresholds: {
    gd4_settlement_duration: ['p(95)<1000'],
    checks: ['rate==1'],
  },
};

export function setup() {
  const fixtures = [];
  for (let fixtureNumber = 1; fixtureNumber <= vus; fixtureNumber += 1) {
    const orderId = `ORD-GD4-SETTLEMENT-${runId}-${fixtureNumber}`;
    fixtures.push(createCheckoutFixture(
      config,
      orderId,
      `GD4 valid settlement fixture ${fixtureNumber} for ${runId}`
    ));
  }

  const barrierAt = Date.now() + barrierSeconds * 1000;
  console.log(JSON.stringify({ event: 'gd4_settlement_setup', runId, fixtureCount: fixtures.length, barrierAt }));
  return { fixtures, barrierAt };
}

export default function (data) {
  const fixture = data.fixtures[__VU - 1];
  if (!fixture) throw new Error(`No checkout fixture assigned to VU ${__VU}`);

  const waitSeconds = (data.barrierAt - Date.now()) / 1000;
  if (waitSeconds > 0) sleep(waitSeconds);

  const body = bankWebhookPayload(
    config,
    fixture.transferContent,
    fixture.amount,
    `LT-SETTLEMENT-${runId}-${__VU}`
  );
  const sentAtEpochMs = Date.now();
  const response = http.post(`${config.baseUrl}/api/v1/integration/bank-webhook`, body, {
    headers: bankWebhookHeaders(body, config.webhookSecret),
    responseCallback: http.expectedStatuses(200),
  });
  settlementDuration.add(response.timings.duration);

  const accepted = isApiSuccess(response);
  const is2xx = response.status >= 200 && response.status < 300;
  const is5xx = response.status >= 500;
  if (accepted) settlementSuccesses.add(1);
  if (is2xx && !accepted) settlementUnexpected2xx.add(1);
  if (response.status === 401) settlementAuthenticationFailures.add(1);
  if (response.status >= 400 && response.status < 500 && response.status !== 401) {
    settlementOther4xx.add(1);
  }
  if (is5xx) settlementServerErrors.add(1);

  check(response, {
    'unique settlement returns HTTP 200': () => response.status === 200,
    'unique settlement response success is true': () => accepted,
    'unique settlement has no server error': () => !is5xx,
  });

  console.log(JSON.stringify({
    event: 'gd4_settlement_response',
    runId,
    vu: __VU,
    orderId: fixture.orderId,
    status: response.status,
    sentAtEpochMs,
    durationMs: response.timings.duration,
  }));
}
