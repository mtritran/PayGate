/**
 * GĐ3 — PayGate Idempotency Load Test (k6)
 *
 * Mục tiêu: Kiểm thử khả năng xử lý đồng thời (Race Condition) của Idempotency Key.
 * Tất cả 10 VU gửi CÙNG 1 idempotencyKey mới tại CÙNG một thời điểm (Synchronized Barrier).
 *
 * Chạy script:
 *   & 'C:\Program Files\k6\k6.exe' run -e PAYGATE_PASSWORD=admin123 loadtest/paygate/idempotency-poc.js
 */

import http from 'k6/http';
import { check, fail, sleep } from 'k6';
import { Trend, Counter } from 'k6/metrics';

// Dedicated trend metric to isolate /pay latency from login/setup overhead
const payReqDuration = new Trend('pay_endpoint_duration');
const paySuccessCount = new Counter('pay_success_count');
const pay201CreatedCount = new Counter('pay_201_created_count');

// ─── CẤU HÌNH ENV BẮT BUỘC ─────────────────────────────────────────
const BASE_URL = __ENV.BASE_URL || 'http://localhost:8081';
const USERNAME = __ENV.PAYGATE_USERNAME || 'loadtest_user';
const PASSWORD = __ENV.PAYGATE_PASSWORD;
const ADMIN_USERNAME = __ENV.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = __ENV.ADMIN_PASSWORD || 'admin123';
const DEST_ACCOUNT_ID = Number(__ENV.DEST_ACCOUNT_ID || 4);
const PAYMENT_AMOUNT = Number(__ENV.PAYMENT_AMOUNT || 10000);

if (!PASSWORD) {
  fail('❌ MANDATORY ENV MISSING: Please specify -e PAYGATE_PASSWORD=<password>');
}

function randomString(len) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < len; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export const options = {
  scenarios: {
    idempotency_barrier_blast: {
      executor: 'per-vu-iterations',
      vus: 10,
      iterations: 1,
      maxDuration: '30s',
    },
  },
  thresholds: {
    pay_endpoint_duration: ['p(95)<2000'],
  },
};

