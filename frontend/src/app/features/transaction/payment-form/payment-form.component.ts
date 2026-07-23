import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { TransactionService } from '../../../core/services/transaction.service';
import { AccountService } from '../../../core/services/account.service';
import { MerchantService } from '../../../core/services/merchant.service';
import { NotificationService } from '../../../core/services/notification.service';
import { AccountLookupResponse } from '../../../core/models/account.model';
import { Merchant } from '../../../core/models/merchant.model';

@Component({
  selector: 'app-payment-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    RouterLink,
    CurrencyPipe
  ],
  template: `
    <div class="paygate-form-wrapper">
      <!-- Main Form Container -->
      <div class="paygate-form-page fade-in-up">
        <!-- Form Header -->
        <div class="form-header-group">
          <div class="header-tag">PAYGATE EXPRESS TRANSFER</div>
          <h2>Send Payment</h2>
          <p class="subtitle">Real-time payment transfer backed by double-entry ledger & idempotency protection.</p>
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

          <!-- 2-Tab Navigation Switcher -->
          <div class="tab-switcher">
            <button
              type="button"
              class="tab-btn"
              [class.active]="activeTab === 'USER'"
              (click)="switchTab('USER')"
            >
              <svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <span>Personal Transfer (Cá nhân)</span>
            </button>

            <button
              type="button"
              class="tab-btn"
              [class.active]="activeTab === 'MERCHANT'"
              (click)="switchTab('MERCHANT')"
            >
              <svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              <span>Merchant Payment (Doanh nghiệp)</span>
            </button>
          </div>

          <!-- Custom Clean Payment Form -->
          <form [formGroup]="paymentForm" (ngSubmit)="openConfirmation()" class="custom-form">
            
            <!-- TAB 1: PERSONAL TRANSFER -->
            <div *ngIf="activeTab === 'USER'" class="tab-content fade-in-up">
              <div class="form-group">
                <label class="form-label required">Recipient Account Number / Username</label>
                <div class="input-wrapper">
                  <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  <input
                    type="text"
                    class="form-input"
                    placeholder="Enter Account Number (e.g. ACC...) or Username"
                    [(ngModel)]="lookupQuery"
                    [ngModelOptions]="{standalone: true}"
                    (input)="onLookupInput($event)"
                  >
                </div>
                <span class="input-hint">Type account number or username for instant real-time resolution.</span>
              </div>

              <!-- Live Resolution Card -->
              <div *ngIf="lookingUp" class="lookup-card loading-card">
                <div class="spinner-sm"></div>
                <span>Resolving recipient account...</span>
              </div>

              <div *ngIf="!lookingUp && recipientLookup" class="lookup-card success-card">
                <div class="verified-badge">✅ VERIFIED RECIPIENT</div>
                <div class="recipient-details">
                  <strong class="recipient-name">{{ recipientLookup.ownerName }}</strong>
                  <span class="recipient-meta font-mono">Account #{{ recipientLookup.accountNumber }} (ID: {{ recipientLookup.accountId }})</span>
                </div>
              </div>

              <div *ngIf="!lookingUp && lookupError" class="lookup-card error-card">
                ⚠️ {{ lookupError }}
              </div>
            </div>

            <!-- TAB 2: MERCHANT PAYMENT -->
            <div *ngIf="activeTab === 'MERCHANT'" class="tab-content fade-in-up">
              <div class="form-group">
                <label class="form-label required">Select Merchant Partner</label>
                <div class="select-wrapper">
                  <select
                    class="custom-select"
                    [(ngModel)]="selectedMerchantId"
                    [ngModelOptions]="{standalone: true}"
                    (change)="onMerchantSelect()"
                  >
                    <option [ngValue]="null">-- Select a Merchant Store --</option>
                    <option *ngFor="let m of activeMerchants" [ngValue]="m.id">
                      {{ m.merchantName }} ({{ m.merchantCode }})
                    </option>
                  </select>
                  <svg class="select-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
              </div>

              <!-- Selected Merchant Info Card -->
              <div *ngIf="selectedMerchant" class="lookup-card merchant-info-card">
                <div class="verified-badge">🏪 MERCHANT PARTNER</div>
                <div class="recipient-details">
                  <strong class="recipient-name">{{ selectedMerchant.merchantName }}</strong>
                  <span class="recipient-meta font-mono">Code: {{ selectedMerchant.merchantCode }} | Wallet Account: {{ selectedMerchant.accountNumber || 'Configured' }}</span>
                </div>
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
                [disabled]="paymentForm.invalid || !hasValidRecipient() || submitting"
              >
                <span>Review Payment ↗</span>
              </button>
              <a class="btn-cancel-link" routerLink="/accounts/dashboard">Cancel</a>
            </div>
          </form>
        </div>
      </div>

      <!-- Full Viewport Glassmorphism Confirmation Modal -->
      <div *ngIf="showConfirmModal" class="confirm-modal-overlay modal-fade-in">
        <div class="confirm-modal-box">
          <!-- Modal Header -->
          <div class="modal-header">
            <div class="modal-icon-badge">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <circle cx="12" cy="12" r="10" />
                <path d="M9 12l2 2 4-4" />
              </svg>
            </div>
            <div class="modal-header-text">
              <span class="modal-tag">PAYGATE TRANSACTION REVIEW</span>
              <h3>Confirm Payment</h3>
              <p class="modal-desc">Verify double-entry transfer details before execution:</p>
            </div>
            <button type="button" class="btn-close" (click)="closeConfirmation()">✕</button>
          </div>

          <!-- Receipt Details Card -->
          <div class="receipt-box">
            <div class="receipt-row">
              <span class="receipt-label">Recipient Name</span>
              <strong class="receipt-val font-large">{{ getRecipientDisplayName() }}</strong>
            </div>
            <div class="receipt-row">
              <span class="receipt-label">Destination Account</span>
              <strong class="receipt-val font-mono">{{ getRecipientAccountNum() }}</strong>
            </div>
            <div class="receipt-row">
              <span class="receipt-label">Transfer Amount</span>
              <strong class="receipt-val text-emerald">{{ paymentForm.value.amount | currency:'VND':'symbol':'1.0-0' }}</strong>
            </div>
            <div class="receipt-row" *ngIf="paymentForm.value.merchantId">
              <span class="receipt-label">Merchant Store</span>
              <strong class="receipt-val">#{{ paymentForm.value.merchantId }} - {{ selectedMerchant?.merchantName }}</strong>
            </div>
            <div class="receipt-row">
              <span class="receipt-label">Payment Note</span>
              <strong class="receipt-val">{{ paymentForm.value.description || 'PayGate Payment' }}</strong>
            </div>
            
            <div class="receipt-divider"></div>

            <div class="key-box">
              <span class="key-title">Idempotency Key Signature:</span>
              <code class="key-string font-mono">{{ paymentForm.value.idempotencyKey }}</code>
            </div>
          </div>

          <!-- Actions -->
          <div class="modal-actions-bar">
            <button type="button" class="btn-edit-outline" (click)="closeConfirmation()" [disabled]="submitting">
              Back to Edit
            </button>
            <button type="button" class="btn-confirm-emerald" (click)="executePayment()" [disabled]="submitting">
              <span *ngIf="!submitting">Confirm & Pay Now ↗</span>
              <span *ngIf="submitting" class="spinner-wrapper">
                <span class="btn-spinner"></span>
                Processing Payment...
              </span>
            </button>
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
    @keyframes modalFadeIn {
      from { opacity: 0; transform: scale(0.96); }
      to { opacity: 1; transform: scale(1); }
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .paygate-form-wrapper { position: relative; width: 100%; }
    .fade-in-up { animation: fadeInUp 0.4s ease-out forwards; }
    .modal-fade-in { animation: modalFadeIn 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards; }

    .paygate-form-page { display: flex; flex-direction: column; gap: 20px; max-width: 600px; margin: 0 auto; width: 100%; color: #0f172a; font-family: 'Inter', system-ui, sans-serif; }
    
    .header-tag { font-size: 0.7rem; font-weight: 800; color: #059669; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
    .form-header-group h2 { font-size: 1.6rem; font-weight: 800; margin: 0 0 4px 0; letter-spacing: -0.02em; }
    .subtitle { font-size: 0.875rem; color: #64748b; margin: 0; }
    
    .content-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 28px; box-shadow: 0 4px 20px -5px rgba(0,0,0,0.04); }
    
    /* Balance Strip */
    .balance-strip { background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); color: #047857; padding: 14px 18px; border-radius: 12px; font-size: 0.875rem; display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border: 1px solid #a7f3d0; }
    .balance-strip-left { display: flex; align-items: center; gap: 8px; font-weight: 600; }
    .wallet-icon { width: 18px; height: 18px; color: #059669; }
    .balance-amount { font-size: 1.1rem; font-weight: 800; color: #059669; }

    /* Tab Switcher */
    .tab-switcher { display: flex; gap: 8px; background: #f1f5f9; padding: 4px; border-radius: 12px; margin-bottom: 20px; border: 1px solid #e2e8f0; }
    .tab-btn { flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px; height: 40px; border: none; background: transparent; border-radius: 8px; font-size: 0.825rem; font-weight: 700; color: #64748b; cursor: pointer; transition: all 0.2s; }
    .tab-btn.active { background: #ffffff; color: #059669; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
    .tab-icon { width: 16px; height: 16px; }
    
    /* Custom Inputs */
    .custom-form { display: flex; flex-direction: column; gap: 18px; }
    .tab-content { display: flex; flex-direction: column; gap: 14px; }
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
    .font-mono { font-family: monospace; }

    /* Select Wrapper */
    .select-wrapper { position: relative; width: 100%; }
    .custom-select {
      width: 100%;
      height: 44px;
      padding: 0 36px 0 14px;
      font-size: 0.9rem;
      font-weight: 600;
      color: #0f172a;
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      outline: none;
      appearance: none;
      cursor: pointer;
    }
    .select-chevron { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); width: 16px; height: 16px; color: #94a3b8; pointer-events: none; }

    /* Lookup Card */
    .lookup-card { padding: 14px 16px; border-radius: 12px; font-size: 0.85rem; display: flex; flex-direction: column; gap: 4px; }
    .loading-card { background: #f8fafc; border: 1px solid #e2e8f0; color: #64748b; flex-direction: row; align-items: center; gap: 10px; }
    .spinner-sm { width: 16px; height: 16px; border: 2px solid #e2e8f0; border-top-color: #059669; border-radius: 50%; animation: spin 0.7s linear infinite; }
    
    .success-card, .merchant-info-card { background: #ecfdf5; border: 1px solid #a7f3d0; color: #047857; }
    .error-card { background: #fef2f2; border: 1px solid #fca5a5; color: #b91c1c; font-weight: 600; }
    
    .verified-badge { font-size: 0.68rem; font-weight: 800; letter-spacing: 0.05em; color: #059669; }
    .recipient-name { font-size: 1.05rem; font-weight: 800; color: #065f46; }
    .recipient-meta { font-size: 0.78rem; color: #047857; }

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

    /* Confirmation Modal */
    .confirm-modal-overlay {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      width: 100vw; height: 100vh;
      background: rgba(15, 23, 42, 0.65);
      backdrop-filter: blur(10px);
      display: flex; justify-content: center; align-items: center;
      z-index: 99999; padding: 20px; box-sizing: border-box;
    }

    .confirm-modal-box {
      background: #ffffff; border: 1px solid rgba(226, 232, 240, 0.9);
      border-radius: 20px; max-width: 480px; width: 100%; padding: 28px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.3);
      font-family: 'Inter', system-ui, sans-serif;
    }
    
    .modal-header { display: flex; gap: 14px; align-items: flex-start; margin-bottom: 22px; position: relative; }
    .modal-icon-badge { width: 44px; height: 44px; border-radius: 12px; background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); color: #059669; display: flex; align-items: center; justify-content: center; flex-shrink: 0; border: 1px solid #a7f3d0; }
    .modal-icon-badge svg { width: 24px; height: 24px; }
    
    .modal-header-text { flex: 1; }
    .modal-tag { font-size: 0.68rem; font-weight: 800; color: #059669; letter-spacing: 0.05em; display: block; margin-bottom: 2px; }
    .modal-header h3 { margin: 0 0 2px 0; font-size: 1.3rem; font-weight: 800; color: #0f172a; letter-spacing: -0.02em; }
    .modal-desc { margin: 0; font-size: 0.825rem; color: #64748b; }
    
    .btn-close { background: transparent; border: none; font-size: 1.1rem; color: #94a3b8; cursor: pointer; padding: 4px; border-radius: 6px; }
    .btn-close:hover { color: #0f172a; background-color: #f1f5f9; }

    /* Receipt Card */
    .receipt-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 20px; display: flex; flex-direction: column; gap: 12px; margin-bottom: 24px; }
    .receipt-row { display: flex; justify-content: space-between; align-items: center; font-size: 0.875rem; }
    .receipt-label { color: #64748b; font-weight: 500; }
    .receipt-val { color: #0f172a; font-weight: 700; }
    .font-large { font-size: 1rem; color: #059669; }
    .text-emerald { color: #059669; font-weight: 800; font-size: 1.15rem; }

    .receipt-divider { height: 1px; border-top: 1px dashed #cbd5e1; margin: 4px 0; }

    .key-box { display: flex; flex-direction: column; gap: 4px; }
    .key-title { font-size: 0.72rem; color: #64748b; font-weight: 700; letter-spacing: 0.03em; }
    .key-string { font-family: monospace; font-size: 0.78rem; font-weight: 700; color: #059669; background: #ffffff; padding: 6px 10px; border-radius: 8px; border: 1px solid #e2e8f0; word-break: break-all; }

    /* Actions Bar */
    .modal-actions-bar { display: flex; gap: 12px; align-items: center; }
    
    .btn-edit-outline {
      height: 44px; padding: 0 18px; border: 1px solid #cbd5e1; background: #ffffff; border-radius: 10px; font-weight: 600; font-size: 0.875rem; color: #475569; cursor: pointer; transition: all 0.15s;
    }
    .btn-edit-outline:hover:not(:disabled) { background: #f8fafc; color: #0f172a; border-color: #94a3b8; }

    .btn-confirm-emerald {
      flex: 1; height: 44px; border: none; border-radius: 10px; background: linear-gradient(135deg, #059669 0%, #047857 100%); color: #ffffff; font-weight: 700; font-size: 0.9rem; cursor: pointer; box-shadow: 0 4px 14px rgba(5, 150, 105, 0.3); transition: all 0.2s;
    }
    .btn-confirm-emerald:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(5, 150, 105, 0.4); }
    .btn-confirm-emerald:disabled { opacity: 0.6; cursor: not-allowed; box-shadow: none; }
    
    .spinner-wrapper { display: flex; align-items: center; justify-content: center; gap: 8px; }
    .btn-spinner { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.7s linear infinite; }
  `]
})
export class PaymentFormComponent implements OnInit, OnDestroy {
  paymentForm!: FormGroup;
  activeTab: 'USER' | 'MERCHANT' = 'USER';
  myBalance = 0;
  submitting = false;
  showConfirmModal = false;

