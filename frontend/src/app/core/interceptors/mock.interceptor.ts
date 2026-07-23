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

  // 5. Account History / Transactions Mock
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
