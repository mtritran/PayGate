import { Component, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AccountService } from '../../../core/services/account.service';

@Component({
  selector: 'app-top-up',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    CurrencyPipe,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  template: `
    <div class="topup-page">
      <!-- Header Group -->
      <div class="page-header text-center">
        <h2>Top Up Wallet</h2>
        <p class="subtitle">Add funds to your PayGate wallet.</p>
      </div>

      <div class="form-container">
        <!-- Top Current & Projected Balance Box -->
        <div class="content-card balance-card">
          <div class="field-label">Current balance</div>
          <div class="balance-display">{{ accountBalance | currency:'VND':'symbol':'1.0-0' }}</div>
          <div class="after-topup-text">
            After top-up: <strong>{{ (accountBalance + currentAmount) | currency:'VND':'symbol':'1.0-0' }}</strong>
          </div>
        </div>

        <!-- Form Input Box -->
        <div class="content-card form-card mt-16">
          <form [formGroup]="topUpForm" (ngSubmit)="onSubmit()" class="custom-topup-form">
            <!-- Preset Amount Row -->
            <div class="form-section">
              <label class="section-label">Amount</label>
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

            <!-- Custom Amount Field -->
            <div class="form-section">
              <label class="section-label">Custom amount</label>
              <div class="input-wrapper">
                <input
                  type="number"
                  class="custom-amount-input"
                  formControlName="amount"
                  placeholder="Enter amount..."
                  min="10000"
                  max="1000000000">
              </div>
              <div class="error-msg" *ngIf="topUpForm.get('amount')?.hasError('min')">
                Minimum top up amount is 10,000 VND.
              </div>
            </div>

            <!-- Payment Method Selector -->
            <div class="form-section">
              <label class="section-label">Payment method</label>
              <div class="method-grid">
                <button
                  type="button"
                  class="method-btn"
                  [class.active]="selectedMethod === 'BANK'"
                  (click)="setMethod('BANK')">
                  Bank Transfer
                </button>
                <button
                  type="button"
                  class="method-btn"
                  [class.active]="selectedMethod === 'CARD'"
                  (click)="setMethod('CARD')">
                  Debit Card
                </button>
                <button
                  type="button"
                  class="method-btn"
                  [class.active]="selectedMethod === 'MOMO'"
                  (click)="setMethod('MOMO')">
                  MoMo Wallet
                </button>
              </div>
            </div>

            <!-- Submit Button -->
            <div class="submit-action mt-24">
              <button
                mat-raised-button
                class="btn-emerald-submit"
                type="submit"
                [disabled]="topUpForm.invalid || submitting">
                <mat-spinner diameter="20" *ngIf="submitting"></mat-spinner>
                <span *ngIf="!submitting">
                  <mat-icon class="btn-icon">add_circle_outline</mat-icon>
                  Top up {{ currentAmount | currency:'VND':'symbol':'1.0-0' }}
                </span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .topup-page { display: flex; flex-direction: column; gap: 20px; color: #0f172a; align-items: center; }
    .text-center { text-align: center; }
    .page-header h2 { font-size: 1.5rem; font-weight: 700; margin: 0 0 4px 0; }
    .subtitle { font-size: 0.875rem; color: #64748b; margin: 0; }

    .form-container { width: 100%; max-width: 520px; }
    .content-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.03); }
    .mt-16 { margin-top: 16px; }
    .mt-24 { margin-top: 24px; }

    /* Top Balance Display Box */
    .balance-card { text-align: left; }
    .field-label { font-size: 0.8rem; font-weight: 600; color: #475569; }
    .balance-display { font-size: 2rem; font-weight: 800; color: #0f172a; margin: 6px 0; }
    .after-topup-text { font-size: 0.825rem; color: #64748b; }
    .after-topup-text strong { color: #0f172a; font-weight: 700; }

    /* Form Section Styles */
    .custom-topup-form { display: flex; flex-direction: column; gap: 20px; }
    .section-label { font-size: 0.85rem; font-weight: 600; color: #0f172a; margin-bottom: 8px; display: block; }

    /* Preset Grid Buttons */
    .preset-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; }
    .preset-btn { background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 0; font-size: 0.825rem; font-weight: 600; color: #334155; cursor: pointer; transition: all 0.15s; }
    .preset-btn:hover { border-color: #cbd5e1; }
    .preset-btn.active { background-color: #ecfdf5; border-color: #059669; color: #059669; font-weight: 700; }

    /* Custom Input Wrapper */
    .input-wrapper { width: 100%; }
    .custom-amount-input { width: 100%; height: 42px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0 14px; font-size: 0.95rem; font-weight: 600; outline: none; box-sizing: border-box; }
    .custom-amount-input:focus { border-color: #059669; box-shadow: 0 0 0 3px rgba(5, 150, 105, 0.1); }
    .error-msg { font-size: 0.75rem; color: #ef4444; margin-top: 4px; }

    /* Method Selector Grid */
    .method-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
    .method-btn { background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 0; font-size: 0.825rem; font-weight: 600; color: #334155; cursor: pointer; text-align: center; transition: all 0.15s; }
    .method-btn:hover { border-color: #cbd5e1; }
    .method-btn.active { background-color: #ecfdf5; border-color: #059669; color: #059669; font-weight: 700; }

    /* Submit Button */
    .btn-emerald-submit { width: 100%; background-color: #059669 !important; color: #ffffff !important; border-radius: 8px; font-weight: 600; font-size: 0.95rem; height: 46px; display: flex; align-items: center; justify-content: center; gap: 8px; }
    .btn-icon { font-size: 20px; width: 20px; height: 20px; }
  `]
})
export class TopUpComponent implements OnInit {
  topUpForm!: FormGroup;
  submitting = false;
  accountBalance = 0;
  selectedMethod: 'BANK' | 'CARD' | 'MOMO' = 'BANK';

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
    private snackBar: MatSnackBar,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadAccountBalance();
  }

  get currentAmount(): number {
    return Number(this.topUpForm?.value?.amount) || 0;
  }

  private initForm(): void {
    this.topUpForm = this.fb.group({
      amount: [500000, [Validators.required, Validators.min(10000), Validators.max(1000000000)]],
      description: ['Nạp tiền vào ví PayGate']
    });
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
    this.selectedMethod = method;
  }

  onSubmit(): void {
    if (this.topUpForm.invalid) return;

    this.submitting = true;
    this.accountService.topUp(this.topUpForm.value).subscribe({
      next: (res) => {
        this.submitting = false;
        if (res.success) {
          this.snackBar.open('Nạp tiền vào ví thành công!', 'Close', { duration: 3000 });
          this.router.navigate(['/accounts/me']);
        }
      },
      error: (err) => {
        this.submitting = false;
        const msg = err.error?.message || 'Có lỗi xảy ra khi nạp tiền!';
        this.snackBar.open(msg, 'Close', { duration: 4000 });
      }
    });
  }
}
