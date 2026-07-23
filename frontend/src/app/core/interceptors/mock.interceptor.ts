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

  // Helper to extract query parameters
  const params = req.params;

  // 1. Auth Login Mock
  if (url.includes('/api/v1/auth/login')) {
    return of(new HttpResponse({
      status: 200,
      body: {
        success: true,
        data: {
          accessToken: 'mock-jwt-access-token-vinh-antigravity-2026',
          refreshToken: 'mock-jwt-refresh-token-vinh-antigravity-2026',
          username: 'vinh.nguyen@paygate.com',
          role: 'ADMIN'
        }
      }
    })).pipe(delay(200));
  }

  // 1b. Auth Refresh Token Mock
  if (url.includes('/api/v1/auth/refresh')) {
    return of(new HttpResponse({
      status: 200,
      body: {
        success: true,
        data: {
          accessToken: 'mock-jwt-access-token-refreshed-' + Date.now(),
          refreshToken: 'mock-jwt-refresh-token-refreshed-' + Date.now(),
          username: localStorage.getItem('username') || 'vinh.nguyen@paygate.com',
          role: localStorage.getItem('role') || 'ADMIN'
        }
      }
    })).pipe(delay(200));
  }

  // Helper to read persistent wallet balance
  const getStoredBalance = (): number => {
    const saved = localStorage.getItem('paygate_wallet_balance');
    if (saved !== null && !isNaN(Number(saved))) {
      return Number(saved);
    }
    const defaultBal = localStorage.getItem('paygate_is_new_user') === 'true' ? 0 : 15750000;
    localStorage.setItem('paygate_wallet_balance', defaultBal.toString());
    return defaultBal;
  };

  // 2. Account Profile Me Mock
  if (url.includes('/api/v1/accounts/me') || url.includes('/accounts/me')) {
    const currentBal = getStoredBalance();
    return of(new HttpResponse({
      status: 200,
      body: {
        success: true,
        data: {
          id: 1,
          ownerId: 101,
          ownerType: 'USER',
          accountNumber: 'PAY0000000001',
          balance: currentBal,
          currency: 'VND',
          status: 'ACTIVE',
          createdAt: new Date().toISOString()
        }
      }
    })).pipe(delay(150));
  }

  // 3. Account Balance Mock
  if (url.includes('/balance')) {
    const currentBal = getStoredBalance();
    return of(new HttpResponse({
      status: 200,
      body: {
        success: true,
        data: {
          accountId: 1,
          balance: currentBal,
          currency: 'VND'
        }
      }
    })).pipe(delay(150));
  }

  // 4. Account Top Up Mock (Automatically deducts linked bank balance & adds to wallet balance & transactions!)
  if (url.includes('/accounts/topup') && method === 'POST') {
    const body = req.body as any;
    const amount = Number(body.amount) || 0;
    const currentBal = getStoredBalance();
    const newBal = currentBal + amount;
    localStorage.setItem('paygate_wallet_balance', newBal.toString());

    // Save transaction entry
    const savedTxns = localStorage.getItem('paygate_mock_user_transactions');
    let txns = savedTxns ? JSON.parse(savedTxns) : [];
    const newTxn = {
      id: Date.now(),
      transactionRef: 'TXN-' + Date.now(),
      sourceAccountId: 1,
      destAccountId: 1,
      amount: amount,
      type: 'TOPUP',
      status: 'COMPLETED',
      description: body.paymentMethodId === 'vietqr' ? 'Nạp tiền VietQR Instant Scan' : 'Wallet Top Up via Linked Bank',
      createdAt: new Date().toISOString()
    };
    txns.unshift(newTxn);
    localStorage.setItem('paygate_mock_user_transactions', JSON.stringify(txns));

    // Also deduct from linked bank if paymentMethodId provided
    if (body.paymentMethodId && body.paymentMethodId !== 'vietqr') {
      const savedBanks = localStorage.getItem('paygate_user_linked_banks');
      if (savedBanks) {
        let banks = JSON.parse(savedBanks);
        const bankIndex = banks.findIndex((b: any) => b.id == body.paymentMethodId);
        if (bankIndex !== -1) {
          const currentBankBal = Number(banks[bankIndex].balance) || 0;
          banks[bankIndex].balance = Math.max(0, currentBankBal - amount);
          localStorage.setItem('paygate_user_linked_banks', JSON.stringify(banks));
        }
      }
    }

    return of(new HttpResponse({
      status: 200,
      body: {
        success: true,
        message: 'Top up successful',
        data: {
          accountId: 1,
          transactionRef: newTxn.transactionRef,
          amount: amount,
          type: 'TOPUP',
          status: 'COMPLETED',
          newBalance: newBal
        }
      }
    })).pipe(delay(300));
  }

  // 4b. Account Linked Banks Mock API
  if (url.includes('/api/v1/accounts/linked-banks')) {
    const savedBanks = localStorage.getItem('paygate_user_linked_banks');
    let banks = savedBanks ? JSON.parse(savedBanks) : [];

    if (method === 'POST') {
      const body = req.body as any;
      const newBank = {
        id: Date.now(),
        userId: 1,
        bankName: body.bankName,
        accountNumber: body.accountNumber,
        accountHolder: (body.accountHolder || '').toUpperCase(),
        balance: body.balance || 5000000,
        iconType: body.iconType || 'BANK',
        status: 'ACTIVE',
        createdAt: new Date().toISOString()
      };
      banks.unshift(newBank);
      localStorage.setItem('paygate_user_linked_banks', JSON.stringify(banks));

      return of(new HttpResponse({
        status: 201,
        body: {
          success: true,
          message: 'Liên kết ngân hàng thành công',
          data: newBank
        }
      })).pipe(delay(200));
    }

    if (method === 'DELETE') {
      const parts = url.split('/');
      const bankId = parts[parts.length - 1];
      banks = banks.filter((b: any) => b.id != bankId);
      localStorage.setItem('paygate_user_linked_banks', JSON.stringify(banks));

      return of(new HttpResponse({
        status: 200,
        body: {
          success: true,
          message: 'Đã hủy liên kết ngân hàng thành công'
        }
      })).pipe(delay(150));
    }

    return of(new HttpResponse({
      status: 200,
      body: {
        success: true,
        data: banks
      }
    })).pipe(delay(150));
  }

  // 5. Admin Merchants API Mock (Supports Search & Status Filter)
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
            contactEmail: 'partner@merchant.com',
            accountNumber: 'PAY990000010',
            webhookUrl: 'https://api.partner.com/paygate/webhook',
            apiKey: 'pk_live_891273918273891273',
            apiSecret: 'sk_live_991827389172389172',
            status: 'ACTIVE',
            createdAt: new Date().toISOString()
          }
        }
      })).pipe(delay(250));
    }

    const allMerchants = [
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
      },
      {
        id: 5,
        merchantCode: 'MERCH-10005',
        name: 'Sendo Online Marketplace',
        contactEmail: 'support@sendo.vn',
        accountNumber: 'PAY990000005',
        webhookUrl: 'https://sendo.vn/paygate/event',
        apiKey: 'pk_live_sendo_99120',
        apiSecret: 'sk_live_sendo_secret_w102',
        status: 'ACTIVE',
        createdAt: '2026-07-23T08:00:00Z'
      }
    ];

    let filtered = [...allMerchants];
    const statusFilter = params.get('status');
    const searchFilter = params.get('query') || params.get('search');

    if (statusFilter && statusFilter !== 'ALL') {
      filtered = filtered.filter(m => m.status === statusFilter);
    }
    if (searchFilter) {
      const q = searchFilter.toLowerCase();
      filtered = filtered.filter(m => m.name.toLowerCase().includes(q) || m.merchantCode.toLowerCase().includes(q) || m.contactEmail.toLowerCase().includes(q));
    }

    return of(new HttpResponse({
      status: 200,
      body: {
        success: true,
        data: {
          content: filtered,
          totalElements: filtered.length,
          totalPages: 1,
          number: 0,
          size: 10
        }
      }
    })).pipe(delay(150));
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
      })).pipe(delay(150));
    }

    const allEntries = [
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
      },
      {
        id: 503,
        transactionId: 2,
        accountId: 1,
        amount: 2000000,
        entryType: 'CREDIT',
        balanceAfter: 17250000,
        createdAt: '2026-07-23T08:15:00Z'
      },
      {
        id: 504,
        transactionId: 3,
        accountId: 1,
        amount: 1250000,
        entryType: 'DEBIT',
        balanceAfter: 16000000,
        createdAt: '2026-07-22T14:45:00Z'
      }
    ];

    return of(new HttpResponse({
      status: 200,
      body: {
        success: true,
        data: allEntries
      }
    })).pipe(delay(150));
  }

  // 7. Admin Webhook Logs API Mock (Supports Search & Status Filter)
  if (url.includes('/api/v1/admin/webhooks')) {
    const allLogs = [
      {
        id: 1001,
        transactionId: 1,
        merchantId: 1,
        url: 'https://api.shopee.vn/v1/webhooks/paygate',
        payload: '{"event":"PAYMENT_COMPLETED","txRef":"TXN-20260723-89123","amount":500000}',
        responseStatus: 200,
        responseBody: '{"received":true}',
        attempt: 1,
        status: 'SUCCESS',
        createdAt: '2026-07-23T09:30:05Z'
      },
      {
        id: 1002,
        transactionId: 4,
        merchantId: 2,
        url: 'https://payment.lazada.vn/paygate/callback',
        payload: '{"event":"PAYMENT_COMPLETED","txRef":"TXN-20260722-11092","amount":350000}',
        responseStatus: 503,
        responseBody: 'Service Unavailable',
        attempt: 2,
        nextRetryAt: '2026-07-23T11:00:00Z',
        status: 'RETRYING',
        createdAt: '2026-07-22T11:20:05Z'
      },
      {
        id: 1003,
        transactionId: 5,
        merchantId: 3,
        url: 'https://tiki.vn/api/v2/paygate-hook',
        payload: '{"event":"PAYMENT_FAILED","txRef":"TXN-20260721-99281","amount":800000}',
        responseStatus: 200,
        responseBody: '{"received":true}',
        attempt: 1,
        status: 'SUCCESS',
        createdAt: '2026-07-21T16:10:05Z'
      },
      {
        id: 1004,
        transactionId: 6,
        merchantId: 4,
        url: 'https://api.grab.com/paygate/notification',
        payload: '{"event":"TOPUP_COMPLETED","txRef":"TXN-20260723-77219","amount":2000000}',
        responseStatus: 500,
        responseBody: 'Internal Server Error',
        attempt: 5,
        status: 'FAILED',
        createdAt: '2026-07-23T08:15:05Z'
      }
    ];

    let filtered = [...allLogs];
    const statusFilter = params.get('status');
    if (statusFilter && statusFilter !== 'ALL') {
      filtered = filtered.filter(l => l.status === statusFilter);
    }

    return of(new HttpResponse({
      status: 200,
      body: {
        success: true,
        data: {
          content: filtered,
          totalElements: filtered.length,
          totalPages: 1,
          number: 0,
          size: 10
        }
      }
    })).pipe(delay(150));
  }

  // 8. Users API Mock
  if (url.includes('/api/v1/users')) {
    const allUsers = [
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
      },
      {
        id: 3,
        username: 'merchant_shopee',
        email: 'merchant@shopee.vn',
        fullName: 'Shopee E-Commerce VN',
        role: 'MERCHANT',
        status: 'ACTIVE',
        createdAt: '2026-07-20T08:00:00Z'
      }
    ];

    return of(new HttpResponse({
      status: 200,
      body: {
        success: true,
        data: {
          content: allUsers,
          totalElements: allUsers.length,
          totalPages: 1,
          number: 0,
          size: 10
        }
      }
    })).pipe(delay(150));
  }

  // 9. Account History & Transaction List Mock (Supports Status, Type, and Search Queries)
  if (url.includes('/history') || url.includes('/transactions')) {
    const isNewUser = localStorage.getItem('paygate_is_new_user') === 'true';
    const customTxnsStr = localStorage.getItem('paygate_mock_user_transactions');
    let userTxns: any[] = customTxnsStr ? JSON.parse(customTxnsStr) : [];

    if (!customTxnsStr && !isNewUser) {
      userTxns = [
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
        }
      ];
    }

    let filtered = [...userTxns];
    const statusParam = params.get('status');
    const typeParam = params.get('type');

    if (statusParam && statusParam !== 'ALL') {
      filtered = filtered.filter(t => t.status === statusParam);
    }
    if (typeParam) {
      filtered = filtered.filter(t => t.type === typeParam);
    }

    return of(new HttpResponse({
      status: 200,
      body: {
        success: true,
        data: {
          content: filtered,
          totalElements: filtered.length,
          totalPages: 1,
          number: 0,
          size: 10
        }
      }
    })).pipe(delay(150));
  }

  // Default fallback for unhandled endpoints
  return next(req);
};
