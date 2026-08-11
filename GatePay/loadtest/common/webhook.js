import crypto from 'k6/crypto';
import { jsonBody, requireEnv } from './env.js';

export function webhookConfig() {
  return {
    baseUrl: __ENV.BASE_URL || 'http://localhost:8081',
    webhookSecret: requireEnv('WEBHOOK_SECRET'),
    merchantCode: requireEnv('MERCHANT_CODE'),
    merchantApiKey: requireEnv('MERCHANT_API_KEY'),
  };
}

export function validationConfig() {
  return {
    baseUrl: __ENV.BASE_URL || 'http://localhost:8081',
    webhookSecret: requireEnv('WEBHOOK_SECRET'),
  };
}

export function sign(body, secret) {
  return crypto.hmac('sha256', secret, body, 'base64');
}

export function merchantHeaders(body, merchantCode, merchantApiKey) {
  return {
    'Content-Type': 'application/json',
    'X-Merchant-Code': merchantCode,
    'X-Signature': sign(body, merchantApiKey),
  };
}

export function bankWebhookHeaders(body, webhookSecret) {
  return {
    'Content-Type': 'application/json',
    'X-Bank-Signature': sign(body, webhookSecret),
  };
}

export function isApiSuccess(response) {
  const body = jsonBody(response);
  return response.status >= 200 && response.status < 300 && body && body.success === true;
}
