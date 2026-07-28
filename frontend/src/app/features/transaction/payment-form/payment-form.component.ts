import { Component, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { TransactionService } from '../../../core/services/transaction.service';
import { AccountService } from '../../../core/services/account.service';
import { NotificationService } from '../../../core/services/notification.service';
import { BeneficiaryService, BeneficiaryResponse } from '../../../core/services/beneficiary.service';
import { AccountLookupResponse } from '../../../core/models/account.model';
import { PaygateQrService } from '../../../core/services/paygate-qr.service';

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
          <div class="header-tag">{{ acceptMode ? 'PAYGATE QUICK ACCEPT' : (activeTab === 'receive' ? 'PAYGATE QUICK RECEIVE' : 'PAYGATE EXPRESS TRANSFER') }}</div>
          <h2>{{ acceptMode ? 'Confirm Transfer' : (activeTab === 'receive' ? 'Receive Money via QR Code' : 'Send Payment') }}</h2>
          <p class="subtitle" *ngIf="!acceptMode && activeTab === 'send'">Secure money transfer to any User or Merchant account using double-entry ledger & idempotency protection.</p>
          <p class="subtitle" *ngIf="!acceptMode && activeTab === 'receive'">Share the QR code below. Others scan with their phone camera to open the payment page for you.</p>
          <p class="subtitle" *ngIf="acceptMode">The recipient has created a payment request. Review the details and press Accept to transfer immediately.</p>
        </div>

        <!-- Tab Switcher: Send vs Receive (hidden in accept mode) -->
        <div class="tab-switcher" *ngIf="!acceptMode">
          <button type="button" class="tab-btn" [class.active]="activeTab === 'send'" (click)="switchTab('send')">
            <!-- Send icon -->
            <svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
            <span class="tab-label-block">
              <strong>Send Money</strong>
              <small>Transfer to another account</small>
            </span>
          </button>
          <button type="button" class="tab-btn" [class.active]="activeTab === 'receive'" (click)="switchTab('receive')">
            <!-- QR/Inbox icon -->
            <svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
              <path d="M14 14h3v3m0 4h4m-4-4v4m-7 0h3"/>
            </svg>
            <span class="tab-label-block">
              <strong>Nhận qua QR</strong>
              <small>Generate QR for others to scan</small>
            </span>
          </button>
        </div>

        <!-- ACCEPT MODE — 1-Click Confirm Card -->
        <div class="content-card accept-card" *ngIf="acceptMode">
          <!-- Balance Strip -->
          <div class="balance-strip">
            <div class="balance-strip-left">
              <svg class="wallet-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
                <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
                <path d="M18 12a2 2 0 0 0 0 4h4v-4z" />
              </svg>
              <span class="balance-label">Available Balance:</span>
            </div>
            <strong class="balance-amount">{{ myBalance | currency:'VND':'symbol':'1.0-0' }}</strong>
          </div>

          <!-- Loading receiver -->
          <div *ngIf="lookingUp" class="accept-loading">
            <div class="spinner-sm"></div>
            <span>Verifying recipient...</span>
          </div>

          <!-- Receiver resolved OK -->
          <ng-container *ngIf="!lookingUp && recipientLookup">
            <div class="accept-receiver">
              <div class="accept-avatar">{{ getInitials(recipientLookup.ownerName) }}</div>
              <div class="accept-receiver-info">
                <span class="verified-badge">
                  <span *ngIf="recipientLookup.ownerType === 'MERCHANT'">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> MERCHANT
                  </span>
                  <span *ngIf="recipientLookup.ownerType === 'USER'">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> PERSONAL
                  </span>
                  <span *ngIf="recipientLookup.ownerType === 'SYSTEM'">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> SYSTEM
                  </span>
                </span>
                <strong class="accept-receiver-name">{{ recipientLookup.ownerName }}</strong>
                <span class="accept-receiver-acc font-mono">{{ recipientLookup.accountNumber }}</span>
              </div>
            </div>

            <div class="accept-amount-block">
              <span class="accept-amount-label">Số tiền chuyển</span>
              <strong class="accept-amount-value">{{ paymentForm.value.amount | currency:'VND':'symbol':'1.0-0' }}</strong>
            </div>

            <div class="accept-note-row" *ngIf="paymentForm.value.description">
              <span class="accept-note-label">Lời nhắn:</span>
              <span class="accept-note-val">{{ paymentForm.value.description }}</span>
            </div>

            <div class="accept-warning" *ngIf="isSelfTransfer">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              Cannot transfer to yourself. This is your own account.
            </div>

            <div class="accept-warning" *ngIf="!isSelfTransfer && (!paymentForm.value.amount || paymentForm.value.amount < 1000)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              Invalid amount (minimum 1,000 VND).
            </div>

            <div class="accept-actions">
              <button type="button" class="btn-cancel-link" (click)="exitAcceptMode()" [disabled]="submitting">
                Chỉnh sửa
              </button>
              <button
                type="button"
                class="btn-emerald-submit btn-accept-large"
                (click)="acceptAndPay()"
                [disabled]="!canAcceptPay"
              >
                <span *ngIf="!submitting">✓ Accept & Pay Now</span>
                <span *ngIf="submitting" class="spinner-wrapper">
                  <span class="btn-spinner"></span>
                  Processing...
                </span>
              </button>
            </div>
          </ng-container>

          <!-- Receiver lookup failed -->
          <div *ngIf="!lookingUp && lookupError" class="lookup-card error-card">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
            {{ lookupError }}
            <button type="button" class="btn-cancel-link" (click)="exitAcceptMode()" style="margin-top: 12px; display: inline-block;">
              Về form nhập tay
            </button>
          </div>
        </div>

        <!-- Main Form Glass Card -->
        <div class="content-card form-card" *ngIf="!acceptMode && activeTab === 'send'">
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
            
            <!-- Saved Beneficiaries Quick Contact Selector -->
            <div class="form-group" *ngIf="beneficiaries.length > 0">
              <label class="form-label">QUICK CONTACTS</label>
              <div class="beneficiaries-chips-bar">
                <button
                  type="button"
                  *ngFor="let b of beneficiaries"
                  class="beneficiary-chip"
                  [class.active]="accountNumberInput === b.accountNumber"
                  (click)="selectBeneficiary(b)"
                >
                  <span class="chip-avatar">{{ getInitials(b.accountHolderName) }}</span>
                  <div class="chip-info">
                    <span class="chip-name">{{ b.nickName || b.accountHolderName }}</span>
                    <span class="chip-acc font-mono">{{ b.accountNumber }}</span>
                  </div>
                </button>
              </div>
            </div>

            <!-- Recipient Account Number Field -->
            <div class="form-group">
              <label class="form-label required">Recipient Account Number <span class="required">*</span></label>

              <div class="input-wrapper">
                <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <input
                  type="text"
                  class="form-input"
                  placeholder="Enter account number (e.g. AC00000005)..."
                  [(ngModel)]="accountNumberInput"
                  [ngModelOptions]="{standalone: true}"
                  (input)="onInputChanged($event)"
                  (blur)="onInputBlur()"
                  (keyup.enter)="onInputBlur()"
                >
              </div>
            </div>

            <!-- Live Recipient Resolution Card (Visible ONLY when user finishes inputting) -->
            <div *ngIf="lookingUp" class="lookup-card loading-card">
              <div class="spinner-sm"></div>
              <span>Verifying account number...</span>
            </div>

            <div *ngIf="!lookingUp && recipientLookup" class="lookup-card success-card">
              <div class="verified-badge">
                <span *ngIf="recipientLookup.ownerType === 'MERCHANT'">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> MERCHANT ACCOUNT
                </span>
                <span *ngIf="recipientLookup.ownerType === 'USER'">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> PERSONAL ACCOUNT
                </span>
                <span *ngIf="recipientLookup.ownerType === 'SYSTEM'">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> SYSTEM ACCOUNT
                </span>
              </div>
              <div class="recipient-details">
                <strong class="recipient-name">{{ recipientLookup.ownerName }}</strong>
              </div>
            </div>

            <div *ngIf="!lookingUp && lookupError" class="lookup-card error-card">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
              {{ lookupError }}
            </div>

            <!-- Amount Field -->
            <div class="form-group">
              <label class="form-label required">Payment Amount (VND)</label>
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
                  class="form-input readonly-input"
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
                [disabled]="paymentForm.invalid || !recipientLookup || submitting"
              >
                <span>Review Payment ↗</span>
              </button>
              <a class="btn-cancel-link" routerLink="/accounts/dashboard">Cancel</a>
            </div>
          </form>
        </div>

        <!-- RECEIVE TAB — My PayGate QR (large, primary content) -->
        <div class="content-card receive-card" *ngIf="myAccountNumber && !acceptMode && activeTab === 'receive'">
          <div class="receive-header-row">
            <div>
              <div class="receive-title-tag">
                <span class="qr-verified-pill">VERIFIED</span>
                <span class="receive-brand-name">PayGate <i>Wallet</i></span>
              </div>
              <h3 class="receive-title">Your Receive QR Code</h3>
              <p class="receive-desc">Others scan this QR code with their phone camera to open the payment page for you.</p>
            </div>
          </div>

          <div class="receive-body">
            <!-- QR Canvas with logo overlay -->
            <div class="receive-qr-wrap">
              <canvas #qrCanvas class="receive-qr-canvas" width="300" height="300"></canvas>
              <div class="receive-qr-owner">
                <strong class="qr-acc-name">{{ myAccountName || 'PayGate User' }}</strong>
                <span class="qr-acc-number font-mono">{{ myAccountNumber }}</span>
              </div>
            </div>

            <!-- Config + Actions -->
            <div class="receive-config">
              <div class="form-group">
                <label class="form-label">REQUESTED AMOUNT (VND) — OPTIONAL</label>
                <input
                  type="number"
                  min="0"
                  class="custom-input"
                  placeholder="Leave blank if not yet determined (e.g., 100000)"
                  [(ngModel)]="myQrCustomAmount"
                  [ngModelOptions]="{standalone: true}"
                  (ngModelChange)="updateMyQr()"
                />
              </div>

              <div class="form-group">
                <label class="form-label">MESSAGE (OPTIONAL)</label>
                <input
                  type="text"
                  maxlength="120"
                  class="custom-input"
                  placeholder="e.g., Coffee money, Lunch money..."
                  [(ngModel)]="myQrCustomNote"
                  [ngModelOptions]="{standalone: true}"
                  (ngModelChange)="updateMyQr()"
                />
              </div>

              <div class="qr-live-badge" *ngIf="myQrCustomAmount > 0">
                <span class="dot-live"></span>
                Requesting: <strong>{{ myQrCustomAmount | currency:'VND':'symbol':'1.0-0' }}</strong>
              </div>

              <div class="receive-link-row">
                <input type="text" readonly class="receive-link-input font-mono" [value]="getMyPaymentLink()" />
                <button type="button" class="btn-copy" (click)="copyPaymentLink()">
                  <!-- Copy icon -->
                  <svg *ngIf="!linkCopied" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                    <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                  </svg>
                  <span *ngIf="!linkCopied">Copy</span>
                  <span *ngIf="linkCopied">✓ Copied</span>
                </button>
              </div>

              <div class="receive-actions">
                <button type="button" class="btn-share" (click)="sharePaymentLink()">
                  <!-- Share icon -->
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                    <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                  </svg> Chia sẻ link
                </button>
                <button type="button" class="btn-download" (click)="downloadQr()">
                  <!-- Download icon -->
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                  </svg> Download QR
                </button>
              </div>

              <div class="receive-note">
                <!-- Lightbulb icon -->
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" style="flex-shrink:0;color:#d97706">
                  <path d="M9 21h6m-6-3h6M12 3a6 6 0 016 6c0 2.21-1.19 4.15-3 5.19V17a1 1 0 01-1 1h-4a1 1 0 01-1-1v-2.81C7.19 13.15 6 11.21 6 9a6 6 0 016-6z"/>
                </svg>
                Recipient opens link/scans QR → sees confirmation page with pre-filled info → presses <strong>1 button Accept</strong> to complete transfer.
              </div>
            </div>
          </div>
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
              <strong class="receipt-val font-large">{{ recipientLookup?.ownerName }}</strong>
            </div>
            <div class="receipt-row">
              <span class="receipt-label">Destination Account Number</span>
              <strong class="receipt-val">{{ recipientLookup?.accountNumber }}</strong>
            </div>
            <div class="receipt-row">
              <span class="receipt-label">Transfer Amount</span>
              <strong class="receipt-val text-emerald">{{ paymentForm.value.amount | currency:'VND':'symbol':'1.0-0' }}</strong>
            </div>
            <div class="receipt-row" *ngIf="recipientLookup?.merchantId">
              <span class="receipt-label">Merchant Reference ID</span>
              <strong class="receipt-val">#{{ recipientLookup?.merchantId }}</strong>
            </div>
            <div class="receipt-row">
              <span class="receipt-label">Payment Note</span>
              <strong class="receipt-val">{{ paymentForm.value.description || 'PayGate Payment' }}</strong>
            </div>
            
            <div class="receipt-divider"></div>

            <div class="key-box">
              <span class="key-title">Idempotency Key Signature:</span>
              <code class="key-string">{{ paymentForm.value.idempotencyKey }}</code>
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

    .paygate-form-wrapper,
    .paygate-form-wrapper * {
      font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
    }

    .paygate-form-wrapper { position: relative; width: 100%; }
    .fade-in-up { animation: fadeInUp 0.4s ease-out forwards; }
    .modal-fade-in { animation: modalFadeIn 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards; }

    .paygate-form-page { display: flex; flex-direction: column; gap: 28px; max-width: 1180px; margin: 0 auto; width: 100%; color: #0f172a; padding: 0; }
    
    .header-tag { font-size: 0.72rem; font-weight: 800; color: #059669; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 6px; }
    .form-header-group h2 { font-size: 2rem; font-weight: 800; margin: 0 0 6px 0; letter-spacing: -0.025em; }
    .subtitle { font-size: 0.95rem; color: #64748b; margin: 0; line-height: 1.6; }
    
    .content-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 24px; padding: 44px 52px; box-shadow: 0 10px 40px -10px rgba(0,0,0,0.06), 0 2px 10px -2px rgba(0,0,0,0.03); }
    
    /* Balance Strip */
    .balance-strip { background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); color: #047857; padding: 14px 18px; border-radius: 12px; font-size: 0.875rem; display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; border: 1px solid #a7f3d0; }
    .balance-strip-left { display: flex; align-items: center; gap: 8px; font-weight: 600; }
    .wallet-icon { width: 18px; height: 18px; color: #059669; }
    .balance-amount { font-size: 1.1rem; font-weight: 800; color: #059669; }

    /* Custom Inputs */
    .custom-form { display: flex; flex-direction: column; gap: 18px; }
    .form-group { display: flex; flex-direction: column; gap: 6px; }

    /* Modals */
    .paygate-qr-modal {
      background: #ffffff; border-radius: 24px; width: 100%; max-width: 520px;
      overflow: hidden; box-shadow: 0 25px 70px rgba(0,0,0,0.35); border: 1px solid rgba(255,255,255,0.2);
    }
    .wide-qr-modal { max-width: 680px; }

    .modal-header-vqr {
      background: linear-gradient(135deg, #064e3b 0%, #047857 100%);
      padding: 20px 24px; color: #ffffff; display: flex; justify-content: space-between; align-items: center;
    }
    .modal-badge-pill {
      font-size: 0.7rem; font-weight: 800; background: rgba(255,255,255,0.2); padding: 3px 10px; border-radius: 12px;
      letter-spacing: 0.05em; display: inline-block; margin-bottom: 4px;
    }
    .modal-title-group h3 { margin: 0; font-size: 1.35rem; font-weight: 800; color: #ffffff; }
    .btn-close-light { background: rgba(255,255,255,0.15); border: none; width: 32px; height: 32px; border-radius: 50%; color: #fff; font-size: 14px; font-weight: 800; cursor: pointer; }
    .btn-close-light:hover { background: rgba(255,255,255,0.3); }

    .modal-body-pad { padding: 24px; display: flex; flex-direction: column; gap: 14px; }
    .modal-hint-text { font-size: 0.85rem; color: #475569; margin: 0; }
    .qr-textarea {
      width: 100%; border: 1px solid #cbd5e1; border-radius: 12px; padding: 10px 14px;
      font-size: 0.82rem; color: #0f172a; outline: none; background: #f8fafc; resize: none; box-sizing: border-box;
    }
    .qr-textarea:focus { border-color: #059669; background: #ffffff; }

    .sample-qr-section { display: flex; flex-direction: column; gap: 8px; }
    .sample-title { font-size: 0.7rem; font-weight: 800; color: #64748b; letter-spacing: 0.05em; }
    .sample-grid { display: flex; flex-direction: column; gap: 8px; }
    .sample-qr-card {
      display: flex; align-items: center; gap: 12px; padding: 10px 14px;
      background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px;
      cursor: pointer; transition: all 0.15s; text-align: left; width: 100%;
    }
    .sample-qr-card:hover { border-color: #059669; background: #ecfdf5; }
    .sample-avatar {
      width: 38px; height: 38px; border-radius: 10px; background: #059669; color: #ffffff;
      font-size: 0.78rem; font-weight: 900; display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .sample-detail { display: flex; flex-direction: column; gap: 2px; }
    .s-name { font-size: 0.85rem; color: #0f172a; }
    .s-acc { font-size: 0.75rem; color: #059669; font-weight: 700; }
    .s-note { font-size: 0.72rem; color: #64748b; }

    .modal-footer-pad {
      padding: 16px 24px; background: #f8fafc; border-top: 1px solid #e2e8f0;
      display: flex; justify-content: flex-end; gap: 12px;
    }
    .btn-cancel-light { background: #ffffff; border: 1px solid #cbd5e1; border-radius: 12px; padding: 8px 18px; font-size: 0.85rem; font-weight: 700; color: #475569; cursor: pointer; }
    .btn-submit-emerald { background: linear-gradient(135deg, #059669 0%, #047857 100%); border: none; border-radius: 12px; padding: 8px 20px; font-size: 0.88rem; font-weight: 800; color: #ffffff; cursor: pointer; box-shadow: 0 3px 10px rgba(5,150,105,0.3); }

    /* Layout My QR Modal */
    .grid-qr-layout { display: grid; grid-template-columns: 220px 1fr; gap: 24px; }
    .my-qr-display-box {
      background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 18px; padding: 16px;
      display: flex; flex-direction: column; align-items: center; gap: 12px; text-align: center;
    }
    .paygate-brand-banner { display: flex; flex-direction: column; align-items: center; }
    .pg-logo-bold { font-size: 1.1rem; font-weight: 900; color: #059669; }
    .pg-logo-bold i { font-style: italic; color: #1d4ed8; }
    .pg-verified { font-size: 0.65rem; font-weight: 800; background: #dcfce7; color: #15803d; padding: 2px 8px; border-radius: 10px; }

    .my-qr-img-frame { width: 170px; height: 170px; background: #ffffff; border: 2px solid #a7f3d0; border-radius: 16px; padding: 6px; box-shadow: 0 6px 18px rgba(5,150,105,0.15); }
    .my-qr-img { width: 100%; height: 100%; object-fit: contain; }
    .my-acc-badge { display: flex; flex-direction: column; gap: 2px; }
    .acc-title { font-size: 0.85rem; font-weight: 800; color: #0f172a; }
    .acc-code { font-size: 0.95rem; font-weight: 900; color: #059669; }

    .my-qr-config-box { display: flex; flex-direction: column; gap: 10px; }
    .modal-input-sm { width: 100%; height: 38px; border: 1px solid #cbd5e1; border-radius: 10px; padding: 0 12px; font-size: 0.85rem; color: #0f172a; outline: none; background: #f8fafc; box-sizing: border-box; }
    .modal-input-sm:focus { border-color: #059669; background: #ffffff; }

    .copy-actions-group { display: flex; flex-direction: column; gap: 8px; }
    .btn-copy-chip-full {
      width: 100%; height: 38px; background: #059669; color: #ffffff; border: none; border-radius: 10px;
      font-size: 0.8rem; font-weight: 800; cursor: pointer; transition: background 0.15s;
    }
    .btn-copy-chip-full:hover { background: #047857; }
    .btn-copy-chip-full.btn-outline { background: #ffffff; border: 1px solid #059669; color: #059669; }
    .btn-copy-chip-full.btn-outline:hover { background: #ecfdf5; }

    .beneficiaries-chips-bar {
      display: flex; gap: 8px; overflow-x: auto; padding-bottom: 6px; scrollbar-width: none;
    }
    .beneficiaries-chips-bar::-webkit-scrollbar { display: none; }
    .beneficiary-chip {
      display: flex; align-items: center; gap: 8px; padding: 6px 12px;
      background: #ffffff; border: 1px solid #cbd5e1; border-radius: 12px;
      cursor: pointer; transition: all 0.15s ease; white-space: nowrap;
    }
    .beneficiary-chip:hover { border-color: #059669; background: #ecfdf5; }
    .beneficiary-chip.active { border-color: #059669; background: #059669; color: #fff; }
    .chip-avatar {
      width: 26px; height: 26px; border-radius: 50%; background: #e2e8f0;
      color: #334155; font-size: 0.72rem; font-weight: 800; display: flex; align-items: center; justify-content: center;
    }
    .beneficiary-chip.active .chip-avatar { background: #047857; color: #fff; }
    .chip-info { display: flex; flex-direction: column; text-align: left; }
    .chip-name { font-size: 0.78rem; font-weight: 700; line-height: 1.2; }
    .chip-acc { font-size: 0.68rem; opacity: 0.85; }
    
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

    /* Lookup Card */
    .lookup-card { padding: 14px 16px; border-radius: 12px; font-size: 0.85rem; display: flex; flex-direction: column; gap: 4px; }
    .loading-card { background: #f8fafc; border: 1px solid #e2e8f0; color: #64748b; flex-direction: row; align-items: center; gap: 10px; }
    .spinner-sm { width: 16px; height: 16px; border: 2px solid #e2e8f0; border-top-color: #059669; border-radius: 50%; animation: spin 0.7s linear infinite; }
    
    .success-card { background: #ecfdf5; border: 1px solid #a7f3d0; color: #047857; }
    .error-card { background: #fef2f2; border: 1px solid #fca5a5; color: #b91c1c; font-weight: 600; }
    
    .verified-badge { font-size: 0.68rem; font-weight: 800; letter-spacing: 0.05em; color: #059669; }
    .recipient-name { font-size: 1.15rem; font-weight: 800; color: #065f46; margin-top: 2px; }

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
    .key-string { font-size: 0.78rem; font-weight: 700; color: #059669; background: #ffffff; padding: 6px 10px; border-radius: 8px; border: 1px solid #e2e8f0; word-break: break-all; }

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

    /* RESPONSIVE MEDIA QUERIES FOR MEDIUM & SMALL SCREENS */
    @media (max-width: 1024px) {
      .payment-form-grid {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 768px) {
      .form-card {
        padding: 24px 20px;
        border-radius: 20px;
      }
      .confirm-modal-box {
        max-width: 94vw;
        padding: 24px 20px;
        border-radius: 20px;
      }
      .modal-actions-bar {
        grid-template-columns: 1fr;
      }
      .quick-enterprises-grid {
        grid-template-columns: 1fr;
      }
      .sub-tab-selector {
        grid-template-columns: 1fr;
      }
    }
    /* My QR Inline Card */
    .my-qr-inline-card {
      display: flex; gap: 20px; background: #ffffff; border: 1px solid #e2e8f0;
      border-radius: 16px; padding: 24px; box-shadow: 0 4px 20px -5px rgba(0,0,0,0.04);
    }
    .qr-card-left {
      display: flex; flex-direction: column; align-items: center; gap: 10px;
      min-width: 160px; padding: 16px; background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
      border-radius: 12px; border: 1px solid #a7f3d0;
    }
    .qr-brand-row { display: flex; align-items: center; gap: 6px; }
    .qr-brand-name { font-size: 0.95rem; font-weight: 900; color: #059669; }
    .qr-brand-name i { font-style: italic; color: #1d4ed8; }
    .qr-verified-pill { font-size: 0.6rem; font-weight: 800; background: #dcfce7; color: #15803d; padding: 2px 7px; border-radius: 8px; }
    .qr-img-wrap { width: 140px; height: 140px; background: #fff; border: 2px solid #a7f3d0; border-radius: 12px; padding: 6px; }
    .qr-inline-img { width: 100%; height: 100%; object-fit: contain; }
    .qr-acc-info { display: flex; flex-direction: column; align-items: center; gap: 2px; }
    .qr-acc-name { font-size: 0.82rem; font-weight: 800; color: #0f172a; text-align: center; }
    .qr-acc-number { font-size: 0.85rem; font-weight: 900; color: #059669; font-family: monospace; }

    .qr-card-right { flex: 1; display: flex; flex-direction: column; gap: 12px; justify-content: center; }
    .qr-info-head { font-size: 1rem; font-weight: 800; color: #0f172a; }
    .qr-info-desc { font-size: 0.85rem; color: #475569; margin: 0; line-height: 1.6; }
    .qr-live-badge {
      display: inline-flex; align-items: center; gap: 6px; font-size: 0.8rem; font-weight: 700;
      background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; border-radius: 8px; padding: 4px 10px;
    }
    .dot-live { width: 7px; height: 7px; background: #10b981; border-radius: 50%; display: inline-block; animation: pulse 1.5s ease-in-out infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
    .qr-step-list { display: flex; flex-direction: column; gap: 8px; }
    .qr-step { display: flex; align-items: flex-start; gap: 10px; font-size: 0.83rem; color: #475569; }
    .step-num { width: 22px; height: 22px; border-radius: 50%; background: #059669; color: #fff; font-size: 0.72rem; font-weight: 800; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 1px; }

    /* Accept Mode (one-click QR flow) */
    .accept-card { padding: 24px 22px; display: flex; flex-direction: column; gap: 18px; }
    .accept-loading { display: flex; align-items: center; gap: 10px; padding: 18px; justify-content: center; color: #475569; font-weight: 600; }
    .accept-receiver { display: flex; align-items: center; gap: 14px; padding: 16px; background: linear-gradient(135deg, #ecfdf5 0%, #f0fdfa 100%); border: 1px solid #a7f3d0; border-radius: 14px; }
    .accept-avatar { width: 52px; height: 52px; border-radius: 50%; background: #059669; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 1.1rem; flex-shrink: 0; }
    .accept-receiver-info { display: flex; flex-direction: column; gap: 3px; flex: 1; min-width: 0; }
    .accept-receiver-name { font-size: 1.05rem; font-weight: 800; color: #0f172a; }
    .accept-receiver-acc { font-size: 0.85rem; color: #059669; font-weight: 700; }
    .accept-amount-block { text-align: center; padding: 22px 16px; background: #fff; border: 2px dashed #10b981; border-radius: 14px; }
    .accept-amount-label { display: block; font-size: 0.75rem; font-weight: 700; letter-spacing: 0.08em; color: #64748b; text-transform: uppercase; margin-bottom: 6px; }
    .accept-amount-value { font-size: 2.1rem; font-weight: 900; color: #047857; letter-spacing: -0.02em; }
    .accept-note-row { display: flex; gap: 8px; font-size: 0.9rem; padding: 10px 14px; background: #f8fafc; border-radius: 10px; }
    .accept-note-label { color: #64748b; font-weight: 600; }
    .accept-note-val { color: #0f172a; font-weight: 600; }
    .accept-warning { padding: 12px 14px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 10px; color: #b91c1c; font-size: 0.88rem; font-weight: 600; }
    .accept-actions { display: flex; align-items: center; justify-content: space-between; gap: 14px; margin-top: 4px; }
    .btn-accept-large { font-size: 1rem; padding: 14px 28px; flex: 1; }

    /* Tab Switcher */
    .tab-switcher { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding: 8px; background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 18px; }
    .tab-btn { display: flex; align-items: center; gap: 14px; padding: 16px 20px; background: transparent; border: 1.5px solid transparent; border-radius: 12px; cursor: pointer; text-align: left; transition: all 0.2s ease; color: #475569; }
    .tab-btn:hover { background: rgba(255,255,255,0.7); }
    .tab-btn.active { background: #ffffff; border-color: #a7f3d0; box-shadow: 0 4px 16px -4px rgba(5,150,105,0.2); color: #0f172a; }
    .tab-btn.active .tab-icon { transform: scale(1.1); color: #059669; }
    .tab-icon { font-size: 1.6rem; width: 22px; height: 22px; line-height: 1; flex-shrink: 0; }
    .tab-label-block { display: flex; flex-direction: column; gap: 3px; min-width: 0; flex: 1; }
    .tab-label-block strong { font-size: 0.95rem; font-weight: 800; color: inherit; }
    .tab-label-block small { font-size: 0.75rem; color: #94a3b8; }
    .tab-btn.active .tab-label-block small { color: #059669; font-weight: 600; }

    /* Receive Tab Card */
    .receive-card { padding: 44px 52px; display: flex; flex-direction: column; gap: 36px; }
    .receive-header-row { display: flex; align-items: flex-start; gap: 16px; }
    .receive-title-tag { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
    .qr-verified-pill { font-size: 0.65rem; font-weight: 800; background: linear-gradient(135deg, #dcfce7, #a7f3d0); color: #15803d; padding: 3px 10px; border-radius: 20px; letter-spacing: 0.05em; }
    .receive-brand-name { font-size: 0.9rem; font-weight: 900; color: #059669; }
    .receive-brand-name i { font-style: italic; color: #1d4ed8; }
    .receive-title { font-size: 1.7rem; font-weight: 800; color: #0f172a; margin: 0 0 8px 0; letter-spacing: -0.02em; }
    .receive-desc { font-size: 0.95rem; color: #64748b; margin: 0; line-height: 1.65; max-width: 600px; }
    .receive-body { display: grid; grid-template-columns: 360px 1fr; gap: 52px; align-items: flex-start; }
    @media (max-width: 860px) { .receive-body { grid-template-columns: 1fr; } }
    .receive-qr-wrap {
      display: flex; flex-direction: column; align-items: center; gap: 20px;
      padding: 28px 24px;
      background: linear-gradient(145deg, #ecfdf5 0%, #f0fdfa 60%, #e0f2fe 100%);
      border: 2px solid #a7f3d0; border-radius: 24px;
      box-shadow: 0 12px 40px -8px rgba(5,150,105,0.15), inset 0 1px 0 rgba(255,255,255,0.8);
    }
    .receive-qr-canvas { width: 300px; height: 300px; border-radius: 16px; background: #fff; display: block; box-shadow: 0 6px 28px -4px rgba(0,0,0,0.12); }
    .receive-qr-owner { display: flex; flex-direction: column; align-items: center; gap: 4px; }
    .receive-qr-owner .qr-acc-name { font-size: 1rem; font-weight: 800; color: #0f172a; text-align: center; }
    .receive-qr-owner .qr-acc-number { font-size: 1rem; font-weight: 900; color: #059669; font-family: monospace; letter-spacing: 0.04em; }
    .receive-config { display: flex; flex-direction: column; gap: 18px; }
    .form-label { font-size: 0.75rem; font-weight: 700; color: #475569; letter-spacing: 0.06em; text-transform: uppercase; }
    .custom-input { padding: 14px 16px; border: 1.5px solid #e2e8f0; border-radius: 12px; font-size: 0.95rem; color: #0f172a; background: #fafafa; transition: 0.15s; width: 100%; }
    .custom-input:focus { outline: none; border-color: #10b981; background: #fff; box-shadow: 0 0 0 3px rgba(16,185,129,0.1); }
    .receive-link-row { display: flex; align-items: stretch; gap: 10px; }
    .receive-link-input { flex: 1; padding: 13px 14px; border: 1.5px solid #e2e8f0; border-radius: 12px; background: #f8fafc; color: #334155; font-size: 0.82rem; overflow: hidden; text-overflow: ellipsis; }
    .receive-link-input:focus { outline: none; border-color: #059669; background: #fff; }
    .btn-copy { display: flex; align-items: center; gap: 7px; padding: 13px 20px; background: #059669; color: #fff; border: none; border-radius: 12px; font-size: 0.88rem; font-weight: 700; cursor: pointer; transition: all 0.18s; white-space: nowrap; }
    .btn-copy:hover { background: #047857; transform: translateY(-1px); box-shadow: 0 4px 14px rgba(5,150,105,0.3); }
    .receive-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .btn-share, .btn-download { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 14px 16px; background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 12px; font-size: 0.88rem; font-weight: 700; color: #374151; cursor: pointer; transition: all 0.18s; }
    .btn-share:hover, .btn-download:hover { border-color: #10b981; background: #f0fdf4; color: #059669; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(5,150,105,0.12); }
    .receive-note { display: flex; align-items: flex-start; gap: 10px; font-size: 0.85rem; color: #475569; background: linear-gradient(135deg, #f0f9ff, #e0f2fe); border: 1.5px solid #bae6fd; border-radius: 14px; padding: 16px 18px; line-height: 1.6; }
    .receive-note svg { margin-top: 2px; }
    .receive-note strong { color: #059669; font-weight: 700; }
  `]
})
export class PaymentFormComponent implements OnInit, OnDestroy {
  @ViewChild('qrCanvas') qrCanvasRef!: ElementRef<HTMLCanvasElement>;

  paymentForm!: FormGroup;
  myBalance = 0;
  submitting = false;
  showConfirmModal = false;

  // Account Number input & Real-time lookup state
  accountNumberInput = '';
  lookingUp = false;
  recipientLookup: AccountLookupResponse | null = null;
  lookupError: string | null = null;
  
  private lookupSubject = new Subject<string>();
  private lookupSub!: Subscription;

  beneficiaries: BeneficiaryResponse[] = [];

  // My Personal QR
  myAccountNumber = '';
  myAccountName = '';
  myQrCustomAmount = 0;
  myQrCustomNote = '';
  myQrImageUrl = '';

  // Accept Mode (QR one-click payment)
  acceptMode = false;
  acceptError: string | null = null;

  // Tab switcher: 'send' shows the form, 'receive' shows the QR card for others to scan
  activeTab: 'send' | 'receive' = 'send';
  linkCopied = false;

  constructor(
    private fb: FormBuilder,
    private transactionService: TransactionService,
    private accountService: AccountService,
    private beneficiaryService: BeneficiaryService,
    private notification: NotificationService,
    private router: Router,
    private route: ActivatedRoute,
    private paygateQrService: PaygateQrService
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadMyAccountInfo(); // Single call for balance + QR
    this.loadBeneficiaries();
    this.generateIdempotencyKey();
    this.setupLookupDebounce();

    // QR Code / URL Pre-fill integration
    this.route.queryParams.subscribe(params => {
      let filled = false;
      if (params['amount']) {
        const amt = Number(params['amount']);
        if (!isNaN(amt) && amt > 0) {
          this.paymentForm.patchValue({ amount: amt });
          filled = true;
        }
      }
      if (params['note'] || params['description']) {
        const note = params['note'] || params['description'];
        this.paymentForm.patchValue({ description: note });
        filled = true;
      }
      if (params['recipient'] || params['acc'] || params['to']) {
        const acc = (params['recipient'] || params['acc'] || params['to']).toUpperCase();
        this.accountNumberInput = acc;
        this.lookingUp = true;
        this.lookupSubject.next(acc);
        filled = true;
      }

      // Accept mode: render one-click confirm UI instead of full form
      this.acceptMode = params['accept'] === '1' || params['accept'] === 'true';

      if (filled && !this.acceptMode) {
        this.notification.success('Auto-filled payment info from QR Code!');
      }
    });
    // Watch amount field changes to update QR live
    this.paymentForm.get('amount')?.valueChanges.subscribe(val => {
      this.myQrCustomAmount = Number(val) || 0;
      this.updateMyQr();
    });
  }

  private loadMyAccountInfo(): void {
    this.accountService.getAccountMe().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.myBalance = res.data.balance;
          this.myAccountNumber = res.data.accountNumber || '';
          // Show QR immediately with account number
          this.updateMyQr();
          // Fetch owner name then regenerate QR with name
          this.accountService.lookupAccount(this.myAccountNumber).subscribe({
            next: (lookupRes) => {
              if (lookupRes.success && lookupRes.data) {
                this.myAccountName = lookupRes.data.ownerName || '';
                this.updateMyQr();
              }
            }
          });
        }
      }
    });
  }

  updateMyQr(): void {
    if (!this.myAccountNumber) return;
    const note = this.activeTab === 'receive'
      ? (this.myQrCustomNote || '')
      : (this.paymentForm.get('description')?.value || '');
    this.myQrImageUrl = this.paygateQrService.generateQrImageUrl(
      this.myAccountNumber, this.myAccountName, this.myQrCustomAmount, note
    );
    // Draw QR on canvas with PayGate logo
    setTimeout(() => this.drawQrWithLogo(this.myQrImageUrl), 50);
  }

  /** Draw QR image on canvas and overlay PayGate logo in center */
  private drawQrWithLogo(qrUrl: string): void {
    const canvasEl = this.qrCanvasRef?.nativeElement;
    if (!canvasEl) return;
    const ctx = canvasEl.getContext('2d');
    if (!ctx) return;

    const size = 300;
    canvasEl.width = size;
    canvasEl.height = size;

    const qrImg = new Image();
    qrImg.crossOrigin = 'anonymous';
    qrImg.onload = () => {
      // Draw QR
      ctx.clearRect(0, 0, size, size);
      ctx.drawImage(qrImg, 0, 0, size, size);

      // Logo overlay in center
      const logoSize = 44;
      const logoX = (size - logoSize) / 2;
      const logoY = (size - logoSize) / 2;

      // White circle background
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, logoSize / 2 + 4, 0, Math.PI * 2);
      ctx.fill();

      // PayGate logo: green circle + "P" letter
      ctx.fillStyle = '#059669';
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, logoSize / 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 22px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('P', size / 2, size / 2 + 1);
    };
    qrImg.onerror = () => {
      // If cross-origin fails, fallback: just show "P" logo on blank canvas
      ctx.clearRect(0, 0, size, size);
      ctx.fillStyle = '#f0fdf4';
      ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = '#059669';
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, 30, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('P', size / 2, size / 2);
    };
    qrImg.src = qrUrl;
  }

  switchTab(tab: 'send' | 'receive'): void {
    this.activeTab = tab;
    this.linkCopied = false;
    if (tab === 'receive') {
      this.myQrCustomAmount = 0;
      this.updateMyQr();
    }
  }

  getMyPaymentLink(): string {
    if (!this.myAccountNumber) return '';
    return this.paygateQrService.generatePayGatePaymentLink(
      this.myAccountNumber, this.myQrCustomAmount, this.myQrCustomNote || ''
    );
  }

  copyPaymentLink(): void {
    const link = this.getMyPaymentLink();
    if (!link) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(link).then(() => {
        this.linkCopied = true;
        this.notification.success('Copied link to clipboard');
        setTimeout(() => this.linkCopied = false, 2500);
      }).catch(() => this.fallbackCopy(link));
    } else {
      this.fallbackCopy(link);
    }
  }

  private fallbackCopy(text: string): void {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.top = '-1000px';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      this.linkCopied = true;
      this.notification.success('Link copied');
      setTimeout(() => this.linkCopied = false, 2500);
    } catch {
      this.notification.error('Could not copy. Please copy manually.');
    }
    document.body.removeChild(ta);
  }

  sharePaymentLink(): void {
    const link = this.getMyPaymentLink();
    if (!link) return;
    const title = `Chuyển tiền cho ${this.myAccountName || this.myAccountNumber}`;
    const text = this.myQrCustomAmount > 0
      ? `Gửi ${this.myQrCustomAmount.toLocaleString('vi-VN')} VND qua PayGate`
      : `Chuyển tiền qua PayGate`;
    if ((navigator as any).share) {
      (navigator as any).share({ title, text, url: link }).catch(() => {});
    } else {
      this.copyPaymentLink();
    }
  }

  downloadQr(): void {
    const canvasEl = this.qrCanvasRef?.nativeElement;
    if (canvasEl) {
      // Download directly from canvas (includes logo)
      canvasEl.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `paygate-qr-${this.myAccountNumber}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      });
    } else if (this.myQrImageUrl) {
      const a = document.createElement('a');
      a.href = this.myQrImageUrl;
      a.download = `paygate-qr-${this.myAccountNumber}.png`;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  }

  loadBeneficiaries(): void {
    this.beneficiaryService.getMyBeneficiaries().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.beneficiaries = res.data;
        }
      }
    });
  }

  selectBeneficiary(b: BeneficiaryResponse): void {
    this.accountNumberInput = b.accountNumber;
    this.lookingUp = true;
    this.lookupSubject.next(b.accountNumber);
  }

  getInitials(name: string): string {
    if (!name) return 'PG';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
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
      description: ['PayGate Express Payment'],
      idempotencyKey: ['', [Validators.required]]
    });
  }


  private setupLookupDebounce(): void {
    this.lookupSub = this.lookupSubject.pipe(
      debounceTime(400),
      distinctUntilChanged()
    ).subscribe(query => {
      this.performAccountLookup(query);
    });
  }

  onInputChanged(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    // Reset state when user clears or alters input
    this.recipientLookup = null;
    this.lookupError = null;
    this.paymentForm.patchValue({ destAccountId: '', merchantId: null });

    if (val && val.trim().length >= 3) {
      this.lookingUp = true;
      this.lookupSubject.next(val.trim());
    } else {
      this.lookingUp = false;
    }
  }

  onInputBlur(): void {
    if (this.accountNumberInput && this.accountNumberInput.trim().length >= 2) {
      this.lookingUp = true;
      this.performAccountLookup(this.accountNumberInput.trim());
    }
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
            merchantId: res.data.merchantId || null
          });
        }
      },
      error: (err) => {
        this.lookingUp = false;
        this.recipientLookup = null;
        this.lookupError = err.error?.message || `Account number "${query}" not found in system.`;
        this.paymentForm.patchValue({ destAccountId: '', merchantId: null });
      }
    });
  }

  generateIdempotencyKey(): void {
    const uuid = 'IDEM-' + Math.random().toString(36).substring(2, 9).toUpperCase() + '-' + Date.now();
    this.paymentForm.patchValue({ idempotencyKey: uuid });
  }

  get isSelfTransfer(): boolean {
    return !!(this.recipientLookup && this.myAccountNumber
      && this.recipientLookup.accountNumber?.toUpperCase() === this.myAccountNumber.toUpperCase());
  }

  get canAcceptPay(): boolean {
    return this.paymentForm.valid
      && !!this.recipientLookup
      && !this.lookingUp
      && !this.submitting
      && !this.isSelfTransfer;
  }

  exitAcceptMode(): void {
    this.acceptMode = false;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { accept: null },
      queryParamsHandling: 'merge'
    });
  }

  acceptAndPay(): void {
    if (!this.canAcceptPay) {
      this.paymentForm.markAllAsTouched();
      return;
    }
    this.executePayment();
  }

  openConfirmation(): void {
    if (this.paymentForm.invalid || !this.recipientLookup) {
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
          this.notification.success(`Payment completed successfully! Ref: ${res.data.transactionRef}`);
          this.router.navigate(['/transactions/history']);
        }
      },
      error: (err) => {
        this.submitting = false;
        this.showConfirmModal = false;
        const msg = err.error?.message || 'Payment failed!';
        this.notification.error(msg);
      }
    });
  }
}
