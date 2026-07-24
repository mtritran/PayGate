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
          username: localStorage.getItem('username') || 'vinh.nguyen@paygate.com',
          role: localStorage.getItem('role') || 'ADMIN'
        }
      }
    })).pipe(delay(200));
  }

  // 1c. Auth Logout Mock
  if (url.includes('/api/v1/auth/logout')) {
    return of(new HttpResponse({
      status: 200,
      body: {
        success: true,
        message: 'Logged out successfully'
      }
    })).pipe(delay(100));
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
      description: body.paymentMethodId === 'vietqr' ? 'VietQR Instant Scan Top Up' : 'Wallet Top Up via Linked Bank',
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
          message: 'Bank account linked successfully',
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
          message: 'Bank account unlinked successfully'
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

  // 4c. Account Exact Lookup Mock (Strict Banking Security: Exact Phone 10 digits OR Account Number)
  if (url.includes('/api/v1/accounts/lookup') || url.includes('/accounts/lookup')) {
    const query = params.get('query') || params.get('accountNumber') || '';
    const cleanQ = query.trim();

    // Mock accounts database
    const mockAccounts = [
      { accountId: 1, accountNumber: 'PAY0000000001', phoneNumber: '0988123456', ownerName: 'VINH NGUYEN (PAYGATE USER)', ownerType: 'USER' },
      { accountId: 2, accountNumber: 'PAY0000000002', phoneNumber: '0912345678', ownerName: 'NGUYEN VAN A', ownerType: 'USER' },
      { accountId: 3, accountNumber: 'PAY0000000003', phoneNumber: '0977889900', ownerName: 'TRAN THI B', ownerType: 'USER' },
      { accountId: 4, accountNumber: 'PAY0000000004', phoneNumber: '0905112233', ownerName: 'THAN VINH', ownerType: 'USER' },
      { accountId: 100, accountNumber: 'PAY990000001', phoneNumber: '0243888999', ownerName: 'SHOPEE VIETNAM ENTERPRISE', ownerType: 'MERCHANT' }
    ];

    // Strict Security Rule: Must match exact phone number OR exact account number
    const found = mockAccounts.find(a => 
      a.phoneNumber === cleanQ || 
      a.accountNumber.toLowerCase() === cleanQ.toLowerCase() ||
      (cleanQ.length >= 10 && cleanQ.toLowerCase() === a.accountNumber.toLowerCase())
    );

    if (found) {
      return of(new HttpResponse({
        status: 200,
        body: {
          success: true,
          data: {
            accountId: found.accountId,
            accountNumber: found.accountNumber,
            ownerName: found.ownerName,
            ownerType: found.ownerType,
            phoneNumber: found.phoneNumber,
            status: 'ACTIVE'
          }
        }
      })).pipe(delay(200));
    } else {
      return of(new HttpResponse({
        status: 404,
        body: {
          success: false,
          message: 'Không tìm thấy tài khoản nhận tiền với Số điện thoại / Số tài khoản chính xác này.'
        }
      })).pipe(delay(200));
    }
  }

  // 5. Admin Merchants API Mock (Supports Search, Status Filter & Tax Code MST Approval)
  if (url.includes('/api/v1/admin/merchants') || url.includes('/api/v1/merchants')) {
    // Helper to get persistent merchants list
    const getStoredMerchants = () => {
      const saved = localStorage.getItem('paygate_mock_merchants_list');
      if (saved) return JSON.parse(saved);
      const defaults = [
        {
          id: 1,
          merchantCode: 'SHOPEE_VN',
          taxCode: '0101234567',
          merchantName: 'Shopee Vietnam Enterprise',
          representativeName: 'Nguyen Van Shopee',
          contactPhone: '0901234567',
          contactEmail: 'merchant@shopee.vn',
          accountNumber: 'PAY990000001',
          webhookUrl: 'https://api.shopee.vn/v1/webhooks/paygate',
          apiKey: 'pk_live_shopee_99182',
          status: 'ACTIVE',
          active: true,
          isFeatured: true,
          createdAt: '2026-07-20T08:00:00Z'
        },
        {
          id: 2,
          merchantCode: 'LAZADA_VN',
          taxCode: '0309876543',
          merchantName: 'Lazada Logistics Payment Node',
          representativeName: 'Tran Thi Lazada',
          contactPhone: '0909876543',
          contactEmail: 'finance@lazada.vn',
          accountNumber: 'PAY990000002',
          webhookUrl: 'https://payment.lazada.vn/paygate/callback',
          apiKey: 'pk_live_lazada_44120',
          status: 'ACTIVE',
          active: true,
          isFeatured: true,
          createdAt: '2026-07-21T10:30:00Z'
        },
        {
          id: 3,
          merchantCode: 'TIKI_GLOBAL',
          taxCode: '0105556667',
          merchantName: 'Tiki Trading Global Joint Stock Co.',
          representativeName: 'Le Van Tiki',
          contactPhone: '0911223344',
          contactEmail: 'admin@tiki.vn',
          accountNumber: 'PAY990000003',
          webhookUrl: 'https://tiki.vn/api/v2/paygate-hook',
          apiKey: 'pk_live_tiki_88192',
          status: 'PENDING',
          active: false,
          isFeatured: false,
          createdAt: '2026-07-22T14:15:00Z'
        },
        {
          id: 4,
          merchantCode: 'AN_BINH_STORE',
          taxCode: '0109998881',
          merchantName: 'Hộ Kinh Doanh An Bình Store (Doanh nghiệp nhỏ)',
          representativeName: 'Nguyen Van An',
          contactPhone: '0988776655',
          contactEmail: 'anbinh@smallshop.vn',
          accountNumber: 'PAY990000004',
          webhookUrl: 'https://anbinh.shop/paygate/hook',
          apiKey: 'pk_live_anbinh_771',
          status: 'ACTIVE',
          active: true,
          isFeatured: false,
          createdAt: '2026-07-23T09:00:00Z'
        }
      ];
      localStorage.setItem('paygate_mock_merchants_list', JSON.stringify(defaults));
      return defaults;
    };

    let merchantsList = getStoredMerchants();

    // Approve Merchant Action
    if (url.includes('/approve') && method === 'PUT') {
      const parts = url.split('/');
      const approveId = Number(parts[parts.indexOf('approve') - 1]);
      merchantsList = merchantsList.map((m: any) => {
        if (m.id === approveId) {
          return {
            ...m,
            status: 'ACTIVE',
            active: true,
            accountNumber: m.accountNumber || `PAY9900${m.id.toString().padStart(4, '0')}`
          };
        }
        return m;
      });
      localStorage.setItem('paygate_mock_merchants_list', JSON.stringify(merchantsList));
      const approved = merchantsList.find((m: any) => m.id === approveId);
      return of(new HttpResponse({
        status: 200,
        body: { success: true, message: 'Phê duyệt doanh nghiệp thành công!', data: approved }
      })).pipe(delay(200));
    }

    // Reject Merchant Action
    if (url.includes('/reject') && method === 'PUT') {
      const parts = url.split('/');
      const rejectId = Number(parts[parts.indexOf('reject') - 1]);
      merchantsList = merchantsList.map((m: any) => {
        if (m.id === rejectId) {
          return { ...m, status: 'REJECTED', active: false };
        }
        return m;
      });
      localStorage.setItem('paygate_mock_merchants_list', JSON.stringify(merchantsList));
      const rejected = merchantsList.find((m: any) => m.id === rejectId);
      return of(new HttpResponse({
        status: 200,
        body: { success: true, message: 'Đã từ chối đơn đăng ký doanh nghiệp!', data: rejected }
      })).pipe(delay(200));
    }

    // Post new registration request
    if (method === 'POST') {
      const body = req.body as any;
      const newMerch = {
        id: Date.now(),
        merchantCode: body.merchantCode || `MERCH_${Date.now()}`,
        taxCode: body.taxCode || '010' + Math.floor(1000000 + Math.random() * 9000000),
        merchantName: body.merchantName,
        representativeName: body.representativeName || 'N/A',
        contactPhone: body.contactPhone || '0900000000',
        contactEmail: body.contactEmail || 'partner@merchant.com',
        accountNumber: '',
        webhookUrl: body.webhookUrl || '',
        apiKey: `pk_live_${Date.now()}`,
        status: 'PENDING',
        active: false,
        createdAt: new Date().toISOString()
      };
      merchantsList.unshift(newMerch);
      localStorage.setItem('paygate_mock_merchants_list', JSON.stringify(merchantsList));

      return of(new HttpResponse({
        status: 201,
        body: {
          success: true,
          message: 'Đăng ký doanh nghiệp thành công! Đang chờ Admin xét duyệt.',
          data: newMerch
        }
      })).pipe(delay(250));
    }

    // GET My Merchant request
    if (url.includes('/my')) {
      const myMerch = merchantsList.find((m: any) => m.id === 3) || merchantsList[0];
      return of(new HttpResponse({
        status: 200,
        body: { success: true, data: myMerch }
      })).pipe(delay(150));
    }

    // GET active/approved merchants for payment lookup by exact Tax Code or Code
    if (url.includes('/active')) {
      const activeMerchants = merchantsList.filter((m: any) => m.status === 'ACTIVE' || m.active === true);
      return of(new HttpResponse({
        status: 200,
        body: { success: true, data: activeMerchants }
      })).pipe(delay(150));
    }

    let filtered = [...merchantsList];
    const statusFilter = params.get('status');
    const searchFilter = params.get('query') || params.get('search');

    if (statusFilter && statusFilter !== 'ALL') {
      filtered = filtered.filter(m => m.status === statusFilter || (statusFilter === 'ACTIVE' && m.active));
    }
    if (searchFilter) {
      const q = searchFilter.toLowerCase();
      filtered = filtered.filter(m => 
        (m.merchantName && m.merchantName.toLowerCase().includes(q)) || 
        (m.merchantCode && m.merchantCode.toLowerCase().includes(q)) || 
        (m.taxCode && m.taxCode.includes(q)) ||
        (m.contactEmail && m.contactEmail.toLowerCase().includes(q))
      );
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
