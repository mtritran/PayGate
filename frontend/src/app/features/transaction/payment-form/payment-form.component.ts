import { Component, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TransactionService } from '../../../core/services/transaction.service';
import { AccountService } from '../../../core/services/account.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-payment-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    CurrencyPipe
  ],
  template: `
    <div class="paygate-form-page fade-in-up">
      <!-- Form Header -->
      <div class="form-header-group">
        <div class="header-tag">PAYGATE EXPRESS TRANSFER</div>
        <h2>Send Payment</h2>
        <p class="subtitle">Execute secure payments backed by double-entry ledger & real-time idempotency protection.</p>
      </div>

      <!-- Main Form Glass Card -->
      <div class="content-card form-card">
        <!-- Balance Strip Banner -->
        <div class="balance-strip">
          <div class="balance-strip-left">
            <svg class="wallet-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
              <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
              <path d="M18 12a2 2 0 0 0 0 4h4v-4z" />
            </svg>
            <span class="balance-label">Available Wallet Balance:</span>
          </div>
          <strong class="balance-amount">{{ myBalance | currency:'VND':'symbol':'1.0-0' }}</strong>
        </div>

        <!-- Custom Clean Payment Form -->
        <form [formGroup]="paymentForm" (ngSubmit)="openConfirmation()" class="custom-form">
          <!-- Destination Account ID -->
          <div class="form-group">
            <label class="form-label required">Destination Account ID (destAccountId)</label>
            <div class="input-wrapper">
              <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <input
                type="number"
                class="form-input"
                formControlName="destAccountId"
                placeholder="Enter destination account ID (e.g. 2)"
              >
            </div>
            <div class="form-error" *ngIf="paymentForm.get('destAccountId')?.touched && paymentForm.get('destAccountId')?.hasError('required')">
              Destination account ID is required
            </div>
          </div>

          <!-- Amount Field -->
          <div class="form-group">
            <label class="form-label required">Amount (VND)</label>
            <div class="input-wrapper">
              <span class="currency-prefix">₫</span>
              <input
                type="number"
                class="form-input has-prefix"
                formControlName="amount"
                placeholder="Enter amount (e.g. 100,000)"
                min="1000"
              >
            </div>
            <div class="form-error" *ngIf="paymentForm.get('amount')?.touched && paymentForm.get('amount')?.hasError('required')">
              Amount is required
            </div>
            <div class="form-error" *ngIf="paymentForm.get('amount')?.touched && paymentForm.get('amount')?.hasError('min')">
              Minimum payment amount is 1,000 VND
            </div>
          </div>

          <!-- Merchant ID (Optional) -->
          <div class="form-group">
            <label class="form-label">Merchant ID (Optional)</label>
            <div class="input-wrapper">
              <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              <input
                type="number"
                class="form-input"
                formControlName="merchantId"
                placeholder="Enter merchant ID if applicable (e.g. 1)"
              >
            </div>
          </div>

          <!-- Description Field -->
          <div class="form-group">
            <label class="form-label">Payment Note / Description</label>
            <div class="input-wrapper">
              <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="21" y1="10" x2="3" y2="10" />
                <line x1="21" y1="6" x2="3" y2="6" />
                <line x1="21" y1="14" x2="3" y2="14" />
                <line x1="18" y1="18" x2="3" y2="18" />
              </svg>
              <input
                type="text"
                class="form-input"
                formControlName="description"
                placeholder="Enter note for receiver"
              >
            </div>
          </div>

          <!-- Idempotency Key Field -->
          <div class="form-group">
            <label class="form-label required">Idempotency Protection Key (Auto-Generated)</label>
            <div class="input-wrapper">
              <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <input
                type="text"
                class="form-input font-mono readonly-input"
                formControlName="idempotencyKey"
                readonly
              >
              <button type="button" class="btn-refresh-key" (click)="generateIdempotencyKey()" title="Generate New Key">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M23 4v6h-6" />
                  <path d="M1 20v-6h6" />
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                </svg>
              </button>
            </div>
            <span class="input-hint">Prevents duplicate charges if network fails.</span>
          </div>

          <!-- Form Action Buttons -->
          <div class="form-actions">
            <button
              type="submit"
              class="btn-emerald-submit"
              [disabled]="paymentForm.invalid || submitting"
            >
              <span>Review Payment ↗</span>
            </button>
            <a class="btn-cancel-link" routerLink="/accounts/dashboard">Cancel</a>
          </div>
        </form>
      </div>

      <!-- Modern Glassmorphism Confirmation Dialog Modal -->
      <div *ngIf="showConfirmModal" class="confirm-modal-overlay fade-in">
        <div class="confirm-modal-box">
          <div class="modal-header">
            <div class="modal-icon-badge">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <div>
              <h3>Confirm Payment Transaction</h3>
              <p class="modal-desc">Review payment breakdown before double-entry ledger execution:</p>
            </div>
          </div>

          <div class="confirm-details">
            <div class="detail-row">
              <span class="detail-label">Destination Account:</span>
              <strong class="detail-val font-mono">PAY000000000{{ paymentForm.value.destAccountId }}</strong>
            </div>
            <div class="detail-row">
              <span class="detail-label">Transfer Amount:</span>
              <strong class="detail-val text-emerald">{{ paymentForm.value.amount | currency:'VND':'symbol':'1.0-0' }}</strong>
            </div>
            <div class="detail-row" *ngIf="paymentForm.value.merchantId">
              <span class="detail-label">Merchant Reference:</span>
              <strong class="detail-val">#{{ paymentForm.value.merchantId }}</strong>
            </div>
            <div class="detail-row">
              <span class="detail-label">Description Note:</span>
              <strong class="detail-val">{{ paymentForm.value.description || 'PayGate Payment' }}</strong>
            </div>
            <div class="detail-key-row">
              <span class="key-label">Idempotency Signature:</span>
              <code class="key-code">{{ paymentForm.value.idempotencyKey }}</code>
            </div>
          </div>

          <div class="modal-actions">
            <button class="btn-emerald-modal" (click)="executePayment()" [disabled]="submitting">
              <span *ngIf="!submitting">Confirm & Pay Now ↗</span>
              <span *ngIf="submitting" class="spinner-wrapper">
                <span class="btn-spinner"></span>
                Processing...
              </span>
            </button>
            <button class="btn-modal-cancel" (click)="closeConfirmation()" [disabled]="submitting">Back to edit</button>
          </div>
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
    .fade-in { animation: fadeInUp 0.25s ease-out forwards; }

    .paygate-form-page { display: flex; flex-direction: column; gap: 20px; max-width: 580px; margin: 0 auto; width: 100%; color: #0f172a; font-family: 'Inter', system-ui, sans-serif; }
    
    .header-tag { font-size: 0.7rem; font-weight: 800; color: #059669; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
    .form-header-group h2 { font-size: 1.6rem; font-weight: 800; margin: 0 0 4px 0; letter-spacing: -0.02em; }
    .subtitle { font-size: 0.875rem; color: #64748b; margin: 0; }
    
    .content-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 28px; box-shadow: 0 4px 20px -5px rgba(0,0,0,0.04); }
    
    /* Balance Strip */
    .balance-strip { background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); color: #047857; padding: 14px 18px; border-radius: 12px; font-size: 0.875rem; display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; border: 1px solid #a7f3d0; }
    .balance-strip-left { display: flex; align-items: center; gap: 8px; font-weight: 600; }
    .wallet-icon { width: 18px; height: 18px; color: #059669; }
    .balance-amount { font-size: 1.1rem; font-weight: 800; color: #059669; }
    
    /* Custom Inputs */
    .custom-form { display: flex; flex-direction: column; gap: 18px; }
    .form-group { display: flex; flex-direction: column; gap: 6px; }
    
    .form-label { font-size: 0.825rem; font-weight: 700; color: #334155; }
    .form-label.required::after { content: ' *'; color: #ef4444; }
    
    .input-wrapper { position: relative; display: flex; align-items: center; }
    .input-icon { position: absolute; left: 12px; width: 18px; height: 18px; color: #94a3b8; pointer-events: none; }
    .currency-prefix { position: absolute; left: 14px; font-weight: 700; color: #059669; font-size: 1.05rem; pointer-events: none; }
    
    .form-input {
      width: 100%;
      height: 44px;
      padding: 0 14px 0 40px;
      font-size: 0.9rem;
      font-weight: 600;
      color: #0f172a;
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      outline: none;
      transition: all 0.15s;
      box-sizing: border-box;
    }
    .form-input.has-prefix { padding-left: 36px; }
    .form-input:focus { border-color: #059669; background-color: #ffffff; box-shadow: 0 0 0 3px rgba(5, 150, 105, 0.1); }
    .form-input.readonly-input { background-color: #f1f5f9; color: #475569; padding-right: 44px; }
    .font-mono { font-family: monospace; font-size: 0.825rem; }

    .btn-refresh-key { position: absolute; right: 8px; width: 30px; height: 30px; border: none; background: #ffffff; border-radius: 6px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #059669; border: 1px solid #e2e8f0; }
    .btn-refresh-key:hover { background-color: #ecfdf5; }
    .btn-refresh-key svg { width: 14px; height: 14px; }

    .form-error { font-size: 0.78rem; color: #ef4444; font-weight: 600; }
    .input-hint { font-size: 0.75rem; color: #94a3b8; }

    /* Action Buttons */
    .form-actions { display: flex; align-items: center; gap: 14px; margin-top: 10px; }
    .btn-emerald-submit {
      flex: 1;
      height: 46px;
      border: none;
      border-radius: 10px;
      background: linear-gradient(135deg, #059669 0%, #047857 100%);
      color: #ffffff;
      font-size: 0.95rem;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(5, 150, 105, 0.3);
      transition: all 0.2s;
    }
    .btn-emerald-submit:hover:not(:disabled) { transform: translateY(-1.5px); box-shadow: 0 6px 18px rgba(5, 150, 105, 0.4); }
    .btn-emerald-submit:disabled { opacity: 0.6; cursor: not-allowed; box-shadow: none; }
    
    .btn-cancel-link { color: #64748b; font-weight: 600; font-size: 0.875rem; text-decoration: none; padding: 0 12px; }
    .btn-cancel-link:hover { color: #0f172a; text-decoration: underline; }

    /* Modal Overlay */
    .confirm-modal-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.65); backdrop-filter: blur(8px); display: flex; justify-content: center; align-items: center; z-index: 1000; padding: 20px; }
    .confirm-modal-box { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 20px; max-width: 480px; width: 100%; padding: 28px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); }
    
    .modal-header { display: flex; gap: 14px; align-items: flex-start; margin-bottom: 20px; }
    .modal-icon-badge { width: 44px; height: 44px; border-radius: 12px; background: #ecfdf5; color: #059669; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .modal-icon-badge svg { width: 24px; height: 24px; }
    .modal-header h3 { margin: 0 0 2px 0; font-size: 1.25rem; font-weight: 800; color: #0f172a; }
    .modal-desc { margin: 0; font-size: 0.825rem; color: #64748b; }

    .confirm-details { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; display: flex; flex-direction: column; gap: 10px; margin-bottom: 24px; }
    .detail-row { display: flex; justify-content: space-between; font-size: 0.875rem; }
    .detail-label { color: #64748b; font-weight: 500; }
    .detail-val { color: #0f172a; font-weight: 700; }
    .text-emerald { color: #059669; font-weight: 800; font-size: 1.05rem; }

    .detail-key-row { display: flex; flex-direction: column; gap: 4px; margin-top: 6px; padding-top: 8px; border-top: 1px dashed #cbd5e1; }
    .key-label { font-size: 0.75rem; color: #64748b; font-weight: 600; }
    .key-code { font-family: monospace; font-size: 0.78rem; font-weight: 700; color: #059669; background: #ffffff; padding: 4px 8px; border-radius: 6px; border: 1px solid #e2e8f0; word-break: break-all; }

    .modal-actions { display: flex; gap: 12px; }
    .btn-emerald-modal { flex: 1; height: 44px; border: none; border-radius: 10px; background: linear-gradient(135deg, #059669 0%, #047857 100%); color: #ffffff; font-weight: 700; font-size: 0.9rem; cursor: pointer; }
    .btn-modal-cancel { height: 44px; padding: 0 18px; border: 1px solid #cbd5e1; background: #ffffff; border-radius: 10px; font-weight: 600; color: #475569; cursor: pointer; }
    
    .spinner-wrapper { display: flex; align-items: center; justify-content: center; gap: 8px; }
    .btn-spinner { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.7s linear infinite; }
  `]
})
export class PaymentFormComponent implements OnInit {
  paymentForm!: FormGroup;
  myBalance = 0;
  submitting = false;
  showConfirmModal = false;

