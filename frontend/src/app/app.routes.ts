import { Routes } from '@angular/router';
import { authGuard, userOnlyGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./layout/main-layout/main-layout.component').then(m => m.MainLayoutComponent),
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'accounts/dashboard', pathMatch: 'full' },
      { path: 'dashboard', redirectTo: 'accounts/dashboard', pathMatch: 'full' },
      { path: 'transactions/send', redirectTo: 'transactions/pay', pathMatch: 'full' },
      { path: 'merchants/register', redirectTo: 'merchant/register', pathMatch: 'full' },
      {
        path: 'users',
        canActivate: [adminGuard],
        loadComponent: () => import('./features/users/user-list/user-list.component').then(m => m.UserListComponent)
      },
      {
        path: 'users/new',
        canActivate: [adminGuard],
        loadComponent: () => import('./features/users/user-form/user-form.component').then(m => m.UserFormComponent)
      },
      {
        path: 'users/:id/edit',
        canActivate: [adminGuard],
        loadComponent: () => import('./features/users/user-form/user-form.component').then(m => m.UserFormComponent)
      },
      {
        path: 'accounts/dashboard',
        canActivate: [userOnlyGuard],
        loadComponent: () => import('./features/account/account-dashboard/account-dashboard.component').then(m => m.AccountDashboardComponent)
      },
      {
        path: 'accounts/me',
        canActivate: [userOnlyGuard],
        loadComponent: () => import('./features/account/my-account/my-account.component').then(m => m.MyAccountComponent)
      },
      {
        path: 'accounts/topup',
        canActivate: [userOnlyGuard],
        loadComponent: () => import('./features/account/top-up/top-up.component').then(m => m.TopUpComponent)
      },
      {
        path: 'vaults',
        canActivate: [userOnlyGuard],
        loadComponent: () => import('./features/vault/vault-list/vault-list.component').then(m => m.VaultListComponent)
      },
      {
        path: 'vaults/new',
        canActivate: [userOnlyGuard],
        loadComponent: () => import('./features/vault/vault-create/vault-create.component').then(m => m.VaultCreateComponent)
      },
      {
        path: 'vaults/:id',
        canActivate: [userOnlyGuard],
        loadComponent: () => import('./features/vault/vault-detail/vault-detail.component').then(m => m.VaultDetailComponent)
      },
      {
        path: 'loans',
        canActivate: [userOnlyGuard],
        loadComponent: () => import('./features/loan/loan-dashboard/loan-dashboard.component').then(m => m.LoanDashboardComponent)
      },
      {
        path: 'transactions/pay',
        canActivate: [userOnlyGuard],
        loadComponent: () => import('./features/transaction/payment-form/payment-form.component').then(m => m.PaymentFormComponent)
      },
      {
        path: 'transactions/transfer',
        canActivate: [userOnlyGuard],
        loadComponent: () => import('./features/transaction/payment-form/payment-form.component').then(m => m.PaymentFormComponent)
      },
      {
        path: 'transactions/history',
        canActivate: [userOnlyGuard],
        loadComponent: () => import('./features/transaction/transaction-list/transaction-list.component').then(m => m.TransactionListComponent)
      },
      {
        path: 'recurring-payments',
        canActivate: [userOnlyGuard],
        loadComponent: () => import('./features/recurring-payment/recurring-payment-list/recurring-payment-list.component').then(m => m.RecurringPaymentListComponent)
      },
      {
        path: 'recurring-payments/new',
        canActivate: [userOnlyGuard],
        loadComponent: () => import('./features/recurring-payment/recurring-payment-form/recurring-payment-form.component').then(m => m.RecurringPaymentFormComponent)
      },
      {
        path: 'bills/pay',
        canActivate: [userOnlyGuard],
        loadComponent: () => import('./features/bill/bill-pay/bill-pay.component').then(m => m.BillPayComponent)
      },
      {
        path: 'bills/saved',
        canActivate: [userOnlyGuard],
        loadComponent: () => import('./features/bill/saved-bills/saved-bills.component').then(m => m.SavedBillsComponent)
      },
      {
        path: 'vouchers',
        canActivate: [userOnlyGuard],
        loadComponent: () => import('./features/vouchers/voucher-shop.component').then(m => m.VoucherShopComponent)
      },
      {
        path: 'merchant/register',
        canActivate: [userOnlyGuard],
        loadComponent: () => import('./features/merchant/merchant-register/merchant-register.component').then(m => m.MerchantRegisterComponent)
      },
      {
        path: 'admin/merchants',
        canActivate: [adminGuard],
        loadComponent: () => import('./features/merchant/merchant-list/merchant-list.component').then(m => m.MerchantListComponent)
      },
      {
        path: 'admin/ledger',
        canActivate: [adminGuard],
        loadComponent: () => import('./features/ledger/admin-ledger/admin-ledger.component').then(m => m.AdminLedgerComponent)
      },
      {
        path: 'admin/dashboard',
        canActivate: [adminGuard],
        loadComponent: () => import('./features/dashboard/admin-dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent)
      },
      {
        path: 'admin/webhooks',
        canActivate: [adminGuard],
        loadComponent: () => import('./features/webhook/webhook-log/webhook-log.component').then(m => m.WebhookLogComponent)
      },
      {
        path: 'admin/vouchers',
        canActivate: [adminGuard],
        loadComponent: () => import('./features/vouchers/admin-voucher.component').then(m => m.AdminVoucherComponent)
      }
    ]
  },
  {
    path: '',
    loadComponent: () => import('./layout/auth-layout/auth-layout.component').then(m => m.AuthLayoutComponent),
    children: [
      {
        path: 'login',
        loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent)
      },
      {
        path: 'register',
        loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent)
      }
    ]
  },
  {
    path: 'checkout',
    loadComponent: () => import('./features/checkout/checkout.component').then(m => m.CheckoutComponent)
  },
  { path: '**', redirectTo: '' }
];
