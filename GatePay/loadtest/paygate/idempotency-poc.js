/**
 * GĐ3 — PayGate Idempotency POC (k6 Load Test)
 *
 * Mục tiêu: Chứng minh bug P-C4 — cùng 1 idempotencyKey gửi đồng thời
 * có thể tạo ra nhiều transaction (double-charge).
 *
 * Cách chạy:
 *   & 'C:\Program Files\k6\k6.exe' run loadtest/paygate/idempotency-poc.js
 *
 * Sau khi chạy xong, script tự query DB để đếm số transaction thực tế.
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';

// ─── CẤU HÌNH ───────────────────────────────────────────────────────
const BASE_URL = 'http://localhost:8081';
const USERNAME = 'loadtest_user';
const PASSWORD = 'LoadTest@123';

// Idempotency key CỐ ĐỊNH — tất cả VU gửi CÙNG key này
const FIXED_IDEMPOTENCY_KEY = 'LOADTEST-IDEM-POC-a1b2c3d4-e5f6-7890-abcd-ef1234567890';

// Destination account (mock merchant account)
const DEST_ACCOUNT_ID = 4;
const PAYMENT_AMOUNT = 10000;

// ─── K6 OPTIONS ──────────────────────────────────────────────────────
export const options = {
  scenarios: {
    idempotency_blast: {
      executor: 'shared-iterations',
      vus: 10,
      iterations: 10,
      maxDuration: '30s',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<5000'],
  },
};

// ─── SETUP: Login 1 lần, lấy JWT token ──────────────────────────────
export function setup() {
  const loginRes = http.post(
    `${BASE_URL}/api/v1/auth/login`,
    JSON.stringify({ username: USERNAME, password: PASSWORD }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  check(loginRes, {
    'login status is 200': (r) => r.status === 200,
  });

  const body = JSON.parse(loginRes.body);
  const token = body.data ? body.data.accessToken : null;

  if (!token) {
    console.error('❌ Login failed! Response:', loginRes.body);
    return { token: null };
  }

  console.log(`✅ Login OK — Token: ${token.substring(0, 30)}...`);

  // Lấy thông tin balance trước khi test
  const accountRes = http.get(`${BASE_URL}/api/v1/accounts/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (accountRes.status === 200) {
    const accBody = JSON.parse(accountRes.body);
    const balance = accBody.data ? accBody.data.balance : 'unknown';
    console.log(`💰 Balance TRƯỚC test: ${balance} VND`);
  }

  return { token };
}

// ─── MAIN: Mỗi VU gửi 1 request /pay với CÙNG idempotencyKey ────────
export default function (data) {
  if (!data.token) {
    console.error('No token available, skipping');
    return;
  }

  const payload = JSON.stringify({
    idempotencyKey: FIXED_IDEMPOTENCY_KEY,
    destAccountId: DEST_ACCOUNT_ID,
    amount: PAYMENT_AMOUNT,
    description: 'loadtest idempotency poc',
    merchantId: null,
  });

  const res = http.post(`${BASE_URL}/api/v1/transactions/pay`, payload, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${data.token}`,
    },
  });

  const vuId = __VU;
  const iterNum = __ITER;

  check(res, {
    'status is 200 or 201': (r) => r.status === 200 || r.status === 201,
  });

  // Log kết quả mỗi VU
  let txRef = 'N/A';
  let status = 'N/A';
  try {
    const body = JSON.parse(res.body);
    if (body.data) {
      txRef = body.data.transactionRef || 'N/A';
      status = body.data.status || 'N/A';
    }
  } catch (e) {
    // ignore
  }
  console.log(`VU${vuId} iter${iterNum}: HTTP ${res.status} — txRef=${txRef} status=${status}`);
}

// ─── TEARDOWN: Kiểm tra kết quả sau test ─────────────────────────────
export function teardown(data) {
  if (!data.token) return;

  console.log('\n' + '═'.repeat(60));
  console.log('📊 KẾT QUẢ PHÂN TÍCH SAU LOAD TEST');
  console.log('═'.repeat(60));

  // 1. Check balance SAU test
  const accountRes = http.get(`${BASE_URL}/api/v1/accounts/me`, {
    headers: { Authorization: `Bearer ${data.token}` },
  });
  if (accountRes.status === 200) {
    const accBody = JSON.parse(accountRes.body);
    const balance = accBody.data ? accBody.data.balance : 'unknown';
    console.log(`💰 Balance SAU test: ${balance} VND`);
  }

  // 2. Check transactions list
  const txRes = http.get(`${BASE_URL}/api/v1/transactions?size=50`, {
    headers: { Authorization: `Bearer ${data.token}` },
  });
  if (txRes.status === 200) {
    const txBody = JSON.parse(txRes.body);
    const items = txBody.data ? txBody.data.items || txBody.data.content || [] : [];
    // Count transactions with our idempotency key description
    const matchingTxs = items.filter(
      (tx) => tx.description === 'loadtest idempotency poc'
    );
    console.log(`\n🔍 Transaction tìm thấy với description "loadtest idempotency poc": ${matchingTxs.length}`);
    matchingTxs.forEach((tx, i) => {
      console.log(`   [${i + 1}] ref=${tx.transactionRef} amount=${tx.amount} status=${tx.status}`);
    });

    if (matchingTxs.length === 1) {
      console.log('\n✅ IDEMPOTENCY ĐÚNG — Chỉ 1 transaction được tạo dù 10 VU đồng thời.');
    } else if (matchingTxs.length > 1) {
      console.log(`\n🔴 BUG P-C4 TÁI HIỆN — ${matchingTxs.length} transaction từ 1 idempotencyKey!`);
      console.log('   → Double-charge đã xảy ra, user bị trừ tiền nhiều lần.');
    } else {
      console.log('\n⚠️ Không tìm thấy transaction nào — kiểm tra lại payload.');
    }
  }

  console.log('═'.repeat(60));
}
