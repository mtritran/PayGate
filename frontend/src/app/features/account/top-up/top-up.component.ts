import { Component, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AccountService } from '../../../core/services/account.service';
import { NotificationService } from '../../../core/services/notification.service';

export interface PaymentSourceMock {
  id: 'BANK' | 'CARD' | 'MOMO';
  title: string;
  subtitle: string;
  balance: number;
}

@Component({
  selector: 'app-top-up',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CurrencyPipe
  ],
  template: `
    <div class="topup-page fade-in-up">
      <!-- Header -->
      <div class="page-header text-center">
        <div class="header-tag">PAYGATE INSTANT TOP UP</div>
        <h2>Top Up Wallet</h2>
        <p class="subtitle">Add funds to your PayGate balance via linked mock payment sources.</p>
      </div>

      <div class="form-container">
        <!-- Balance Preview Card -->
        <div class="content-card balance-card">
          <div class="balance-card-inner">
            <div class="balance-meta">
              <span class="field-label">Current PayGate Balance</span>
              <div class="balance-display">{{ accountBalance | currency:'VND':'symbol':'1.0-0' }}</div>
            </div>
            <div class="after-topup-badge">
              <span>After top-up:</span>
              <strong>{{ (accountBalance + currentAmount) | currency:'VND':'symbol':'1.0-0' }}</strong>
            </div>
          </div>
        </div>

        <!-- Form Card -->
        <div class="content-card form-card mt-16">
          <form [formGroup]="topUpForm" (ngSubmit)="onSubmit()" class="custom-topup-form">
            <!-- Preset Amounts -->
            <div class="form-section">
              <label class="section-label">Select Amount Preset</label>
              <div class="preset-grid">
                <button
                  type="button"
                  class="preset-btn"
                  *ngFor="let p of presets"
                  [class.active]="topUpForm.value.amount === p.val"
                  (click)="setPresetAmount(p.val)">
                  {{ p.label }}
                </button>
              </div>
            </div>

            <!-- Custom Amount Input -->
            <div class="form-section">
              <label class="section-label">Or Custom Amount (VND)</label>
              <div class="input-wrapper">
                <span class="currency-prefix">₫</span>
                <input
                  type="number"
                  class="custom-amount-input"
                  formControlName="amount"
                  placeholder="Enter custom amount..."
                  min="10000"
                  max="1000000000">
              </div>
              <div class="error-msg" *ngIf="topUpForm.get('amount')?.touched && topUpForm.get('amount')?.hasError('min')">
                Minimum top up amount is 10,000 VND.
              </div>
            </div>

            <!-- Linked Payment Source Selector with Realtime Mock Balance -->
            <div class="form-section">
              <div class="flex-between mb-8">
                <label class="section-label mb-0">Select Linked Payment Source (Mock Balance Check)</label>
                <button type="button" class="btn-reset-mock" (click)="resetMockBalances()" title="Reset Mock Balances">
                  🔄 Reset Mock Balances
                </button>
              </div>

              <div class="method-grid">
                <!-- Method 1: MB Bank -->
                <button
                  type="button"
                  class="method-card"
                  [class.active]="selectedMethodId === 'BANK'"
                  [class.insufficient]="isInsufficient('BANK')"
                  (click)="setMethod('BANK')">
                  <div class="method-icon-box">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <line x1="3" y1="21" x2="21" y2="21" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                      <polyline points="12 3 2 10 22 10 12 3" />
                      <line x1="6" y1="10" x2="6" y2="21" />
                      <line x1="10" y1="10" x2="10" y2="21" />
                      <line x1="14" y1="10" x2="14" y2="21" />
                      <line x1="18" y1="10" x2="18" y2="21" />
                    </svg>
                  </div>
                  <div class="method-info">
                    <span class="method-title">MB Bank (Mock)</span>
                    <span class="method-balance" [class.text-danger]="isInsufficient('BANK')">
                      Hạn mức: {{ mockSources['BANK'].balance | currency:'VND':'symbol':'1.0-0' }}
                    </span>
                  </div>
                </button>

                <!-- Method 2: Napas ATM -->
                <button
                  type="button"
                  class="method-card"
                  [class.active]="selectedMethodId === 'CARD'"
                  [class.insufficient]="isInsufficient('CARD')"
                  (click)="setMethod('CARD')">
                  <div class="method-icon-box">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                      <line x1="1" y1="10" x2="23" y2="10" />
                    </svg>
                  </div>
                  <div class="method-info">
                    <span class="method-title">Napas ATM (Mock)</span>
                    <span class="method-balance" [class.text-danger]="isInsufficient('CARD')">
                      Hạn mức: {{ mockSources['CARD'].balance | currency:'VND':'symbol':'1.0-0' }}
                    </span>
                  </div>
                </button>

                <!-- Method 3: MoMo Wallet -->
                <button
                  type="button"
                  class="method-card"
                  [class.active]="selectedMethodId === 'MOMO'"
                  [class.insufficient]="isInsufficient('MOMO')"
                  (click)="setMethod('MOMO')">
                  <div class="method-icon-box">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                      <line x1="12" y1="18" x2="12.01" y2="18" />
                    </svg>
                  </div>
                  <div class="method-info">
                    <span class="method-title">MoMo (Mock)</span>
                    <span class="method-balance" [class.text-danger]="isInsufficient('MOMO')">
                      Hạn mức: {{ mockSources['MOMO'].balance | currency:'VND':'symbol':'1.0-0' }}
                    </span>
                  </div>
                </button>
              </div>

              <!-- Warning Banner if Selected Source Insufficient -->
              <div class="insufficient-banner mt-12" *ngIf="isCurrentSourceInsufficient()">
                <div class="banner-icon">⚠️</div>
                <div class="banner-text">
                  <strong>Số dư nguồn {{ currentSource.title }} không đủ!</strong>
                  <span>Bạn muốn nạp <strong>{{ currentAmount | currency:'VND':'symbol':'1.0-0' }}</strong> nhưng số dư nguồn này chỉ còn <strong>{{ currentSource.balance | currency:'VND':'symbol':'1.0-0' }}</strong> (Thiếu {{ (currentAmount - currentSource.balance) | currency:'VND':'symbol':'1.0-0' }}).</span>
                </div>
              </div>
            </div>

            <!-- Submit Button -->
            <div class="submit-action mt-24">
              <button
                class="btn-emerald-submit pulse-glow"
                type="submit"
                [disabled]="topUpForm.invalid || submitting || isCurrentSourceInsufficient()">
                <span *ngIf="!submitting" class="btn-content">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="16" />
                    <line x1="8" y1="12" x2="16" y2="12" />
                  </svg>
                  Top up {{ currentAmount | currency:'VND':'symbol':'1.0-0' }} via {{ currentSource.title }} ↗
                </span>
                <span *ngIf="submitting" class="btn-content">
                  <span class="btn-spinner"></span>
                  Checking Bank Balance & Processing...
                </span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(14px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .fade-in-up { animation: fadeInUp 0.4s ease-out forwards; }

    .topup-page { display: flex; flex-direction: column; gap: 24px; color: #0f172a; align-items: center; font-family: 'Inter', system-ui, sans-serif; }
    .text-center { text-align: center; }
    .flex-between { display: flex; justify-content: space-between; align-items: center; }
    .mb-8 { margin-bottom: 8px; }
    .mb-0 { margin-bottom: 0 !important; }
    .mt-12 { margin-top: 12px; }
    
    .header-tag { font-size: 0.7rem; font-weight: 800; color: #059669; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
    .page-header h2 { font-size: 1.65rem; font-weight: 800; margin: 0 0 4px 0; letter-spacing: -0.02em; }
    .subtitle { font-size: 0.875rem; color: #64748b; margin: 0; }

    .form-container { width: 100%; max-width: 560px; }
    .content-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 20px; padding: 28px; box-shadow: 0 4px 20px -5px rgba(0,0,0,0.04); }
    .mt-16 { margin-top: 16px; }
    .mt-24 { margin-top: 24px; }

    /* Top Balance Preview Card */
    .balance-card { background: linear-gradient(135deg, #059669 0%, #047857 100%); color: #ffffff; border: none; }
    .balance-card-inner { display: flex; justify-content: space-between; align-items: center; }
    .field-label { font-size: 0.8rem; font-weight: 600; color: rgba(255, 255, 255, 0.8); }
    .balance-display { font-size: 1.85rem; font-weight: 800; color: #ffffff; margin-top: 4px; letter-spacing: -0.02em; }
    
    .after-topup-badge { background: rgba(255, 255, 255, 0.15); backdrop-filter: blur(10px); padding: 10px 14px; border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.2); font-size: 0.8rem; display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }
    .after-topup-badge strong { font-size: 0.95rem; font-weight: 800; color: #a7f3d0; }

    /* Form Sections */
    .custom-topup-form { display: flex; flex-direction: column; gap: 22px; }
    .section-label { font-size: 0.825rem; font-weight: 700; color: #334155; margin-bottom: 10px; display: block; }
    
    .btn-reset-mock { background: transparent; border: 1px solid #cbd5e1; border-radius: 6px; padding: 2px 8px; font-size: 0.725rem; font-weight: 600; color: #64748b; cursor: pointer; transition: all 0.15s; }
    .btn-reset-mock:hover { background-color: #f1f5f9; color: #0f172a; }

    /* Preset Grid */
    .preset-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; }
    .preset-btn { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 0; font-size: 0.85rem; font-weight: 700; color: #475569; cursor: pointer; transition: all 0.15s; }
    .preset-btn:hover { border-color: #cbd5e1; background-color: #ffffff; }
    .preset-btn.active { background-color: #ecfdf5; border-color: #059669; color: #059669; box-shadow: 0 0 0 1px #059669; }

    /* Custom Amount Input */
    .input-wrapper { position: relative; display: flex; align-items: center; }
    .currency-prefix { position: absolute; left: 14px; font-weight: 700; color: #059669; font-size: 1.1rem; pointer-events: none; }
    .custom-amount-input { width: 100%; height: 46px; border: 1px solid #e2e8f0; border-radius: 10px; padding: 0 14px 0 36px; font-size: 1rem; font-weight: 700; color: #0f172a; background: #f8fafc; outline: none; transition: all 0.15s; box-sizing: border-box; }
    .custom-amount-input:focus { border-color: #059669; background-color: #ffffff; box-shadow: 0 0 0 3px rgba(5, 150, 105, 0.1); }
    .error-msg { font-size: 0.78rem; color: #ef4444; margin-top: 4px; font-weight: 600; }

    /* Method Selector Grid */
    .method-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
    .method-card { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px 8px; display: flex; flex-direction: column; align-items: center; gap: 8px; cursor: pointer; transition: all 0.2s; text-align: center; }
    .method-card:hover { border-color: #cbd5e1; background-color: #ffffff; transform: translateY(-1px); }
    .method-card.active { background-color: #ecfdf5; border-color: #059669; box-shadow: 0 0 0 1px #059669; }
    .method-card.insufficient { border-color: #fca5a5; background-color: #fef2f2; }
    .method-card.insufficient.active { border-color: #ef4444; box-shadow: 0 0 0 1px #ef4444; }

    .method-icon-box { width: 36px; height: 36px; border-radius: 10px; background: #ffffff; border: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: center; color: #64748b; flex-shrink: 0; }
    .method-card.active .method-icon-box { background: #059669; border-color: #059669; color: #ffffff; }
    .method-card.insufficient.active .method-icon-box { background: #dc2626; border-color: #dc2626; color: #ffffff; }
    .method-icon-box svg { width: 20px; height: 20px; }

    .method-info { display: flex; flex-direction: column; gap: 2px; }
    .method-title { font-size: 0.8rem; font-weight: 700; color: #334155; }
    .method-card.active .method-title { color: #059669; }
    .method-card.insufficient.active .method-title { color: #dc2626; }
    .method-balance { font-size: 0.68rem; font-weight: 600; color: #64748b; }
    .text-danger { color: #dc2626 !important; font-weight: 700 !important; }

    /* Insufficient Balance Banner */
    .insufficient-banner {
      background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 12px 16px;
      display: flex; gap: 12px; align-items: flex-start; color: #991b1b; font-size: 0.8rem;
    }
    .banner-icon { font-size: 1.2rem; flex-shrink: 0; }
    .banner-text { display: flex; flex-direction: column; gap: 2px; line-height: 1.45; }
    .banner-text strong { font-weight: 700; color: #b91c1c; }

    /* Submit Button */
    .btn-emerald-submit {
      width: 100%;
      height: 48px;
      border: none;
      border-radius: 12px;
      background: linear-gradient(135deg, #059669 0%, #047857 100%);
      color: #ffffff;
      font-size: 0.95rem;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(5, 150, 105, 0.3);
      transition: all 0.2s;
    }
    .btn-emerald-submit:hover:not(:disabled) { transform: translateY(-1.5px); box-shadow: 0 6px 18px rgba(5, 150, 105, 0.4); }
    .btn-emerald-submit:disabled { opacity: 0.55; cursor: not-allowed; box-shadow: none; background: #94a3b8; }
    
    .btn-content { display: flex; align-items: center; justify-content: center; gap: 8px; }
    .btn-spinner { width: 18px; height: 18px; border: 2px solid rgba(255, 255, 255, 0.3); border-top-color: #ffffff; border-radius: 50%; animation: spin 0.7s linear infinite; }
  `]
})
export class TopUpComponent implements OnInit {
  topUpForm!: FormGroup;
  submitting = false;
  accountBalance = 0;
  selectedMethodId: 'BANK' | 'CARD' | 'MOMO' = 'BANK';

