import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export const mockInterceptor: HttpInterceptorFn = (req, next) => {
  // If mock mode is turned off or environment.useMock is false, bypass interceptor
  if (!environment.useMock) {
    return next(req);
  }

  const url = req.url;
  const method = req.method;

  console.log(`[MockInterceptor] Intercepted ${method} ${url}`);

  // 1. Auth Login Mock
  if (url.includes('/api/v1/auth/login')) {
    return of(new HttpResponse({
      status: 200,
      body: {
        success: true,
        data: {
          token: 'mock-jwt-token-vinh-antigravity-2026',
          username: 'vinh.nguyen@paygate.com',
          role: 'ADMIN'
        }
      }
    })).pipe(delay(200));
  }

  // 2. Account Profile Me Mock
  if (url.includes('/api/v1/accounts/me')) {
    return of(new HttpResponse({
      status: 200,
      body: {
        success: true,
        data: {
          id: 1,
          ownerId: 101,
          ownerType: 'USER',
          accountNumber: 'PAY0000000001',
          balance: 15750000,
          currency: 'VND',
          status: 'ACTIVE',
          createdAt: new Date().toISOString()
        }
      }
    })).pipe(delay(150));
  }

  // 3. Account Balance Mock
  if (url.includes('/balance')) {
    return of(new HttpResponse({
      status: 200,
      body: {
        success: true,
        data: {
          accountId: 1,
          balance: 15750000,
          currency: 'VND'
        }
      }
    })).pipe(delay(150));
  }

  // 4. Account Top Up Mock
  if (url.includes('/accounts/topup') && method === 'POST') {
    return of(new HttpResponse({
      status: 200,
      body: {
        success: true,
        message: 'Top up successful',
        data: {
          accountId: 1,
          newBalance: 20750000
        }
      }
    })).pipe(delay(300));
  }

  // 5. Admin Merchants API Mock
  if (url.includes('/api/v1/admin/merchants')) {
    if (method === 'POST') {
      return of(new HttpResponse({
        status: 201,
        body: {
          success: true,
          message: 'Merchant registered successfully',
          data: {
            id: 10,
            merchantCode: 'MERCH-88912',
            name: 'New E-Commerce Partner',
            email: 'partner@merchant.com',
            webhookUrl: 'https://api.partner.com/paygate/webhook',
            apiKey: 'pk_live_891273918273891273',
            apiSecret: 'sk_live_991827389172389172',
            status: 'ACTIVE',
            createdAt: new Date().toISOString()
          }
        }
      })).pipe(delay(250));
    }

    return of(new HttpResponse({
      status: 200,
      body: {
        success: true,
        data: {
          content: [
            {
              id: 1,
              merchantCode: 'MERCH-10001',
              name: 'Shopee Vietnam PayGate Integration',
              contactEmail: 'merchant@shopee.vn',
              accountNumber: 'PAY990000001',
              webhookUrl: 'https://api.shopee.vn/v1/webhooks/paygate',
              apiKey: 'pk_live_shopee_99182',
              apiSecret: 'sk_live_shopee_secret_x881',
              status: 'ACTIVE',
              createdAt: '2026-07-20T08:00:00Z'
            },
            {
              id: 2,
              merchantCode: 'MERCH-10002',
              name: 'Lazada Logistics Payment Node',
              contactEmail: 'finance@lazada.vn',
              accountNumber: 'PAY990000002',
              webhookUrl: 'https://payment.lazada.vn/paygate/callback',
              apiKey: 'pk_live_lazada_44120',
              apiSecret: 'sk_live_lazada_secret_z771',
              status: 'ACTIVE',
              createdAt: '2026-07-21T10:30:00Z'
            },
            {
              id: 3,
              merchantCode: 'MERCH-10003',
              name: 'Tiki Trading Global',
              contactEmail: 'admin@tiki.vn',
              accountNumber: 'PAY990000003',
              webhookUrl: 'https://tiki.vn/api/v2/paygate-hook',
              apiKey: 'pk_live_tiki_88192',
              apiSecret: 'sk_live_tiki_secret_m332',
              status: 'ACTIVE',
              createdAt: '2026-07-22T14:15:00Z'
            },
            {
              id: 4,
              merchantCode: 'MERCH-10004',
              name: 'GrabFood VN Enterprise',
              contactEmail: 'pay@grab.com',
              accountNumber: 'PAY990000004',
              webhookUrl: 'https://api.grab.com/paygate/notification',
              apiKey: 'pk_live_grab_11209',
              apiSecret: 'sk_live_grab_secret_k990',
              status: 'INACTIVE',
              createdAt: '2026-07-22T16:45:00Z'
            }
          ],
          totalElements: 4,
          totalPages: 1,
          number: 0,
          size: 10
        }
      }
    })).pipe(delay(200));
  }

  // 6. Admin Double-Entry Ledger Verify & Account Entries API Mock
  if (url.includes('/api/v1/admin/ledger')) {
    if (url.includes('/verify')) {
      return of(new HttpResponse({
        status: 200,
        body: {
          success: true,
          data: {
            balanced: true,
            totalDebit: 157500000,
            totalCredit: 157500000,
            discrepancy: 0,
            checkedAccountsCount: 24,
            verifiedAt: new Date().toISOString()
          }
        }
      })).pipe(delay(200));
    }

    return of(new HttpResponse({
      status: 200,
      body: {
        success: true,
        data: [
          {
            id: 501,
            transactionId: 1,
            accountId: 1,
            amount: 500000,
            entryType: 'DEBIT',
            balanceAfter: 15250000,
            createdAt: '2026-07-23T09:30:00Z'
          },
          {
            id: 502,
            transactionId: 1,
            accountId: 2,
            amount: 500000,
            entryType: 'CREDIT',
            balanceAfter: 25000000,
            createdAt: '2026-07-23T09:30:00Z'
          }
        ]
      }
    })).pipe(delay(180));
  }

  // 7. Admin Webhook Logs API Mock
  if (url.includes('/api/v1/admin/webhooks')) {
    return of(new HttpResponse({
      status: 200,
      body: {
        success: true,
        data: {
          content: [
            {
              id: 1001,
              transactionRef: 'TXN-20260723-89123',
              merchantCode: 'MERCH-10001',
              targetUrl: 'https://api.shopee.vn/v1/webhooks/paygate',
              payloadJson: '{"event":"PAYMENT_COMPLETED","txRef":"TXN-20260723-89123","amount":500000}',
              responseStatus: 200,
              responseBody: '{"received":true}',
              attemptCount: 1,
              maxAttempts: 5,
              nextRetryAt: null,
              status: 'SUCCESS',
              createdAt: '2026-07-23T09:30:05Z'
            },
            {
              id: 1002,
              transactionRef: 'TXN-20260722-11092',
              merchantCode: 'MERCH-10002',
              targetUrl: 'https://payment.lazada.vn/paygate/callback',
              payloadJson: '{"event":"PAYMENT_COMPLETED","txRef":"TXN-20260722-11092","amount":350000}',
              responseStatus: 503,
              responseBody: 'Service Unavailable',
              attemptCount: 2,
              maxAttempts: 5,
              nextRetryAt: '2026-07-23T11:00:00Z',
              status: 'RETRYING',
              createdAt: '2026-07-22T11:20:05Z'
            },
            {
              id: 1003,
              transactionRef: 'TXN-20260721-99281',
              merchantCode: 'MERCH-10003',
              targetUrl: 'https://tiki.vn/api/v2/paygate-hook',
              payloadJson: '{"event":"PAYMENT_FAILED","txRef":"TXN-20260721-99281","amount":800000}',
              responseStatus: 200,
              responseBody: '{"received":true}',
              attemptCount: 1,
              maxAttempts: 5,
              nextRetryAt: null,
              status: 'SUCCESS',
              createdAt: '2026-07-21T16:10:05Z'
            }
          ],
          totalElements: 3,
          totalPages: 1,
          number: 0,
          size: 10
        }
      }
    })).pipe(delay(200));
  }

  // 8. Users API Mock
  if (url.includes('/api/v1/users')) {
    return of(new HttpResponse({
      status: 200,
      body: {
        success: true,
        data: {
          content: [
            {
              id: 1,
              username: 'admin',
              email: 'admin@paygate.dev',
              fullName: 'System Administrator',
              role: 'ADMIN',
              status: 'ACTIVE',
              createdAt: '2026-07-15T00:00:00Z'
            },
            {
              id: 2,
              username: 'user',
              email: 'user@paygate.dev',
              fullName: 'Nguyen Van Vinh',
              role: 'USER',
              status: 'ACTIVE',
              createdAt: '2026-07-16T10:00:00Z'
            }
          ],
          totalElements: 2,
          totalPages: 1,
          number: 0,
          size: 10
        }
      }
    })).pipe(delay(150));
  }

  // 9. Account History & Transaction List Mock
  if (url.includes('/history') || url.includes('/transactions')) {
    return of(new HttpResponse({
      status: 200,
      body: {
        success: true,
        data: {
          content: [
            {
              id: 1,
              transactionRef: 'TXN-20260723-89123',
              sourceAccountId: 1,
              destAccountId: 2,
              amount: 500000,
              type: 'PAYMENT',
              status: 'COMPLETED',
              description: 'Payment for Coffee & Snacks',
              createdAt: '2026-07-23T09:30:00Z'
            },
            {
              id: 2,
              transactionRef: 'TXN-20260723-77219',
              sourceAccountId: 1,
              destAccountId: 1,
              amount: 2000000,
              type: 'TOPUP',
              status: 'COMPLETED',
              description: 'Wallet Top Up via Vietcombank',
              createdAt: '2026-07-23T08:15:00Z'
            },
            {
              id: 3,
              transactionRef: 'TXN-20260722-55102',
              sourceAccountId: 1,
              destAccountId: 3,
              amount: 1250000,
              type: 'PAYMENT',
              status: 'COMPLETED',
              description: 'Monthly Cloud Infrastructure Hosting',
              createdAt: '2026-07-22T14:45:00Z'
            },
            {
              id: 4,
              transactionRef: 'TXN-20260722-11092',
              sourceAccountId: 1,
              destAccountId: 4,
              amount: 350000,
              type: 'PAYMENT',
              status: 'PROCESSING',
              description: 'Online E-commerce Merchant Checkout',
              createdAt: '2026-07-22T11:20:00Z'
            },
            {
              id: 5,
              transactionRef: 'TXN-20260721-99281',
              sourceAccountId: 1,
              destAccountId: 5,
              amount: 800000,
              type: 'PAYMENT',
              status: 'FAILED',
              description: 'Refund reversal attempt',
              createdAt: '2026-07-21T16:10:00Z'
            }
          ],
          totalElements: 5,
          totalPages: 1,
          number: 0,
          size: 10
        }
      }
    })).pipe(delay(200));
  }

  // Default fallback for unhandled endpoints
  return next(req);
};
