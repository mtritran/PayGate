import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CheckoutService, CheckoutInfo } from '../../core/services/checkout.service';
import { AuthService } from '../../core/services/auth.service';
import { AccountService } from '../../core/services/account.service';
import { AccountResponse } from '../../core/models/account.model';
import { NotificationService } from '../../core/services/notification.service';
import { PinModalComponent } from '../../shared/components/pin-modal/pin-modal.component';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, ReactiveFormsModule, RouterLink, PinModalComponent],
  template: `
    <div class="checkout-wrapper">
      <div class="checkout-card">
        <!-- Brand Header -->
        <div class="checkout-header">
          <div class="paygate-brand">
            <span class="brand-icon">⚡</span>
            <span class="brand-name">PayGate Payment Gateway</span>
          </div>
          <div class="secure-badge">
            <span>🔒 256-bit security</span>
          </div>
        </div>

        <!-- Loading State -->
        <div *ngIf="loading()" class="state-container">
          <div class="spinner"></div>
          <p>Loading order information...</p>
        </div>

        <!-- Error State -->
        <div *ngIf="errorMsg() && !loading()" class="state-container error-box">
          <div class="error-icon">❌</div>
          <h3>Unable to pay</h3>
          <p>{{ errorMsg() }}</p>
          <a routerLink="/" class="btn-home">Back to home</a>
        </div>

        <!-- Checkout Main Content -->
        <div *ngIf="info() && !loading() && !errorMsg()" class="checkout-body">
          <!-- Order Summary Section -->
          <div class="order-summary-box">
            <div class="merchant-info">
              <div class="merchant-avatar">🏪</div>
              <div>
                <div class="merchant-tag">PAY ORDER TO</div>
                <h2 class="merchant-name">{{ info()?.merchantName }}</h2>
                <div class="order-id">Order ID: #{{ info()?.orderId }}</div>
              </div>
            </div>
            <div class="amount-box">
              <div class="amount-label">Payment amount</div>
              <div class="amount-value">{{ info()?.amount | currency:'VND':'symbol':'1.0-0' }}</div>
            </div>
          </div>

          <div class="order-desc" *ngIf="info()?.description">
            <span class="desc-label">Description:</span> {{ info()?.description }}
          </div>

          <!-- Auth Status & Payment Form -->
          <div class="payment-action-section">
            <!-- If Not Logged In -->
            <div *ngIf="!isLoggedIn()" class="login-prompt-box">
              <div class="prompt-header">
                <h3>Log in to PayGate Wallet to pay</h3>
                <p>Log in to your PayGate account to use wallet balance</p>
              </div>

              <form [formGroup]="loginForm" (ngSubmit)="onLogin()" class="quick-login-form">
                <div class="form-group">
                  <label>Username / Email</label>
                  <input type="text" formControlName="username" placeholder="Enter username" class="form-control">
                </div>
                <div class="form-group">
                  <label>Password</label>
                  <input type="password" formControlName="password" placeholder="Enter password" class="form-control">
                </div>
                <button type="submit" [disabled]="loginForm.invalid || loggingIn()" class="btn-login-submit">
                  {{ loggingIn() ? 'Logging in...' : 'Log in & Continue' }}
                </button>
              </form>
            </div>

            <!-- If Logged In -->
            <div *ngIf="isLoggedIn()" class="wallet-payment-box">
              <div class="user-strip">
                <div class="user-info">
                  <span class="user-avatar">👤</span>
                  <span class="user-name">Logged in: <strong>{{ currentUser() }}</strong></span>
                </div>
                <button class="btn-switch-user" (click)="logout()">Switch account</button>
              </div>

              <!-- Balance Card -->
              <div class="balance-card" [class.insufficient]="isBalanceInsufficient()">
                <div class="balance-title">Available PayGate Wallet balance</div>
                <div class="balance-amount">{{ (account()?.balance || 0) | currency:'VND':'symbol':'1.0-0' }}</div>
                <div class="balance-warning" *ngIf="isBalanceInsufficient()">
                  ⚠️ Insufficient balance. Please top up your wallet.
                </div>
              </div>

              <!-- Action Buttons -->
              <div class="checkout-actions">
                <button
                  type="button"
                  class="btn-cancel"
                  (click)="cancelPayment()"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  class="btn-pay-now"
                  [disabled]="isBalanceInsufficient() || processing()"
                  (click)="openOtpModal()"
                >
                  {{ processing() ? 'Processing...' : 'OTP Verification & Payment' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- OTP Security Modal -->
      <app-pin-modal
        [isOpen]="showOtpModal()"
        title="OTP Verification Thanh Toán Đơn Hàng"
        action="OTP verification for order payment"
        [bypassVerification]="true"
        (confirmed)="onOtpConfirmed($event)"
        (cancelled)="showOtpModal.set(false)"
      ></app-pin-modal>
    </div>
  `,
  styles: [`
    .checkout-wrapper {
      min-height: 100vh; background: #0f172a;
      display: flex; align-items: center; justify-content: center; padding: 24px;
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
    }
    .checkout-card {
      background: #ffffff; width: 100%; max-width: 540px;
      border-radius: 24px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
      overflow: hidden; border: 1px solid rgba(255,255,255,0.1);
    }
    .checkout-header {
      background: linear-gradient(135deg, #064e3b 0%, #047857 100%);
      color: #ffffff; padding: 20px 28px;
      display: flex; align-items: center; justify-content: space-between;
    }
    .paygate-brand { display: flex; align-items: center; gap: 10px; font-weight: 800; font-size: 1.1rem; }
    .brand-icon { font-size: 1.3rem; }
    .secure-badge { font-size: 0.78rem; background: rgba(255,255,255,0.15); padding: 4px 10px; border-radius: 20px; font-weight: 600; }
    
    .state-container { padding: 48px 24px; text-align: center; color: #64748b; }
    .spinner {
      width: 36px; height: 36px; border: 3px solid #e2e8f0; border-top-color: #059669;
      border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 16px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    
    .error-box h3 { color: #0f172a; margin: 12px 0 6px; }
    .error-icon { font-size: 42px; }
    .btn-home { display: inline-block; margin-top: 16px; color: #059669; font-weight: 700; text-decoration: none; }

    .checkout-body { padding: 28px; display: flex; flex-direction: column; gap: 20px; }
    .order-summary-box {
      background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 16px; padding: 20px;
      display: flex; justify-content: space-between; align-items: center; gap: 16px;
    }
    .merchant-info { display: flex; gap: 14px; align-items: center; }
    .merchant-avatar { width: 44px; height: 44px; background: #ecfdf5; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 22px; }
    .merchant-tag { font-size: 0.68rem; font-weight: 800; color: #059669; letter-spacing: 0.05em; }
    .merchant-name { font-size: 1.15rem; font-weight: 800; margin: 2px 0; color: #0f172a; }
    .order-id { font-size: 0.82rem; color: #64748b; font-family: monospace; }
    .amount-box { text-align: right; }
    .amount-label { font-size: 0.75rem; color: #64748b; font-weight: 600; }
    .amount-value { font-size: 1.35rem; font-weight: 800; color: #059669; }

    .order-desc { font-size: 0.88rem; color: #475569; background: #f1f5f9; padding: 12px 16px; border-radius: 10px; }
    .desc-label { font-weight: 700; color: #0f172a; }

    /* Quick Login Form */
    .login-prompt-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; }
    .prompt-header h3 { font-size: 1.05rem; font-weight: 700; margin: 0 0 4px; color: #0f172a; }
    .prompt-header p { font-size: 0.85rem; color: #64748b; margin: 0 0 16px; }
    .quick-login-form { display: flex; flex-direction: column; gap: 14px; }
    .form-group { display: flex; flex-direction: column; gap: 6px; }
    .form-group label { font-size: 0.8rem; font-weight: 700; color: #475569; }
    .form-control { padding: 12px; border: 1.5px solid #cbd5e1; border-radius: 10px; font-size: 0.95rem; }
    .form-control:focus { outline: none; border-color: #059669; }
    .btn-login-submit {
      padding: 14px; background: #059669; color: #fff; border: none; border-radius: 10px;
      font-weight: 800; font-size: 0.95rem; cursor: pointer; transition: background 0.15s;
    }
    .btn-login-submit:hover:not(:disabled) { background: #047857; }

    /* User Strip & Wallet */
    .user-strip { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
    .user-info { font-size: 0.88rem; color: #334155; display: flex; align-items: center; gap: 6px; }
    .btn-switch-user { background: none; border: none; color: #059669; font-size: 0.82rem; font-weight: 700; cursor: pointer; }
    
    .balance-card {
      background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
      border: 1.5px solid #a7f3d0; border-radius: 16px; padding: 20px; color: #047857;
    }
    .balance-card.insufficient { background: #fef2f2; border-color: #fca5a5; color: #b91c1c; }
    .balance-title { font-size: 0.8rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; }
    .balance-amount { font-size: 1.7rem; font-weight: 800; margin-top: 4px; }
    .balance-warning { font-size: 0.85rem; font-weight: 700; margin-top: 8px; }

    .checkout-actions { display: grid; grid-template-columns: 1fr 2fr; gap: 12px; margin-top: 20px; }
    .btn-cancel {
      padding: 16px; background: #f1f5f9; color: #475569; border: none; border-radius: 14px;
      font-weight: 700; cursor: pointer; transition: background 0.15s;
    }
    .btn-cancel:hover { background: #e2e8f0; }
    .btn-pay-now {
      padding: 16px; background: #059669; color: #fff; border: none; border-radius: 14px;
      font-weight: 800; font-size: 0.95rem; cursor: pointer; transition: all 0.15s;
      box-shadow: 0 4px 14px rgba(5,150,105,0.3);
    }
    .btn-pay-now:hover:not(:disabled) { background: #047857; transform: translateY(-1px); }
    .btn-pay-now:disabled { opacity: 0.6; cursor: not-allowed; box-shadow: none; }
  `]
})
export class CheckoutComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private checkoutService = inject(CheckoutService);
  private authService = inject(AuthService);
  private accountService = inject(AccountService);
  private notify = inject(NotificationService);

  token = signal<string>('');
  info = signal<CheckoutInfo | null>(null);
  account = signal<AccountResponse | null>(null);
  
  loading = signal(true);
  loggingIn = signal(false);
  processing = signal(false);
  errorMsg = signal('');
  showOtpModal = signal(false);

  loginForm: FormGroup = this.fb.group({
    username: ['', Validators.required],
    password: ['', Validators.required]
  });

  isLoggedIn(): boolean {
    return this.authService.isAuthenticated();
  }

  currentUser(): string {
    return this.authService.getUsername() || '';
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe((params: any) => {
      const t = params['token'];
      if (!t) {
        this.errorMsg.set('Missing payment token');
        this.loading.set(false);
        return;
      }
      this.token.set(t);
      this.loadCheckoutInfo(t);
    });

    if (this.isLoggedIn()) {
      this.loadUserAccount();
    }
  }

  loadCheckoutInfo(t: string): void {
    this.loading.set(true);
    this.checkoutService.getCheckoutInfo(t).subscribe({
      next: (res: any) => {
        this.loading.set(false);
        if (res.data) {
          this.info.set(res.data);
        }
      },
      error: (err: any) => {
        this.loading.set(false);
        this.errorMsg.set(err?.error?.message || 'Payment session does not exist or has expired');
      }
    });
  }

  loadUserAccount(): void {
    this.accountService.getAccountMe().subscribe({
      next: (res: any) => {
        if (res.data) this.account.set(res.data);
      }
    });
  }

  onLogin(): void {
    if (this.loginForm.invalid) return;
    this.loggingIn.set(true);
    this.authService.login(this.loginForm.value).subscribe({
      next: () => {
        this.loggingIn.set(false);
        this.notify.success('Logged in successfully!');
        this.loadUserAccount();
      },
      error: (err: any) => {
        this.loggingIn.set(false);
        this.notify.error(err?.error?.message || 'Login failed');
      }
    });
  }

  logout(): void {
    this.authService.logout();
    this.account.set(null);
  }

  isBalanceInsufficient(): boolean {
    const acc = this.account();
    const inf = this.info();
    if (!acc || !inf) return false;
    return acc.balance < inf.amount;
  }

  openOtpModal(): void {
    this.showOtpModal.set(true);
  }

  onOtpConfirmed(otpCode: string): void {
    this.showOtpModal.set(false);
    this.processing.set(true);

    this.checkoutService.processCheckout(this.token(), otpCode).subscribe({
      next: (res: any) => {
        this.processing.set(false);
        if (res.data) {
          this.notify.success('Payment successful!');
          setTimeout(() => {
            window.location.href = res.data.redirectUrl;
          }, 1000);
        }
      },
      error: (err: any) => {
        this.processing.set(false);
        this.notify.error(err?.error?.message || 'Payment failed');
      }
    });
  }

  cancelPayment(): void {
    const inf = this.info();
    if (inf?.cancelUrl) {
      window.location.href = inf.cancelUrl;
    } else {
      this.router.navigate(['/']);
    }
  }
}