  // Real-time lookup state for USER tab
  lookupQuery = '';
  lookingUp = false;
  recipientLookup: AccountLookupResponse | null = null;
  lookupError: string | null = null;
  private lookupSubject = new Subject<string>();
  private lookupSub!: Subscription;

  // Merchant state for MERCHANT tab
  activeMerchants: Merchant[] = [];
  selectedMerchantId: number | null = null;
  selectedMerchant: Merchant | null = null;

  constructor(
    private fb: FormBuilder,
    private transactionService: TransactionService,
    private accountService: AccountService,
    private merchantService: MerchantService,
    private notification: NotificationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadMyBalance();
    this.generateIdempotencyKey();
    this.setupLookupDebounce();
    this.loadActiveMerchants();
  }

  ngOnDestroy(): void {
    if (this.lookupSub) {
      this.lookupSub.unsubscribe();
    }
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

  private loadActiveMerchants(): void {
    this.merchantService.getActiveMerchants().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.activeMerchants = res.data;
        }
      }
    });
  }

  private setupLookupDebounce(): void {
    this.lookupSub = this.lookupSubject.pipe(
      debounceTime(350),
      distinctUntilChanged()
    ).subscribe(query => {
      this.performAccountLookup(query);
    });
  }

  onLookupInput(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    if (!val || val.trim().length < 2) {
      this.recipientLookup = null;
      this.lookupError = null;
      this.paymentForm.patchValue({ destAccountId: '' });
      return;
    }
    this.lookingUp = true;
    this.lookupSubject.next(val.trim());
  }

  private performAccountLookup(query: string): void {
    this.accountService.lookupAccount(query).subscribe({
      next: (res) => {
        this.lookingUp = false;
        if (res.success && res.data) {
          this.recipientLookup = res.data;
          this.lookupError = null;
          this.paymentForm.patchValue({
            destAccountId: res.data.accountId,
            merchantId: res.data.ownerType === 'MERCHANT' ? res.data.accountId : null
          });
        }
      },
      error: (err) => {
        this.lookingUp = false;
        this.recipientLookup = null;
        this.lookupError = err.error?.message || 'Không tìm thấy tài khoản nhận tiền';
        this.paymentForm.patchValue({ destAccountId: '' });
      }
    });
  }

  switchTab(tab: 'USER' | 'MERCHANT'): void {
    this.activeTab = tab;
    this.paymentForm.patchValue({ destAccountId: '', merchantId: null });
    this.recipientLookup = null;
    this.lookupError = null;
    this.selectedMerchantId = null;
    this.selectedMerchant = null;

    if (tab === 'USER' && this.lookupQuery.trim().length >= 2) {
      this.performAccountLookup(this.lookupQuery.trim());
    }
  }

  onMerchantSelect(): void {
    if (!this.selectedMerchantId) {
      this.selectedMerchant = null;
      this.paymentForm.patchValue({ destAccountId: '', merchantId: null });
      return;
    }

    const found = this.activeMerchants.find(m => m.id === this.selectedMerchantId);
    if (found) {
      this.selectedMerchant = found;
      this.lookingUp = true;
      // Look up merchant's wallet account number
      this.accountService.lookupAccount(found.merchantCode).subscribe({
        next: (res) => {
          this.lookingUp = false;
          if (res.success && res.data) {
            this.paymentForm.patchValue({
              destAccountId: res.data.accountId,
              merchantId: found.id
            });
          }
        },
        error: () => {
          this.lookingUp = false;
          // Fallback: If code lookup fails, try account lookup by ID or standard dest
          this.paymentForm.patchValue({
            destAccountId: found.id,
            merchantId: found.id
          });
        }
      });
    }
  }

  hasValidRecipient(): boolean {
    return !!this.paymentForm.value.destAccountId;
  }

  getRecipientDisplayName(): string {
    if (this.activeTab === 'USER') {
      return this.recipientLookup ? this.recipientLookup.ownerName : 'Bên nhận';
    }
    return this.selectedMerchant ? this.selectedMerchant.merchantName : 'Doanh nghiệp';
  }

  getRecipientAccountNum(): string {
    if (this.activeTab === 'USER' && this.recipientLookup) {
      return this.recipientLookup.accountNumber;
    }
    if (this.activeTab === 'MERCHANT' && this.selectedMerchant) {
      return this.selectedMerchant.merchantCode;
    }
    return `ACC-${this.paymentForm.value.destAccountId}`;
  }

  generateIdempotencyKey(): void {
    const uuid = 'IDEM-' + Math.random().toString(36).substring(2, 9).toUpperCase() + '-' + Date.now();
    this.paymentForm.patchValue({ idempotencyKey: uuid });
  }

  openConfirmation(): void {
    if (this.paymentForm.invalid || !this.hasValidRecipient()) {
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
          this.notification.success(`Thanh toán thành công! Mã GD: ${res.data.transactionRef}`);
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