  // Level 2 Mock: External Linked Bank / Source balances
  mockSources: Record<'BANK' | 'CARD' | 'MOMO', PaymentSourceMock> = {
    BANK: { id: 'BANK', title: 'MB Bank', subtitle: 'Ngân hàng MB', balance: 5000000 },
    CARD: { id: 'CARD', title: 'Napas ATM Card', subtitle: 'Thẻ ATM Nội địa', balance: 2000000 },
    MOMO: { id: 'MOMO', title: 'MoMo Wallet', subtitle: 'Ví điện tử MoMo', balance: 1000000 }
  };

  presets = [
    { label: '100k', val: 100000 },
    { label: '500k', val: 500000 },
    { label: '1.000k', val: 1000000 },
    { label: '2.000k', val: 2000000 },
    { label: '5.000k', val: 5000000 }
  ];

  constructor(
    private fb: FormBuilder,
    private accountService: AccountService,
    private notification: NotificationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadMockBalances();
    this.loadAccountBalance();
  }

  get currentAmount(): number {
    return Number(this.topUpForm?.value?.amount) || 0;
  }

  get currentSource(): PaymentSourceMock {
    return this.mockSources[this.selectedMethodId];
  }

  private initForm(): void {
    this.topUpForm = this.fb.group({
      amount: [500000, [Validators.required, Validators.min(10000), Validators.max(1000000000)]],
      description: ['Nạp tiền vào ví PayGate']
    });
  }

