import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./layout/main-layout/main-layout.component').then(m => m.MainLayoutComponent),
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'users',
        loadComponent: () => import('./features/users/user-list/user-list.component').then(m => m.UserListComponent)
      },
      {
        path: 'users/new',
        loadComponent: () => import('./features/users/user-form/user-form.component').then(m => m.UserFormComponent)
      },
      {
        path: 'users/:id/edit',
        loadComponent: () => import('./features/users/user-form/user-form.component').then(m => m.UserFormComponent)
      },
      {
        path: 'accounts/dashboard',
        loadComponent: () => import('./features/account/account-dashboard/account-dashboard.component').then(m => m.AccountDashboardComponent)
      },
      {
        path: 'accounts/me',
        loadComponent: () => import('./features/account/my-account/my-account.component').then(m => m.MyAccountComponent)
      },
      {
        path: 'accounts/topup',
        loadComponent: () => import('./features/account/top-up/top-up.component').then(m => m.TopUpComponent)
      },
      {
        path: 'transactions/pay',
        loadComponent: () => import('./features/transaction/payment-form/payment-form.component').then(m => m.PaymentFormComponent)
      },
      {
        path: 'transactions/history',
        loadComponent: () => import('./features/transaction/transaction-list/transaction-list.component').then(m => m.TransactionListComponent)
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
  { path: '**', redirectTo: '' }
];