  constructor(
    private fb: FormBuilder,
    private transactionService: TransactionService,
    private accountService: AccountService,
    private notification: NotificationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadMyBalance();
    this.generateIdempotencyKey();
  }

  private initForm(): void {
    this.paymentForm = this.fb.group({
      destAccountId: ['', [Validators.required]],
      amount: ['', [Validators.required, Validators.min(1000)]],
      merchantId: [null],
      description: ['Thanh toán dịch vụ PayGate'],
      idempotencyKey: ['', [Validators.required]]
    });
  }

  private loadMyBalance(): void {
    this.accountService.getAccountMe().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.myBalance = res.data.balance;
        }
      }
    });
  }

  generateIdempotencyKey(): void {
    const uuid = 'IDEM-' + Math.random().toString(36).substring(2, 9).toUpperCase() + '-' + Date.now();
    this.paymentForm.patchValue({ idempotencyKey: uuid });
  }

  openConfirmation(): void {
    if (this.paymentForm.invalid) {
      this.paymentForm.markAllAsTouched();
      return;
    }
    this.showConfirmModal = true;
  }

  closeConfirmation(): void {
    this.showConfirmModal = false;
  }

  executePayment(): void {
    this.submitting = true;
    this.transactionService.processPayment(this.paymentForm.value).subscribe({
      next: (res) => {
        this.submitting = false;
        this.showConfirmModal = false;
        if (res.success && res.data) {
          this.notification.success(`Thanh toán thành công! Ref: ${res.data.transactionRef}`);
          this.router.navigate(['/transactions/history']);
        }
      },
      error: (err) => {
        this.submitting = false;
        this.showConfirmModal = false;
        const msg = err.error?.message || 'Thanh toán thất bại!';
        this.notification.error(msg);
      }
    });
  }
}