  private loadMockBalances(): void {
    const saved = localStorage.getItem('paygate_mock_source_balances');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.BANK !== undefined) this.mockSources.BANK.balance = parsed.BANK;
        if (parsed.CARD !== undefined) this.mockSources.CARD.balance = parsed.CARD;
        if (parsed.MOMO !== undefined) this.mockSources.MOMO.balance = parsed.MOMO;
      } catch (e) {
        // use defaults
      }
    }
  }

  private saveMockBalances(): void {
    const toSave = {
      BANK: this.mockSources.BANK.balance,
      CARD: this.mockSources.CARD.balance,
      MOMO: this.mockSources.MOMO.balance
    };
    localStorage.setItem('paygate_mock_source_balances', JSON.stringify(toSave));
  }

  resetMockBalances(): void {
    this.mockSources.BANK.balance = 5000000;
    this.mockSources.CARD.balance = 2000000;
    this.mockSources.MOMO.balance = 1000000;
    this.saveMockBalances();
    this.notification.success('Đã khôi phục số dư Mock ban đầu (MB Bank 5M, Napas 2M, MoMo 1M)!');
  }

  private loadAccountBalance(): void {
    this.accountService.getAccountMe().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.accountBalance = res.data.balance;
        }
      }
    });
  }

  setPresetAmount(amount: number): void {
    this.topUpForm.patchValue({ amount });
  }

  setMethod(method: 'BANK' | 'CARD' | 'MOMO'): void {
    this.selectedMethodId = method;
  }

  isInsufficient(method: 'BANK' | 'CARD' | 'MOMO'): boolean {
    return this.currentAmount > this.mockSources[method].balance;
  }

  isCurrentSourceInsufficient(): boolean {
    return this.isInsufficient(this.selectedMethodId);
  }

  onSubmit(): void {
    if (this.topUpForm.invalid) return;

    const amount = this.currentAmount;
    const source = this.currentSource;

    // Check mock balance of selected source
    if (amount > source.balance) {
      const msg = `Số dư tài khoản ${source.title} (Mock) không đủ! Bạn muốn nạp ${amount.toLocaleString()} ₫ nhưng ${source.title} chỉ còn ${source.balance.toLocaleString()} ₫.`;
      this.notification.error(msg);
      return;
    }

    this.submitting = true;
    this.accountService.topUp(this.topUpForm.value).subscribe({
      next: (res) => {
        this.submitting = false;
        if (res.success) {
          // Deduct amount from mock source balance
          source.balance -= amount;
          this.saveMockBalances();

          this.notification.success(`Nạp thành công ${amount.toLocaleString()} ₫ từ ${source.title}! Số dư ${source.title} còn lại: ${source.balance.toLocaleString()} ₫.`);
          this.router.navigate(['/accounts/me']);
        }
      },
      error: (err) => {
        this.submitting = false;
        const msg = err.error?.message || 'Có lỗi xảy ra khi nạp tiền!';
        this.notification.error(msg);
      }
    });
  }
}
