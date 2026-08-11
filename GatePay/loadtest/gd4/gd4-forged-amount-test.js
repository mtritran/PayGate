/**
 * GD4 scenario 2: signed forged-amount requests against one real PENDING checkout.
 * A pass is exactly HTTP 400 with the Amount mismatch business error.
 */

import http from 'k6/http';
import { check } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import {
  optionalPositiveInteger,
  requireEnv,
  requireIsolatedMutationEnvironment,
  requirePositiveNumber,
  responseMessage,
} from '../common/env.js';
import { bankWebhookHeaders } from '../common/webhook.js';
import { bankWebhookPayload, checkoutLoadtestConfig, createCheckoutFixture } from '../common/checkout.js';

requireIsolatedMutationEnvironment();
const config = checkoutLoadtestConfig();
const runId = requireEnv('GD4_RUN_ID');
const forgedAmount = requirePositiveNumber('FORGED_AMOUNT');
const vus = optionalPositiveInteger('GD4_FORGED_VUS', 10);
const duration = __ENV.GD4_FORGED_DURATION || '15s';

if (!Number.isInteger(forgedAmount)) {
  throw new Error('FORGED_AMOUNT must be an integer VND amount');
}
if (forgedAmount === config.amount) {
  throw new Error('FORGED_AMOUNT must differ from CHECKOUT_AMOUNT after VND normalization');
}

const forgedDuration = new Trend('gd4_forged_duration');
const exactMismatchRejected = new Counter('gd4_forged_exact_mismatch_rejected');
const unexpectedAccepted = new Counter('gd4_forged_unexpected_2xx_accepted');
const authenticationFailures = new Counter('gd4_forged_authentication_failures');
const serverErrors = new Counter('gd4_forged_server_errors');
const otherResponses = new Counter('gd4_forged_other_responses');
const forgedRejectRate = new Rate('gd4_forged_exact_reject_rate');

export const options = {
  scenarios: {
    gd4_forged_amount_blast: {
      executor: 'constant-vus',
      vus,
      duration,
    },
  },
  thresholds: {
    gd4_forged_exact_reject_rate: ['rate==1'],
    gd4_forged_duration: ['p(95)<1000'],
    checks: ['rate==1'],
  },
};

export function setup() {
  const orderId = `ORD-GD4-FORGED-${runId}`;
  const fixture = createCheckoutFixture(config, orderId, `GD4 forged amount fixture for ${runId}`);
  console.log(JSON.stringify({ event: 'gd4_forged_setup', runId, orderId, expectedAmount: fixture.amount }));
  return { fixture };
}

export default function (data) {
  const body = bankWebhookPayload(
    config,
    data.fixture.transferContent,
    forgedAmount,
    `LT-FORGED-${runId}-${__VU}-${__ITER}-${Date.now()}`
  );
  const response = http.post(`${config.baseUrl}/api/v1/integration/bank-webhook`, body, {
    headers: bankWebhookHeaders(body, config.webhookSecret),
    responseCallback: http.expectedStatuses(400),
  });
  forgedDuration.add(response.timings.duration);

  const message = responseMessage(response);
  const exactMismatch = response.status === 400 && /Amount mismatch/i.test(message);
  const is2xx = response.status >= 200 && response.status < 300;
  const is401 = response.status === 401;
  const is5xx = response.status >= 500;

  forgedRejectRate.add(exactMismatch);
  if (exactMismatch) exactMismatchRejected.add(1);
  else if (is2xx) unexpectedAccepted.add(1);
  else if (is401) authenticationFailures.add(1);
  else if (is5xx) serverErrors.add(1);
  else otherResponses.add(1);

  check(response, {
    'forged amount returns exact HTTP 400 Amount mismatch': () => exactMismatch,
    'forged amount is never accepted': () => !is2xx,
    'forged amount is not rejected by HMAC authentication': () => !is401,
    'forged amount does not cause a server error': () => !is5xx,
  });
}
