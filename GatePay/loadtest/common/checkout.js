import http from 'k6/http';
import { jsonBody, requireEnv, requirePositiveNumber } from './env.js';
import { merchantHeaders, webhookConfig } from './webhook.js';

export function checkoutLoadtestConfig() {
  const amount = requirePositiveNumber('CHECKOUT_AMOUNT');
  if (!Number.isInteger(amount) || amount < 1000) {
    throw new Error('CHECKOUT_AMOUNT must be an integer amount of at least 1000 VND');
  }

  return {
    ...webhookConfig(),
    amount,
    returnUrl: requireEnv('GD4_RETURN_URL'),
    cancelUrl: requireEnv('GD4_CANCEL_URL'),
    bankCode: requireEnv('GD4_BANK_CODE'),
    accountNumber: requireEnv('GD4_ACCOUNT_NUMBER'),
  };
}

export function createCheckoutFixture(config, orderId, description) {
  const body = JSON.stringify({
    orderId,
    amount: config.amount,
    paymentMethod: 'VIETQR',
    description,
    returnUrl: config.returnUrl,
    cancelUrl: config.cancelUrl,
  });

  const response = http.post(`${config.baseUrl}/api/v1/checkout/create`, body, {
    headers: merchantHeaders(body, config.merchantCode, config.merchantApiKey),
    responseCallback: http.expectedStatuses(200, 201),
  });
  const payload = jsonBody(response);
  const data = payload && payload.data;

  const isValidFixture = response.status === 200
    && payload && payload.success === true
    && data && data.paymentMethod === 'VIETQR'
    && typeof data.transferContent === 'string' && data.transferContent.trim() !== '';
  if (!isValidFixture) {
    throw new Error(`Checkout fixture creation failed for ${orderId}: HTTP ${response.status}`);
  }

  return {
    orderId,
    amount: config.amount,
    transferContent: data.transferContent,
  };
}

export function bankWebhookPayload(config, transferContent, amount, transactionNo) {
  return JSON.stringify({
    bankCode: config.bankCode,
    bankTransactionNo: transactionNo,
    accountNumber: config.accountNumber,
    amount,
    transferContent,
    transactionTime: new Date().toISOString(),
  });
}