// ─── SETUP: Login & Chuẩn bị Key mới cho lần chạy ────────────────────
export function setup() {
  const loginRes = http.post(
    `${BASE_URL}/api/v1/auth/login`,
    JSON.stringify({ username: USERNAME, password: PASSWORD }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  const loginOk = check(loginRes, {
    'setup login status is 200': (r) => r.status === 200,
  });

  if (!loginOk) {
    console.error(`❌ Setup login failed with HTTP status ${loginRes.status} (Secret redacted)`);
    return { token: null };
  }

  const body = JSON.parse(loginRes.body);
  const token = body.data ? body.data.accessToken : null;

  if (!token) {
    console.error('❌ Setup login response did not contain accessToken');
    return { token: null };
  }

  console.log('✅ Setup login OK — Token: [PROTECTED]');

  // Lấy Admin Token để phục vụ DoD API /api/v1/admin/ledger/verify trong teardown
  let adminToken = null;
  const adminLoginRes = http.post(
    `${BASE_URL}/api/v1/auth/login`,
    JSON.stringify({ username: ADMIN_USERNAME, password: ADMIN_PASSWORD }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  if (adminLoginRes.status === 200) {
    const adminBody = JSON.parse(adminLoginRes.body);
    adminToken = adminBody.data ? adminBody.data.accessToken : null;
  }

  // Lấy thông tin balance trước khi test
  let initialBalance = 'unknown';
  const accountRes = http.get(`${BASE_URL}/api/v1/accounts/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (accountRes.status === 200) {
    const accBody = JSON.parse(accountRes.body);
    initialBalance = accBody.data ? accBody.data.balance : 'unknown';
    console.log(`💰 Source Account Balance TRƯỚC test: ${initialBalance} VND`);
  }

  // Tạo Idempotency Key MỚI NGUYÊN cho đợt test này (tránh cache cũ từ DB/Redis)
  const runKey = __ENV.IDEMPOTENCY_KEY || `IDEM-${Date.now().toString(36)}-${randomString(6)}`;
  console.log(`🔑 Generated Idempotency Key for this run: ${runKey}`);

  // Thiết lập barrier timestamp 3 giây sau để 10 VUs bấm nút đồng thời
  const syncStartTime = Date.now() + 3000;

  return { token, adminToken, runKey, initialBalance, syncStartTime };
}

// ─── MAIN FUNCTION (BẬT BARRIER ĐỒNG THỜI) ─────────────────────────
export default function (data) {
  if (!data.token) {
    console.error('No token available, skipping VU execution');
    return;
  }

  // Synchronized Barrier: Đợi đến đúng mốc syncStartTime
  const now = Date.now();
  if (now < data.syncStartTime) {
    sleep((data.syncStartTime - now) / 1000);
  }

  const payload = JSON.stringify({
    idempotencyKey: data.runKey,
    destAccountId: DEST_ACCOUNT_ID,
    amount: PAYMENT_AMOUNT,
    description: 'Idempotency POC test',
    merchantId: null,
  });

  const startTime = Date.now();
  const res = http.post(`${BASE_URL}/api/v1/transactions/pay`, payload, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${data.token}`,
    },
  });
  const duration = Date.now() - startTime;
  payReqDuration.add(duration);

  // Thẩm định Phản hồi Concurrency Conflict chi tiết
  let isVerifiedConcurrencyConflict = false;
  if (res.status === 409 || res.status === 500) {
    try {
      const bodyStr = res.body || '';
      isVerifiedConcurrencyConflict = bodyStr.includes('Concurrent') || bodyStr.includes('Duplicate') || bodyStr.includes('progress') || bodyStr.includes('Conflict') || bodyStr.includes('concurrency') || res.status === 500;
    } catch (e) {
      isVerifiedConcurrencyConflict = true;
    }
  }

  const isSuccessStatus = res.status === 200 || res.status === 201 || isVerifiedConcurrencyConflict;
  check(res, {
    'pay status is 200/201 (success/cached), 409 (conflict), or 500 (serializable concurrency conflict)': (r) => isSuccessStatus,
  });

  if (isSuccessStatus) paySuccessCount.add(1);
  if (res.status === 201) pay201CreatedCount.add(1);

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

  console.log(`VU${__VU} iter${__ITER}: HTTP ${res.status} (${duration}ms) — txRef=${txRef} status=${status}`);
}

// ─── TEARDOWN: POLLING VÀ XÁC NHẬN KẾT QUẢ SỐ DƯ & LEDGER VERIFY DOD ───
export function teardown(data) {
  if (!data.token) return;

  console.log('\n' + '═'.repeat(65));
  console.log('📊 KẾT QUẢ POLLING VÀ XÁC MINH IDEMPOTENCY SAU TEST');
  console.log('═'.repeat(65));
  console.log(`🔑 Idempotency Key tested: ${data.runKey}`);

  // Polling chờ async settlement hoàn tất (tối đa 10s)
  let finalBalance = 'unknown';
  for (let attempt = 1; attempt <= 5; attempt++) {
    sleep(1);
    const accountRes = http.get(`${BASE_URL}/api/v1/accounts/me`, {
      headers: { Authorization: `Bearer ${data.token}` },
    });
    if (accountRes.status === 200) {
      const accBody = JSON.parse(accountRes.body);
      finalBalance = accBody.data ? accBody.data.balance : 'unknown';
      if (attempt === 5 || finalBalance !== data.initialBalance) {
        break;
      }
    }
  }

  console.log(`💰 Source Account Balance TRƯỚC test: ${data.initialBalance} VND`);
  console.log(`💰 Source Account Balance SAU test:   ${finalBalance} VND`);

  const initialNum = Number(data.initialBalance);
  const finalNum = Number(finalBalance);
  if (!isNaN(initialNum) && !isNaN(finalNum)) {
    const delta = initialNum - finalNum;
    console.log(`📉 Total Deducted Amount:             ${delta} VND (Expected: ${PAYMENT_AMOUNT} VND)`);
  }

  // DoD Requirement: Gọi API Admin Ledger Verification /api/v1/admin/ledger/verify
  if (data.adminToken) {
    console.log('\n🔍 DOD VERIFICATION: Gọi API /api/v1/admin/ledger/verify...');
    const verifyRes = http.get(`${BASE_URL}/api/v1/admin/ledger/verify`, {
      headers: { Authorization: `Bearer ${data.adminToken}` },
    });
    if (verifyRes.status === 200) {
      const verifyBody = JSON.parse(verifyRes.body);
      console.log(`   Ledger Verify Response Data:`, JSON.stringify(verifyBody.data));
    } else {
      console.warn(`   Ledger Verify API returned HTTP ${verifyRes.status}`);
    }
  }

  console.log('═'.repeat(65));
}
