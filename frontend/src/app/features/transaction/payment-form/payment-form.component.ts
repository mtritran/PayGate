import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { TransactionService } from '../../../core/services/transaction.service';
import { AccountService } from '../../../core/services/account.service';
import { NotificationService } from '../../../core/services/notification.service';
import { BeneficiaryService, BeneficiaryResponse } from '../../../core/services/beneficiary.service';
import { PaygateQrService } from '../../../core/services/paygate-qr.service';
import { AuthService } from '../../../core/services/auth.service';
import { AccountLookupResponse } from '../../../core/models/account.model';

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
          <p class="subtitle">Secure money transfer to any User or Merchant account using double-entry ledger & idempotency protection.</p>
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
            
            <!-- Saved Beneficiaries Quick Contact Selector -->
            <div class="form-group" *ngIf="beneficiaries.length > 0">
              <label class="form-label">DANH BẠ NGƯỜI NHẬN NHANH</label>
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

            <!-- Recipient Account Number Field with PayGate Wallet QR Buttons -->
            <div class="form-group">
              <div class="form-label-row">
                <label class="form-label required">Recipient Account Number (Số tài khoản nhận)</label>
                <div class="qr-action-buttons">
                  <button type="button" class="btn-qr-chip pulse-emerald" (click)="openQrScanModal()">
                    📷 Quét / Dán Mã QR PayGate
                  </button>
                  <button type="button" class="btn-qr-chip btn-qr-my" (click)="openMyQrModal()">
                    📱 Mã QR Ví Của Tôi
                  </button>
                </div>
              </div>

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
                <span *ngIf="recipientLookup.ownerType === 'MERCHANT'">🏪 MERCHANT ACCOUNT</span>
                <span *ngIf="recipientLookup.ownerType === 'USER'">👤 PERSONAL ACCOUNT</span>
                <span *ngIf="recipientLookup.ownerType === 'SYSTEM'">⚡ SYSTEM ACCOUNT</span>
              </div>
              <div class="recipient-details">
                <strong class="recipient-name">{{ recipientLookup.ownerName }}</strong>
              </div>
            </div>

            <div *ngIf="!lookingUp && lookupError" class="lookup-card error-card">
              ❌ {{ lookupError }}
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

      <!-- PAYGATE INTERNAL QR SCANNER & PARSER MODAL -->
      <div class="modal-overlay" *ngIf="showQrScanModal">
        <div class="paygate-qr-modal modal-fade-in">
          <div class="modal-header-vqr">
            <div class="modal-title-group">
              <span class="modal-badge-pill">PAYGATE WALLET QR SCANNER</span>
              <h3>Quét / Dán Mã QR Ví PayGate</h3>
            </div>
            <button type="button" class="btn-close-light" (click)="closeQrScanModal()">✕</button>
          </div>

          <div class="modal-body-pad">
            <p class="modal-hint-text">Dán chuỗi mã QR Ví PayGate hoặc chọn tài khoản mẫu bên dưới để nạp/chuyển tiền tức thì MoMo-style:</p>

            <!-- Textarea for QR payload string -->
            <div class="form-group mb-16">
              <label class="form-label font-bold">Dán Chuỗi Mã QR PayGate Hoặc Số Tài Khoản:</label>
              <textarea
                class="qr-textarea font-mono"
                rows="3"
                [(ngModel)]="qrPayloadInput"
                placeholder="Ví dụ: PAYGATE:TRANSFER:AC00000005:100000:Tien%20ca%20phe..."
              ></textarea>
            </div>

            <!-- Quick Sample PayGate QR Preset Chips -->
            <div class="sample-qr-section">
              <span class="sample-title">CHỌN MÃ QR MẪU CỦA TÀI KHOẢN KHÁC TRONG HỆ THỐNG:</span>
              <div class="sample-grid">
                <button
                  type="button"
                  *ngFor="let sample of sampleQrOptions"
                  class="sample-qr-card"
                  (click)="applySampleQr(sample)"
                >
                  <div class="sample-avatar font-mono">QR</div>
                  <div class="sample-detail">
                    <strong class="s-name">{{ sample.name }}</strong>
                    <span class="s-acc font-mono">{{ sample.acc }} ({{ sample.amount | currency:'VND':'symbol':'1.0-0' }})</span>
                    <span class="s-note">{{ sample.note }}</span>
                  </div>
                </button>
              </div>
            </div>
          </div>

          <div class="modal-footer-pad">
            <button type="button" class="btn-cancel-light" (click)="closeQrScanModal()">Hủy</button>
            <button type="button" class="btn-submit-emerald" (click)="processQrPayload()">
              ✓ Giải Mã QR & Tự Động Điền ➔
            </button>
          </div>
        </div>
      </div>

      <!-- MY PAYGATE PERSONAL QR CODE MODAL -->
      <div class="modal-overlay" *ngIf="showMyQrModal">
        <div class="paygate-qr-modal modal-fade-in wide-qr-modal">
          <div class="modal-header-vqr bg-gradient-emerald">
            <div class="modal-title-group">
              <span class="modal-badge-pill">PAYGATE WALLET QR RECEIVER</span>
              <h3>Mã QR Nhận Tiền Ví PayGate Của Tôi</h3>
            </div>
            <button type="button" class="btn-close-light" (click)="closeMyQrModal()">✕</button>
          </div>

          <div class="modal-body-pad grid-qr-layout">
            <!-- Left: QR Code display -->
            <div class="my-qr-display-box">
              <div class="paygate-brand-banner">
                <span class="pg-logo-bold">PayGate <i>Wallet</i></span>
                <span class="pg-verified">VERIFIED USER</span>
              </div>

              <div class="my-qr-img-frame">
                <img [src]="myQrImageUrl" (error)="onQrImageError($event)" alt="My PayGate QR Code" class="my-qr-img" />
              </div>

              <div class="my-acc-badge">
                <span class="acc-title">{{ myAccountName }}</span>
                <span class="acc-code font-mono">{{ myAccountNumber }}</span>
              </div>
            </div>

            <!-- Right: Dynamic Amount & Config -->
            <div class="my-qr-config-box">
              <div class="card-title-sm">TẠO MÃ QR NHẬN TIỀN THEO SỐ TIỀN:</div>

              <div class="form-group mt-8">
                <label class="field-lbl font-bold">Số Tiền Muốn Nhận (VND)</label>
                <input
                  type="number"
                  class="modal-input-sm font-mono"
                  [(ngModel)]="myQrCustomAmount"
                  placeholder="Nhập số tiền (e.g. 50000)..."
                  (input)="updateMyQrImage()"
                />
              </div>

              <div class="form-group mt-8">
                <label class="field-lbl font-bold">Nội Dung Nhận Tiền / Lời Nhắn</label>
                <input
                  type="text"
                  class="modal-input-sm"
                  [(ngModel)]="myQrCustomNote"
                  placeholder="e.g. Tiền cà phê, Tiền ăn trưa..."
                  (input)="updateMyQrImage()"
                />
              </div>

              <div class="copy-actions-group mt-16">
                <button type="button" class="btn-copy-chip-full" (click)="copyText(myAccountNumber, 'Số tài khoản PayGate')">
                  📋 Sao Chép Số Tài Khoản PayGate
                </button>
                <button type="button" class="btn-copy-chip-full btn-outline" (click)="copyText(myQrPayloadString, 'Chuỗi Mã QR PayGate')">
                  🔗 Sao Chép Chuỗi Mã QR
                </button>
              </div>
            </div>
          </div>

          <div class="modal-footer-pad">
            <button type="button" class="btn-cancel-light" (click)="closeMyQrModal()">Đóng</button>
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

    .paygate-form-page { display: flex; flex-direction: column; gap: 20px; max-width: 580px; margin: 0 auto; width: 100%; color: #0f172a; }
    
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

    /* Form Label Row with QR Action Buttons */
    .form-label-row { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 6px; }
    .qr-action-buttons { display: flex; gap: 6px; }
    .btn-qr-chip {
      background: #ecfdf5; border: 1px solid #059669; color: #047857;
      font-size: 0.75rem; font-weight: 800; padding: 4px 10px; border-radius: 10px;
      cursor: pointer; transition: all 0.15s;
    }
    .btn-qr-chip:hover { background: #059669; color: #ffffff; }
    .btn-qr-my { background: #eff6ff; border-color: #1d4ed8; color: #1e40af; }
    .btn-qr-my:hover { background: #1d4ed8; color: #ffffff; }

    /* Modals for QR Transfer */
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
  `]
})
export class PaymentFormComponent implements OnInit, OnDestroy {
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

  // PayGate QR Transfer Scanner & My QR state
  showQrScanModal = false;
  showMyQrModal = false;
  qrPayloadInput = '';
  myAccountNumber = '';
  myAccountName = '';
  myQrImageUrl = '';
  myQrCustomAmount = 0;
  myQrCustomNote = '';
  myQrPayloadString = '';

  sampleQrOptions = [
    { name: 'TRẦN VIỆT TRINH (Ví cá nhân)', acc: 'AC00000005', amount: 100000, note: 'Chuyển tiền ăn trưa' },
    { name: 'PAYGATE CENTRAL ADMIN', acc: 'AC00000001', amount: 50000, note: 'Thanh toán dịch vụ PayGate' },
    { name: 'CỬA HÀNG MERCHANT DEMO', acc: 'AC00000002', amount: 200000, note: 'Thanh toán đơn hàng #1088' }
  ];

  constructor(
    private fb: FormBuilder,
    private transactionService: TransactionService,
    private accountService: AccountService,
    private beneficiaryService: BeneficiaryService,
    private paygateQrService: PaygateQrService,
    private authService: AuthService,
    private notification: NotificationService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  openQrScanModal(): void {
    this.showQrScanModal = true;
    this.qrPayloadInput = '';
  }

  closeQrScanModal(): void {
    this.showQrScanModal = false;
  }

  applySampleQr(option: any): void {
    this.qrPayloadInput = this.paygateQrService.encodePayload(option.acc, option.name, option.amount, option.note);
    this.processQrPayload();
  }

  processQrPayload(): void {
    if (!this.qrPayloadInput.trim()) {
      this.notification.warning('Vui lòng nhập hoặc dán mã QR PayGate!');
      return;
    }

    const parsed = this.paygateQrService.parsePayload(this.qrPayloadInput);
    if (!parsed || !parsed.accountNumber) {
      this.notification.error('Mã QR không hợp lệ hoặc không phải định dạng Mã QR Ví PayGate!');
      return;
    }

    this.accountNumberInput = parsed.accountNumber;
    this.lookingUp = true;
    this.lookupSubject.next(parsed.accountNumber);

    if (parsed.amount && parsed.amount > 0) {
      this.paymentForm.patchValue({ amount: parsed.amount });
    }

    if (parsed.note) {
      this.paymentForm.patchValue({ description: parsed.note });
    }

    this.closeQrScanModal();
    this.notification.success(`Đã quét & tự động điền mã QR Ví PayGate cho tài khoản ${parsed.accountNumber}!`);
  }

  openMyQrModal(): void {
    this.myAccountNumber = this.accountService.getCurrentAccount()?.accountNumber || 'AC00000001';
    const user = this.authService.getUsername() || 'PAYGATE USER';
    this.myAccountName = user.split('@')[0].toUpperCase();
    this.updateMyQrImage();
    this.showMyQrModal = true;
  }

  closeMyQrModal(): void {
    this.showMyQrModal = false;
  }

  updateMyQrImage(): void {
    this.myQrImageUrl = this.paygateQrService.generateQrImageUrl(
      this.myAccountNumber,
      this.myAccountName,
      this.myQrCustomAmount,
      this.myQrCustomNote
    );
    this.myQrPayloadString = this.paygateQrService.encodePayload(
      this.myAccountNumber,
      this.myAccountName,
      this.myQrCustomAmount,
      this.myQrCustomNote
    );
  }

  onQrImageError(event: any): void {
    const fallbackUrl = this.paygateQrService.getFallbackQrImageUrl(
      this.myAccountNumber,
      this.myAccountName,
      this.myQrCustomAmount,
      this.myQrCustomNote
    );
    if (this.myQrImageUrl !== fallbackUrl) {
      this.myQrImageUrl = fallbackUrl;
    }
  }

  copyText(text: string, label: string): void {
    navigator.clipboard.writeText(text);
    this.notification.success(`Sao chép thành công ${label}: ${text}`);
  }

  ngOnInit(): void {
    this.initForm();
    this.loadMyBalance();
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

      if (filled) {
        this.notification.success('✨ Đã tự động điền thông tin thanh toán từ Mã QR!');
      }
    });
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

  private loadMyBalance(): void {
    this.accountService.getAccountMe().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.myBalance = res.data.balance;
        }
      }
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
