/**
 * GD4 scenario 1: HMAC-authenticated load with random, non-matching transfer content.
 * The official feature baseline rejects unknown order IDs with HTTP 404. The test is
 * still mutation-gated because this public webhook route can settle valid sessions.
 */

import http from 'k6/http';
import { check } from 'k6';
import { Counter, Trend } from 'k6/metrics';
import {
  optionalPositiveInteger,
  requireEnv,
  requireIsolatedMutationEnvironment,
} from '../common/env.js';
import { bankWebhookHeaders, validationConfig } from '../common/webhook.js';

requireIsolatedMutationEnvironment();
const config = validationConfig();
const runId = requireEnv('GD4_RUN_ID');
const vus = optionalPositiveInteger('GD4_VALIDATION_VUS', 30);
const duration = __ENV.GD4_VALIDATION_DURATION || '60s';

const validationDuration = new Trend('gd4_validation_duration');
const validationRequests = new Counter('gd4_validation_requests');
const validationAccepted2xx = new Counter('gd4_validation_accepted_2xx');
const validationRejected400 = new Counter('gd4_validation_rejected_400');
const validationRejected404 = new Counter('gd4_validation_rejected_404');
const validationConflict409 = new Counter('gd4_validation_conflict_409');
const validationRejected422 = new Counter('gd4_validation_rejected_422');
const validationAuthenticationFailures = new Counter('gd4_validation_authentication_failures');
const validationOther4xx = new Counter('gd4_validation_other_4xx');
const validationServerErrors = new Counter('gd4_validation_server_errors');
const validationOtherResponses = new Counter('gd4_validation_other_responses');

export const options = {
  scenarios: {
    gd4_validation_nonmatching_content: {
      executor: 'constant-vus',
      vus,
      duration,
    },
  },
  thresholds: {
    gd4_validation_duration: ['p(95)<1000'],
    checks: ['rate==1'],
  },
};

export default function () {
  const requestId = `${__VU}-${__ITER}-${Date.now()}`;
  const body = JSON.stringify({
    bankCode: 'LOADTEST',
    bankTransactionNo: `LT-VALIDATION-${runId}-${requestId}`,
    accountNumber: 'LOADTEST-ACCOUNT',
    amount: 1000,
    transferContent: `PAYGATE LT-VALIDATION-${runId}-${requestId}`,
    transactionTime: new Date().toISOString(),
  });

  const response = http.post(`${config.baseUrl}/api/v1/integration/bank-webhook`, body, {
    headers: bankWebhookHeaders(body, config.webhookSecret),
    responseCallback: http.expectedStatuses(200, 201, 400, 404, 409, 422),
  });
  validationRequests.add(1);
  validationDuration.add(response.timings.duration);

  const is2xx = response.status >= 200 && response.status < 300;
  const is404 = response.status === 404;
  const is5xx = response.status >= 500;
  if (is2xx) validationAccepted2xx.add(1);
  if (response.status === 400) validationRejected400.add(1);
  if (is404) validationRejected404.add(1);
  if (response.status === 409) validationConflict409.add(1);
  if (response.status === 422) validationRejected422.add(1);
  if (response.status === 401) validationAuthenticationFailures.add(1);
  if (response.status >= 400 && response.status < 500
      && ![400, 401, 404, 409, 422].includes(response.status)) {
    validationOther4xx.add(1);
  }
  if (is5xx) validationServerErrors.add(1);
  if (!is2xx && response.status < 400) validationOtherResponses.add(1);

  check(response, {
    'non-matching transfer content returns HTTP 404': () => is404,
    'valid HMAC is not rejected as HTTP 401': () => response.status !== 401,
    'server returns an HTTP response': () => response.status > 0,
  });
}
