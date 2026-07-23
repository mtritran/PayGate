import { Component, OnInit, signal, inject, OnDestroy } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AccountService, LinkedBankResponseDTO } from '../../../core/services/account.service';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { VietQrService, BankDeepLink } from '../../../core/services/viet-qr.service';
import { AccountResponse } from '../../../core/models/account.model';

export interface LinkedBankSource {
  id: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  balance: number;
  iconType: 'BANK' | 'CARD' | 'MOMO';
  createdAt?: string;
}

export interface BankTheme {
  bg: string;
  border: string;
  text: string;
  gradient: string;
}

export interface AvailableBankOption {
  code: string;
  name: string;
  shortName: string;
  iconType: 'BANK' | 'CARD' | 'MOMO';
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
    <div class="topup-page">
      <!-- Header Section -->
      <div class="page-header mb-24 fade-in-up">
        <div class="header-tag">PAYGATE WALLET TOP UP</div>
        <h2>Wallet Top Up & VietQR</h2>
        <p class="subtitle">Deposit funds into your PayGate wallet via linked bank accounts or instant VietQR scan.</p>
      </div>

      <!-- Main Grid Container -->
      <div class="topup-grid">
        <!-- LEFT COLUMN: Wallet Card & Balance Overview -->
        <div class="left-col fade-in-up">
          <div class="content-card hover-lift shimmer-box mb-24">
            <div class="card-header-flex mb-20">
              <div>
                <span class="hero-tag">PAYGATE WALLET</span>
                <div class="card-title">Digital Debit Card</div>
              </div>
              <span class="status-chip active">ACTIVE</span>
            </div>

            <!-- Metallic Shimmer Visa Card with Dynamic Brand Theme Gradient -->
            <div
              class="metallic-visa-card shimmer-box"
              [style.background]="getSelectedCardGradient()">
              <div class="card-top-row">
                <div class="visa-brand-logo">
                  <span class="paygate-brand">PayGate</span>
                  <span class="visa-tag">VISA</span>
                </div>
                <div class="emv-chip">
                  <div class="chip-line horizontal"></div>
                  <div class="chip-line vertical"></div>
                </div>
              </div>

              <div class="card-mid-section mt-24">
                <div class="wallet-field-label">ACCOUNT NUMBER</div>
                <div class="card-num font-mono">{{ account?.accountNumber || 'PAY0000000001' }}</div>
              </div>

              <div class="card-bottom-row mt-24">
                <div>
                  <div class="wallet-field-label">CARD HOLDER</div>
                  <div class="card-holder-name">{{ getUserFullName() }}</div>
                </div>
                <div>
                  <div class="wallet-field-label">VALID THRU</div>
                  <div class="expiry-date">12/29</div>
                </div>
              </div>
            </div>

            <!-- Wallet Balance Details Box Under Visa Card -->
            <div class="wallet-balance-box mt-24">
              <div class="flex-between">
                <div>
                  <span class="field-label">CURRENT WALLET BALANCE</span>
                  <div class="balance-display">{{ accountBalance | currency:'VND':'symbol':'1.0-0' }}</div>
                </div>
              </div>

              <!-- Projected Balance Badge -->
              <div class="after-topup-badge mt-12" *ngIf="currentAmount > 0">
                <span class="preview-lbl">Projected balance after top-up:</span>
                <span class="preview-val">
                  {{ (accountBalance + currentAmount) | currency:'VND':'symbol':'1.0-0' }}
                  <span class="increase-tag">(+{{ currentAmount | currency:'VND':'symbol':'1.0-0' }})</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- RIGHT COLUMN: Spacious Top-Up Form -->
        <div class="right-col fade-in-up">
          <div class="content-card hover-lift">
            <form [formGroup]="topUpForm" (ngSubmit)="onSubmit()" class="custom-topup-form">
              <!-- Top-up Mode Selector Tabs (Linked Bank vs VietQR) -->
              <div class="mode-selector-bar">
                <button
                  type="button"
                  class="mode-tab-btn"
                  [class.active]="topUpMode() === 'LINKED_BANK'"
                  (click)="setTopUpMode('LINKED_BANK')">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="3" y1="21" x2="21" y2="21" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                    <polyline points="12 3 2 10 22 10 12 3" />
                  </svg>
                  <span>Linked Bank Source</span>
                </button>
                <button
                  type="button"
                  class="mode-tab-btn"
                  [class.active]="topUpMode() === 'VIETQR'"
                  (click)="setTopUpMode('VIETQR')">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="7" height="7" />
                    <rect x="14" y="3" width="7" height="7" />
                    <rect x="3" y="14" width="7" height="7" />
                    <rect x="14" y="14" width="7" height="7" />
                  </svg>
                  <span>VietQR Instant Scan</span>
                </button>
              </div>

              <!-- Top-Up Amount Section -->
              <div class="form-section">
                <label class="section-label">Select or enter top up amount</label>

                <div class="preset-grid mb-16">
                  <button
                    type="button"
                    *ngFor="let p of presets"
                    class="preset-btn"
                    [class.active]="topUpForm.get('amount')?.value === p.val"
                    (click)="selectPreset(p.val)">
                    {{ p.label }}
                  </button>
                </div>

                <div class="input-wrapper">
                  <span class="currency-prefix">₫</span>
                  <input
                    type="number"
                    class="custom-amount-input"
                    placeholder="Enter custom amount..."
                    formControlName="amount"
                    min="10000"
                    max="1000000000">
                </div>
                <div class="error-msg" *ngIf="topUpForm.get('amount')?.touched && topUpForm.get('amount')?.hasError('min')">
                  Minimum top up amount is 10,000 VND.
                </div>
              </div>

              <!-- MODE 1: LINKED BANK SOURCES -->
              <div class="form-section" *ngIf="topUpMode() === 'LINKED_BANK'">
                <div class="flex-between mb-12">
                  <label class="section-label mb-0">Select Linked Payment Source</label>
                  <div class="action-btn-group">
                    <button type="button" class="btn-link-bank" (click)="openLinkModal()">
                      + Link new bank
                    </button>
                    <button type="button" class="btn-reset-mock" (click)="restoreDefaultBanks()" title="Restore default list">
                      Restore Defaults
                    </button>
                  </div>
                </div>

                <!-- Linked Bank Grid Cards -->
                <div class="method-grid" *ngIf="linkedBanks.length > 0">
                  <div
                    *ngFor="let bank of linkedBanks"
                    class="method-card"
                    [class.active]="selectedBankId === bank.id"
                    [class.insufficient]="isBankInsufficient(bank)"
                    [style.backgroundColor]="getBankTheme(bank.bankName).bg"
                    [style.borderColor]="selectedBankId === bank.id ? getBankTheme(bank.bankName).border : '#cbd5e1'"
                    (click)="selectBank(bank.id)">
                    <button type="button" class="btn-unlink" (click)="unlinkBank(bank.id, $event)" title="Unlink bank">
                      ✕
                    </button>
                    
                    <div class="method-icon-box" [style.background]="getBankTheme(bank.bankName).gradient" style="color: #ffffff;">
                      <svg *ngIf="bank.iconType === 'BANK'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                        <line x1="3" y1="21" x2="21" y2="21" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                        <polyline points="12 3 2 10 22 10 12 3" />
                      </svg>
                      <svg *ngIf="bank.iconType === 'CARD'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                        <line x1="1" y1="10" x2="23" y2="10" />
                      </svg>
                      <svg *ngIf="bank.iconType === 'MOMO'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                        <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                      </svg>
                    </div>

                    <div class="method-info">
                      <span class="method-title" [style.color]="getBankTheme(bank.bankName).text">{{ bank.bankName }}</span>
                      <span class="method-acc font-mono">{{ maskAccNum(bank.accountNumber) }}</span>
                      <span class="method-balance" [class.text-danger]="isBankInsufficient(bank)" [style.color]="isBankInsufficient(bank) ? '#dc2626' : getBankTheme(bank.bankName).text">
                        Balance: {{ bank.balance | currency:'VND':'symbol':'1.0-0' }}
                      </span>
                    </div>
                  </div>
                </div>

                <div *ngIf="linkedBanks.length === 0" class="empty-linked-box" (click)="openLinkModal()">
                  <div class="empty-icon">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="1.8">
                      <line x1="3" y1="21" x2="21" y2="21" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                      <polyline points="12 3 2 10 22 10 12 3" />
                    </svg>
                  </div>
                  <div class="empty-text">
                    <strong>No linked banks yet</strong>
                    <span>Click here to select a bank from dropdown and link account</span>
                  </div>
                </div>
              </div>

              <!-- MODE 2: VIETQR INSTANT TRANSFER BANNER -->
              <div class="vietqr-info-box" *ngIf="topUpMode() === 'VIETQR'">
                <div class="vietqr-badge-header">
                  <span class="vqr-logo">VietQR <i>EMVCo</i></span>
                  <span class="vqr-tag">NAPAS 247 INSTANT</span>
                </div>
                <p class="vqr-desc">Scan dynamic QR code using any Mobile Banking app (MB Bank, Vietcombank, Techcombank, MoMo, etc.) for instant zero-fee wallet deposit.</p>
              </div>

              <!-- Submit Action Button -->
              <div class="submit-action mt-24">
                <button
                  class="btn-emerald-submit pulse-glow"
                  type="submit"
                  [style.background]="getSubmitGradient()"
                  [disabled]="topUpForm.invalid || submitting || (topUpMode() === 'LINKED_BANK' && (!currentSelectedBank || isCurrentBankInsufficient()))">
                  <span *ngIf="!submitting" class="btn-content">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="16" />
                      <line x1="8" y1="12" x2="16" y2="12" />
                    </svg>
                    <span *ngIf="topUpMode() === 'LINKED_BANK'">
                      Top up {{ currentAmount | currency:'VND':'symbol':'1.0-0' }} via {{ currentSelectedBank?.bankName || 'Bank' }} ↗
                    </span>
                    <span *ngIf="topUpMode() === 'VIETQR'">
                      Generate VietQR Code for {{ currentAmount | currency:'VND':'symbol':'1.0-0' }} ↗
                    </span>
                  </span>
                  <span *ngIf="submitting" class="btn-content">
                    <span class="btn-spinner"></span>
                    Processing Top-up...
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <!-- FULL VIEWPORT 100VW x 100VH BACKDROP VIETQR MODAL -->
      <div class="modal-overlay" *ngIf="showVietQrModal">
        <div class="vietqr-modal-card fade-in-up">
          <!-- Fixed Top Header Banner -->
          <div class="vqr-banner-header">
            <div class="vqr-title-group">
              <div class="vqr-badge-pill">
                <span class="dot-live"></span>
                <span>VIETQR NAPAS 24/7</span>
              </div>
              <h3>Scan QR Code to Top Up</h3>
            </div>
            <button type="button" class="btn-close-modal-light" (click)="closeVietQrModal()">✕</button>
          </div>

          <!-- Scrollable Content Area -->
          <div class="vqr-content-wrapper">
            <div class="modal-body-vqr">
              <!-- Left Column: Compact High-Res QR Image -->
              <div class="qr-display-box">
                <div class="qr-image-wrapper">
                  <img [src]="vietQrImageUrl" alt="VietQR Code" class="vqr-img" />
                </div>
                <div class="qr-timer-pill">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2.2">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  <span>Expires in: <strong>{{ formattedTimer }}</strong></span>
                </div>
              </div>

              <!-- Right Column: Transfer Info List -->
              <div class="vqr-details-box">
                <div class="detail-card">
                  <span class="d-lbl">BENEFICIARY BANK</span>
                  <span class="d-val font-bold">MB Bank (Quân Đội)</span>
                </div>
                <div class="detail-card">
                  <span class="d-lbl">ACCOUNT NUMBER</span>
                  <div class="d-val-copy">
                    <span class="font-mono acc-num">8888999988</span>
                    <button type="button" class="btn-copy-chip" (click)="copyText('8888999988', 'Account Number')">Copy</button>
                  </div>
                </div>
                <div class="detail-card">
                  <span class="d-lbl">ACCOUNT HOLDER</span>
                  <span class="d-val font-bold">PAYGATE GATEWAY SYSTEM</span>
                </div>
                <div class="detail-card">
                  <span class="d-lbl">AMOUNT</span>
                  <span class="d-val amount-val">{{ currentAmount | currency:'VND':'symbol':'1.0-0' }}</span>
                </div>
                <div class="detail-card highlight-note">
                  <span class="d-lbl">TRANSFER NOTE (EXACT MATCH)</span>
                  <div class="d-val-copy">
                    <span class="font-mono text-note">{{ currentTransferNote }}</span>
                    <button type="button" class="btn-copy-chip" (click)="copyText(currentTransferNote, 'Transfer Note')">Copy</button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Deep Link Mobile Banking Apps Bar -->
            <div class="vqr-deep-links-bar">
              <span class="deep-link-label">Select Banking App to Open:</span>
              <div class="apps-grid">
                <a
                  *ngFor="let app of bankingApps"
                  [href]="app.scheme"
                  target="_blank"
                  class="app-link-pill"
                  [style.background]="app.bg">
                  {{ app.name }} ↗
                </a>
              </div>
            </div>
          </div>

          <!-- Fixed Bottom Action Footer -->
          <div class="modal-footer-vqr">
            <button type="button" class="btn-cancel-modal" (click)="closeVietQrModal()">Cancel</button>
            <button type="button" class="btn-confirm-vqr pulse-glow" (click)="confirmVietQrSuccess()">
              Simulate Instant Banking Transfer & Add Balance ➔
            </button>
          </div>
        </div>
      </div>

      <!-- LINK NEW BANK MODAL WITH DROPDOWN (NAVDOWN) & USER-ENTERED CARD NUMBER -->
      <div class="modal-overlay" *ngIf="showLinkModal">
        <div class="modal-card fade-in-up">
          <div class="modal-header">
            <div>
              <span class="hero-tag">BANK LINKING</span>
              <h3>Link Bank Account / E-Wallet</h3>
            </div>
            <button type="button" class="btn-close-modal" (click)="closeLinkModal()">✕</button>
          </div>

          <form [formGroup]="linkForm" (ngSubmit)="submitLinkBank()" class="modal-form">
            <!-- Dropdown / Navdown Select Menu for Bank Selection -->
            <div class="form-group">
              <label class="input-label required">Select Bank / E-Wallet (Danh sách ngân hàng)</label>
              <div class="select-wrapper">
                <select
                  class="custom-select modal-select font-bold"
                  formControlName="bankName"
                  (change)="onBankDropdownChange($event)"
                >
                  <option value="">-- Choose Bank or E-Wallet --</option>
                  <option *ngFor="let b of popularBankOptions" [value]="b.name">
                    {{ b.name }} ({{ b.code }})
                  </option>
                  <option value="Other Bank">Other Bank / E-Wallet</option>
                </select>
                <svg class="select-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
            </div>

            <!-- Card / Account Number - Must be Entered by User -->
            <div class="form-group">
              <label class="input-label required">Account Number / Card Number (Số thẻ / tài khoản do bạn nhập)</label>
              <input
                type="text"
                class="modal-input font-mono font-bold"
                placeholder="Enter your exact account or card number..."
                formControlName="accountNumber"
              />
              <div class="form-error" *ngIf="linkForm.get('accountNumber')?.touched && linkForm.get('accountNumber')?.invalid">
                Card or Account number is required
              </div>
            </div>

            <!-- Account Holder Name -->
            <div class="form-group">
              <label class="input-label required">Account Holder Name (Tên chủ tài khoản)</label>
              <input
                type="text"
                class="modal-input"
                placeholder="e.g. NGUYEN VAN A"
                formControlName="accountHolder"
              />
            </div>

            <!-- Initial Bank Balance -->
            <div class="form-group">
              <label class="input-label required">Initial Bank Balance (VND)</label>
              <input
                type="number"
                class="modal-input font-mono"
                placeholder="5000000"
                formControlName="balance"
              />
            </div>

            <!-- Modal Actions -->
            <div class="modal-actions mt-20">
              <button type="button" class="btn-cancel" (click)="closeLinkModal()">Cancel</button>
              <button type="submit" class="btn-confirm-link" [disabled]="linkForm.invalid">Link Account Now ➔</button>
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
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes pulseGlow {
      0% { box-shadow: 0 0 0 0 rgba(5, 150, 105, 0.4); }
      70% { box-shadow: 0 0 0 10px rgba(5, 150, 105, 0); }
      100% { box-shadow: 0 0 0 0 rgba(5, 150, 105, 0); }
    }
    .fade-in-up { animation: fadeInUp 0.4s ease-out forwards; }

    .topup-page { display: flex; flex-direction: column; color: #0f172a; font-family: 'Inter', system-ui, sans-serif; position: static; }
    .flex-between { display: flex; justify-content: space-between; align-items: center; }
    .font-mono { font-family: monospace; font-weight: 700; }
    .font-bold { font-weight: 800; }
    .text-green { color: #059669; }

    .mb-8 { margin-bottom: 8px; }
    .mb-12 { margin-bottom: 12px; }
    .mb-16 { margin-bottom: 16px; }
    .mb-20 { margin-bottom: 20px; }
    .mb-24 { margin-bottom: 24px; }
    .mt-12 { margin-top: 12px; }
    .mt-20 { margin-top: 20px; }
    .mt-24 { margin-top: 24px; }

    .header-tag { font-size: 0.75rem; font-weight: 800; color: #059669; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 6px; }
    .page-header h2 { font-size: 2.1rem; font-weight: 800; margin: 0 0 6px 0; letter-spacing: -0.02em; }
    .subtitle { font-size: 0.975rem; color: #64748b; margin: 0; }

    .topup-grid { display: grid; grid-template-columns: 1.05fr 1.25fr; gap: 40px; width: 100%; max-width: 1280px; }
    .content-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 28px; padding: 38px 42px; box-shadow: 0 6px 24px -6px rgba(0,0,0,0.05); }

    .hero-tag { font-size: 0.72rem; font-weight: 800; color: #059669; letter-spacing: 0.06em; text-transform: uppercase; display: block; margin-bottom: 2px; }
    .card-title { font-size: 1.15rem; font-weight: 800; color: #0f172a; margin-top: 2px; }
    .status-chip { font-size: 0.72rem; font-weight: 800; padding: 4px 12px; border-radius: 12px; }
    .status-chip.active { background-color: #dcfce7; color: #15803d; border: 1px solid #a7f3d0; }

    .metallic-visa-card { color: #ffffff; border-radius: 22px; padding: 34px; position: relative; overflow: hidden; box-shadow: 0 14px 32px rgba(15, 23, 42, 0.2); transition: background 0.3s ease; }
    .card-top-row { display: flex; justify-content: space-between; align-items: center; }
    .visa-brand-logo { display: flex; align-items: center; gap: 10px; }
    .paygate-brand { font-size: 1.25rem; font-weight: 800; color: #ffffff; }
    .visa-tag { font-size: 0.85rem; font-weight: 900; font-style: italic; background: #ffffff; color: #0f172a; padding: 2px 9px; border-radius: 5px; }

    .emv-chip { width: 50px; height: 36px; background: linear-gradient(135deg, #fef08a 0%, #eab308 100%); border-radius: 8px; border: 1px solid #ca8a04; position: relative; overflow: hidden; }
    .chip-line.horizontal { position: absolute; top: 50%; left: 0; right: 0; height: 1px; background: rgba(0,0,0,0.25); }
    .chip-line.vertical { position: absolute; left: 50%; top: 0; bottom: 0; width: 1px; background: rgba(0,0,0,0.25); }

    .wallet-field-label { font-size: 0.72rem; font-weight: 700; letter-spacing: 0.07em; color: #ffffff; opacity: 0.85; }
    .card-num { font-size: 1.5rem; font-weight: 800; color: #ffffff; margin-top: 6px; }

    .card-bottom-row { display: flex; justify-content: space-between; align-items: flex-end; }
    .card-holder-name { font-size: 1.1rem; font-weight: 800; color: #ffffff; margin-top: 4px; }
    .expiry-date { font-size: 1.05rem; font-weight: 800; color: #ffffff; margin-top: 4px; }

    .wallet-balance-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 20px; padding: 28px; display: flex; flex-direction: column; gap: 14px; }
    .field-label { font-size: 0.825rem; font-weight: 700; color: #64748b; }
    .balance-display { font-size: 2.35rem; font-weight: 800; color: #0f172a; margin-top: 4px; }

    .after-topup-badge { background: #ecfdf5; border: 1px solid #a7f3d0; padding: 14px 20px; border-radius: 16px; font-size: 0.875rem; display: flex; flex-direction: column; gap: 4px; }
    .preview-lbl { font-size: 0.8rem; font-weight: 700; color: #047857; }
    .preview-val { font-size: 1.05rem; font-weight: 800; color: #059669; display: flex; align-items: center; gap: 8px; }

    /* Mode Selector Bar */
    .mode-selector-bar { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; background: #f1f5f9; padding: 5px; border-radius: 16px; margin-bottom: 24px; }
    .mode-tab-btn { display: flex; align-items: center; justify-content: center; gap: 8px; height: 44px; border: none; background: transparent; border-radius: 12px; font-size: 0.875rem; font-weight: 800; color: #64748b; cursor: pointer; transition: all 0.2s; }
    .mode-tab-btn:hover { color: #0f172a; }
    .mode-tab-btn.active { background: #ffffff; color: #059669; box-shadow: 0 4px 12px rgba(0,0,0,0.06); }

    .custom-topup-form { display: flex; flex-direction: column; gap: 24px; }
    .section-label { font-size: 0.925rem; font-weight: 700; color: #334155; margin-bottom: 14px; display: block; }

    .preset-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; }
    .preset-btn { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 16px 0; font-size: 0.95rem; font-weight: 800; color: #334155; cursor: pointer; transition: all 0.15s; }
    .preset-btn:hover { border-color: #cbd5e1; background-color: #ffffff; }
    .preset-btn.active { background-color: #ecfdf5; border-color: #059669; color: #059669; box-shadow: 0 0 0 2px #059669; }

    .input-wrapper { position: relative; display: flex; align-items: center; }
    .currency-prefix { position: absolute; left: 18px; font-weight: 800; color: #059669; font-size: 1.35rem; pointer-events: none; }
    .custom-amount-input { width: 100%; height: 56px; border: 1px solid #cbd5e1; border-radius: 14px; padding: 0 18px 0 46px; font-size: 1.2rem; font-weight: 800; color: #0f172a; background: #ffffff; outline: none; transition: all 0.15s; }
    .custom-amount-input:focus { border-color: #059669; box-shadow: 0 0 0 4px rgba(5, 150, 105, 0.15); }
    .error-msg { font-size: 0.825rem; color: #ef4444; margin-top: 6px; font-weight: 700; }

    .action-btn-group { display: flex; align-items: center; gap: 8px; }
    .btn-link-bank { background: #ecfdf5; border: 1px solid #059669; border-radius: 8px; padding: 5px 14px; font-size: 0.775rem; font-weight: 800; color: #059669; cursor: pointer; transition: all 0.15s; }
    .btn-link-bank:hover { background-color: #059669; color: #ffffff; }
    .btn-reset-mock { background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 5px 12px; font-size: 0.775rem; font-weight: 700; color: #475569; cursor: pointer; }

    .method-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
    .method-card { border: 1.5px solid #cbd5e1; border-radius: 16px; padding: 20px 14px; display: flex; flex-direction: column; align-items: center; gap: 10px; cursor: pointer; transition: all 0.25s ease; text-align: center; position: relative; }
    .method-card.active { box-shadow: 0 0 0 3px rgba(15, 23, 42, 0.25); }
    .method-card.insufficient { border-color: #fca5a5 !important; background-color: #fef2f2 !important; }

    .btn-unlink { position: absolute; top: 6px; right: 6px; background: rgba(0,0,0,0.06); border: none; border-radius: 50%; width: 20px; height: 20px; font-size: 11px; font-weight: 700; color: #64748b; cursor: pointer; }
    .method-icon-box { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 4px 10px rgba(0,0,0,0.12); }
    .method-icon-box svg { width: 24px; height: 24px; }
    .method-info { display: flex; flex-direction: column; gap: 2px; width: 100%; overflow: hidden; }
    .method-title { font-size: 0.875rem; font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .method-acc { font-size: 0.72rem; color: #64748b; }
    .method-balance { font-size: 0.72rem; font-weight: 700; }
    .text-danger { color: #dc2626 !important; font-weight: 800 !important; }

    .empty-linked-box { border: 2px dashed #cbd5e1; border-radius: 16px; padding: 28px; text-align: center; cursor: pointer; background: #f8fafc; display: flex; flex-direction: column; align-items: center; gap: 10px; }
    .empty-icon { display: flex; align-items: center; justify-content: center; width: 56px; height: 56px; border-radius: 50%; background: #ffffff; border: 1px solid #e2e8f0; }

    /* VietQR Info Box */
    .vietqr-info-box { background: linear-gradient(135deg, #eff6ff 0%, #ecfdf5 100%); border: 1px solid #bfdbfe; border-radius: 18px; padding: 20px; display: flex; flex-direction: column; gap: 8px; }
    .vietqr-badge-header { display: flex; align-items: center; justify-content: space-between; }
    .vqr-logo { font-size: 1.1rem; font-weight: 900; color: #1d4ed8; }
    .vqr-logo i { font-style: italic; color: #059669; }
    .vqr-tag { font-size: 0.72rem; font-weight: 800; background: #dbeafe; color: #1e40af; padding: 3px 10px; border-radius: 10px; }
    .vqr-desc { font-size: 0.85rem; color: #334155; margin: 0; line-height: 1.5; }

    .btn-emerald-submit { width: 100%; height: 56px; border: none; border-radius: 16px; color: #ffffff; font-size: 1.05rem; font-weight: 800; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 16px rgba(5, 150, 105, 0.35); }
    .btn-emerald-submit:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 6px 22px rgba(5, 150, 105, 0.45); }
    .btn-emerald-submit:disabled { opacity: 0.55; cursor: not-allowed; }
    .btn-content { display: flex; align-items: center; justify-content: center; gap: 8px; }

    /* 100% FULL-VIEWPORT OVERLAY (Covers 100vw x 100vh Edge-to-Edge) */
    .modal-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(15, 23, 42, 0.75); backdrop-filter: blur(10px); display: flex; align-items: center; justify-content: center; z-index: 99999; padding: 16px; box-sizing: border-box; }
    .modal-card { background: #ffffff; border-radius: 28px; padding: 32px; width: 100%; max-width: 480px; box-shadow: 0 25px 60px rgba(0,0,0,0.25); }
    .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .modal-header h3 { margin: 0; font-size: 1.25rem; font-weight: 800; color: #0f172a; }
    .btn-close-modal { background: #f1f5f9; border: none; border-radius: 50%; width: 32px; height: 32px; font-size: 14px; cursor: pointer; font-weight: 800; }

    /* Dropdown / Navdown Select Styling */
    .select-wrapper { position: relative; width: 100%; }
    .custom-select.modal-select {
      width: 100%;
      height: 48px;
      padding: 0 36px 0 14px;
      font-size: 0.95rem;
      font-weight: 700;
      color: #0f172a;
      background-color: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 12px;
      outline: none;
      appearance: none;
      cursor: pointer;
      transition: all 0.15s;
    }
    .custom-select.modal-select:focus { border-color: #059669; box-shadow: 0 0 0 3px rgba(5, 150, 105, 0.15); background-color: #ffffff; }
    .select-chevron { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); width: 16px; height: 16px; color: #94a3b8; pointer-events: none; }

    /* NON-OVERFLOWING SLEEK VIETQR MODAL */
    .vietqr-modal-card { background: #ffffff; border-radius: 28px; width: 100%; max-width: 620px; max-height: 85vh; box-shadow: 0 30px 80px rgba(0,0,0,0.4); display: flex; flex-direction: column; overflow: hidden; border: 1px solid rgba(255,255,255,0.2); }
    
    .vqr-banner-header { background: linear-gradient(135deg, #064e3b 0%, #047857 60%, #1d4ed8 100%); padding: 18px 24px; display: flex; justify-content: space-between; align-items: center; color: #ffffff; flex-shrink: 0; }
    .vqr-badge-pill { display: inline-flex; align-items: center; gap: 6px; font-size: 0.72rem; font-weight: 800; color: #a7f3d0; background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.25); padding: 3px 12px; border-radius: 20px; letter-spacing: 0.05em; margin-bottom: 4px; }
    .dot-live { width: 7px; height: 7px; background: #10b981; border-radius: 50%; box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.4); }

    .vqr-title-group h3 { margin: 0; font-size: 1.35rem; font-weight: 900; color: #ffffff; letter-spacing: -0.02em; }
    .btn-close-modal-light { background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.25); border-radius: 50%; width: 32px; height: 32px; font-size: 14px; color: #ffffff; cursor: pointer; font-weight: 800; transition: all 0.15s; }
    .btn-close-modal-light:hover { background: rgba(255,255,255,0.3); }

    .vqr-content-wrapper { padding: 20px 24px; display: flex; flex-direction: column; gap: 16px; overflow-y: auto; flex: 1; min-height: 0; }
    .modal-body-vqr { display: grid; grid-template-columns: 190px 1fr; gap: 20px; align-items: stretch; }

    .qr-display-box { display: flex; flex-direction: column; align-items: center; gap: 10px; justify-content: center; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 20px; padding: 14px; }
    .qr-image-wrapper { width: 155px; height: 155px; background: #ffffff; padding: 8px; border-radius: 16px; border: 2px solid #a7f3d0; box-shadow: 0 8px 20px rgba(4, 120, 87, 0.12); }
    .vqr-img { width: 100%; height: 100%; object-fit: contain; }

    .qr-timer-pill { display: flex; align-items: center; gap: 6px; font-size: 0.775rem; color: #047857; background: #ecfdf5; padding: 5px 14px; border-radius: 16px; border: 1px solid #a7f3d0; font-weight: 700; }

    .vqr-details-box { display: flex; flex-direction: column; gap: 8px; }
    .detail-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 9px 14px; display: flex; flex-direction: column; gap: 2px; }
    .detail-card.highlight-note { background: #f0fdf4; border-color: #a7f3d0; }
    
    .d-lbl { font-size: 0.65rem; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }
    .d-val { font-size: 0.875rem; color: #0f172a; }
    .amount-val { font-size: 1.15rem; font-weight: 900; color: #059669; }
    .acc-num { font-size: 1rem; font-weight: 800; color: #1e293b; letter-spacing: 0.04em; }

    .d-val-copy { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
    .text-note { color: #047857; font-weight: 900; font-size: 0.875rem; word-break: break-all; }

    .btn-copy-chip { background: #ffffff; border: 1px solid #059669; border-radius: 6px; padding: 2px 10px; font-size: 0.72rem; font-weight: 800; color: #059669; cursor: pointer; transition: all 0.15s; }
    .btn-copy-chip:hover { background: #059669; color: #ffffff; }

    .vqr-deep-links-bar { background: #f8fafc; border: 1px solid #e2e8f0; padding: 14px 18px; border-radius: 18px; display: flex; flex-direction: column; gap: 8px; }
    .deep-link-label { font-size: 0.775rem; font-weight: 800; color: #334155; }
    .apps-grid { display: flex; flex-wrap: wrap; gap: 8px; }
    .app-link-pill { padding: 6px 14px; border-radius: 10px; font-size: 0.775rem; font-weight: 800; color: #ffffff !important; text-decoration: none; transition: transform 0.15s, box-shadow 0.15s; box-shadow: 0 3px 8px rgba(0,0,0,0.1); }
    .app-link-pill:hover { transform: translateY(-2px); box-shadow: 0 5px 14px rgba(0,0,0,0.18); }

    .modal-footer-vqr { padding: 16px 24px; background: #ffffff; border-top: 1px solid #e2e8f0; display: grid; grid-template-columns: 1fr 2.5fr; gap: 12px; flex-shrink: 0; }
    .btn-cancel-modal { background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 12px; height: 46px; font-size: 0.875rem; font-weight: 800; color: #475569; cursor: pointer; transition: background 0.15s; }
    .btn-cancel-modal:hover { background: #e2e8f0; }
    .btn-confirm-vqr { background: linear-gradient(135deg, #059669 0%, #047857 100%); border: none; border-radius: 12px; height: 46px; font-size: 0.9rem; font-weight: 900; color: #ffffff; cursor: pointer; box-shadow: 0 4px 16px rgba(5, 150, 105, 0.35); transition: transform 0.15s; }
    .btn-confirm-vqr:hover { transform: translateY(-2px); }

    .modal-form { display: flex; flex-direction: column; gap: 14px; }
    .form-group { display: flex; flex-direction: column; gap: 6px; }
    .input-label { font-size: 0.825rem; font-weight: 700; color: #334155; }
    .input-label.required::after { content: ' *'; color: #ef4444; }
    .modal-input { height: 44px; border: 1px solid #cbd5e1; border-radius: 10px; padding: 0 14px; font-size: 0.9rem; outline: none; }
    .modal-input:focus { border-color: #059669; }
    .form-error { font-size: 0.78rem; color: #ef4444; font-weight: 600; }
    .modal-actions { display: grid; grid-template-columns: 1fr 1.5fr; gap: 12px; }
    .btn-cancel { height: 46px; border: 1px solid #cbd5e1; background: #ffffff; border-radius: 10px; font-weight: 700; color: #475569; cursor: pointer; }
    .btn-confirm-link { height: 46px; border: none; background: linear-gradient(135deg, #059669 0%, #047857 100%); border-radius: 10px; font-weight: 800; font-size: 0.95rem; color: #ffffff; cursor: pointer; }

    @media (max-width: 680px) {
      .modal-body-vqr { grid-template-columns: 1fr; }
      .modal-footer-vqr { grid-template-columns: 1fr; }
    }
  `]
})
export class TopUpComponent implements OnInit, OnDestroy {
  private vietQrService = inject(VietQrService);
  private accountService = inject(AccountService);
  private authService = inject(AuthService);
  private notification = inject(NotificationService);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  topUpForm!: FormGroup;
  linkForm!: FormGroup;
  submitting = false;
  showLinkModal = false;
  showVietQrModal = false;

  topUpMode = signal<'LINKED_BANK' | 'VIETQR'>('LINKED_BANK');
  
  accountBalance = 0;
  account: AccountResponse | null = null;
  selectedBankId: string = '';
  linkedBanks: LinkedBankSource[] = [];

  // Popular Vietnamese Banks options for navdown dropdown
  popularBankOptions: AvailableBankOption[] = [
    { code: 'VCB', name: 'Vietcombank', shortName: 'Vietcombank', iconType: 'BANK' },
    { code: 'MB', name: 'MB Bank', shortName: 'MB Bank', iconType: 'BANK' },
    { code: 'TCB', name: 'Techcombank', shortName: 'Techcombank', iconType: 'BANK' },
    { code: 'VPB', name: 'VPBank', shortName: 'VPBank', iconType: 'BANK' },
    { code: 'ACB', name: 'ACB', shortName: 'ACB Bank', iconType: 'BANK' },
    { code: 'CTG', name: 'VietinBank', shortName: 'VietinBank', iconType: 'BANK' },
    { code: 'BIDV', name: 'BIDV', shortName: 'BIDV Bank', iconType: 'BANK' },
    { code: 'VBA', name: 'Agribank', shortName: 'Agribank', iconType: 'BANK' },
    { code: 'TPB', name: 'TPBank', shortName: 'TPBank', iconType: 'BANK' },
    { code: 'STB', name: 'Sacombank', shortName: 'Sacombank', iconType: 'BANK' },
    { code: 'MOMO', name: 'MoMo E-Wallet', shortName: 'MoMo', iconType: 'MOMO' },
    { code: 'ZALO', name: 'ZaloPay E-Wallet', shortName: 'ZaloPay', iconType: 'MOMO' }
  ];

  // VietQR Specific Variables
  vietQrImageUrl = '';
  currentTransferNote = '';
  timerSeconds = 300; // 5 minutes
  timerInterval: any = null;
  bankingApps: BankDeepLink[] = [];

  presets = [
    { label: '100k', val: 100000 },
    { label: '500k', val: 500000 },
    { label: '1.000k', val: 1000000 },
    { label: '2.000k', val: 2000000 },
    { label: '5.000k', val: 5000000 }
  ];

  ngOnInit(): void {
    this.initForm();
    this.initLinkForm();
    this.bankingApps = this.vietQrService.getMobileBankingApps();

    this.accountService.account$.subscribe(acc => {
      if (acc) {
        this.account = acc;
        this.accountBalance = acc.balance;
      }
    });

    this.accountService.linkedBanks$.subscribe(banks => {
      if (banks && banks.length > 0) {
        this.linkedBanks = banks as any;
        if (!this.selectedBankId || !this.linkedBanks.some(b => b.id === this.selectedBankId)) {
          this.selectedBankId = this.linkedBanks[0].id;
        }
      }
    });

    this.loadLinkedBanks();
    this.loadAccountBalance();
  }

  ngOnDestroy(): void {
    this.clearTimer();
  }

  setTopUpMode(mode: 'LINKED_BANK' | 'VIETQR'): void {
    this.topUpMode.set(mode);
  }

  get formattedTimer(): string {
    const mins = Math.floor(this.timerSeconds / 60);
    const secs = this.timerSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  get currentAmount(): number {
    return Number(this.topUpForm?.value?.amount) || 0;
  }

  get currentSelectedBank(): LinkedBankSource | undefined {
    return this.linkedBanks.find(b => b.id === this.selectedBankId);
  }

  getUserFullName(): string {
    const user = this.authService.getUsername();
    if (!user) return 'PAYGATE USER';
    return user.split('@')[0].toUpperCase();
  }

  getBankTheme(bankName: string): BankTheme {
    const name = (bankName || '').toLowerCase();
    if (name.includes('mb bank') || name.includes('quân đội') || name.includes('mb')) {
      return { bg: '#eff6ff', border: '#1d4ed8', text: '#1e40af', gradient: 'linear-gradient(135deg, #1e40af 0%, #1d4ed8 100%)' };
    }
    if (name.includes('vietcombank') || name.includes('vcb')) {
      return { bg: '#ecfdf5', border: '#047857', text: '#065f46', gradient: 'linear-gradient(135deg, #047857 0%, #065f46 100%)' };
    }
    if (name.includes('techcombank') || name.includes('tcb')) {
      return { bg: '#fef2f2', border: '#dc2626', text: '#991b1b', gradient: 'linear-gradient(135deg, #b91c1c 0%, #991b1b 100%)' };
    }
    if (name.includes('vpbank') || name.includes('vpb')) {
      return { bg: '#f0fdf4', border: '#16a34a', text: '#15803d', gradient: 'linear-gradient(135deg, #15803d 0%, #16a34a 100%)' };
    }
    if (name.includes('acb')) {
      return { bg: '#f0f9ff', border: '#0284c7', text: '#0369a1', gradient: 'linear-gradient(135deg, #0369a1 0%, #0284c7 100%)' };
    }
    if (name.includes('vietinbank') || name.includes('ctg')) {
      return { bg: '#f0f9ff', border: '#0284c7', text: '#0284c7', gradient: 'linear-gradient(135deg, #0284c7 0%, #1d4ed8 100%)' };
    }
    if (name.includes('bidv')) {
      return { bg: '#f0fdf4', border: '#047857', text: '#065f46', gradient: 'linear-gradient(135deg, #065f46 0%, #047857 100%)' };
    }
    if (name.includes('agribank') || name.includes('vba')) {
      return { bg: '#fef2f2', border: '#b91c1c', text: '#881337', gradient: 'linear-gradient(135deg, #881337 0%, #9f1239 100%)' };
    }
    if (name.includes('tpbank') || name.includes('tpb')) {
      return { bg: '#faf5ff', border: '#7e22ce', text: '#6b21a8', gradient: 'linear-gradient(135deg, #6b21a8 0%, #7e22ce 100%)' };
    }
    if (name.includes('momo')) {
      return { bg: '#fdf2f8', border: '#db2777', text: '#9d174d', gradient: 'linear-gradient(135deg, #db2777 0%, #be185d 100%)' };
    }
    if (name.includes('zalo')) {
      return { bg: '#eff6ff', border: '#2563eb', text: '#1e40af', gradient: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)' };
    }
    return { bg: '#f1f5f9', border: '#94a3b8', text: '#334155', gradient: 'linear-gradient(135deg, #047857 0%, #064e3b 100%)' };
  }

  getSelectedCardGradient(): string {
    if (this.topUpMode() === 'VIETQR') {
      return 'linear-gradient(135deg, #1d4ed8 0%, #0284c7 50%, #047857 100%)';
    }
    if (this.currentSelectedBank) {
      return this.getBankTheme(this.currentSelectedBank.bankName).gradient;
    }
    return 'linear-gradient(135deg, #047857 0%, #065f46 50%, #064e3b 100%)';
  }

  getSubmitGradient(): string {
    if (this.topUpMode() === 'VIETQR') {
      return 'linear-gradient(135deg, #1d4ed8 0%, #0284c7 100%)';
    }
    if (this.currentSelectedBank) {
      return this.getBankTheme(this.currentSelectedBank.bankName).gradient;
    }
    return 'linear-gradient(135deg, #059669 0%, #047857 100%)';
  }

  private initForm(): void {
    this.topUpForm = this.fb.group({
      amount: [500000, [Validators.required, Validators.min(10000), Validators.max(1000000000)]]
    });
  }

  private initLinkForm(): void {
    this.linkForm = this.fb.group({
      bankName: ['Vietcombank', Validators.required],
      accountNumber: ['', [Validators.required, Validators.minLength(4)]],
      accountHolder: [this.getUserFullName(), Validators.required],
      balance: [5000000, [Validators.required, Validators.min(0)]],
      iconType: ['BANK']
    });
  }

  selectPreset(val: number): void {
    this.topUpForm.patchValue({ amount: val });
  }

  selectBank(id: string): void {
    this.selectedBankId = id;
  }

  onBankDropdownChange(event: Event): void {
    const selectedName = (event.target as HTMLSelectElement).value;
    const found = this.popularBankOptions.find(b => b.name === selectedName);
    if (found) {
      this.linkForm.patchValue({
        bankName: found.name,
        iconType: found.iconType
      });
    } else {
      this.linkForm.patchValue({
        bankName: selectedName,
        iconType: 'BANK'
      });
    }
    // Card/Account number MUST be entered manually by the user!
  }

  maskAccNum(num: string): string {
    if (!num || num.length < 4) return '••••';
    return '•••• ' + num.slice(-4);
  }

  isBankInsufficient(bank: LinkedBankSource): boolean {
    return bank.balance < this.currentAmount;
  }

  isCurrentBankInsufficient(): boolean {
    if (!this.currentSelectedBank) return false;
    return this.isBankInsufficient(this.currentSelectedBank);
  }

  openLinkModal(): void {
    this.showLinkModal = true;
    this.linkForm.reset({
      bankName: 'Vietcombank',
      accountNumber: '',
      accountHolder: this.getUserFullName(),
      balance: 5000000,
      iconType: 'BANK'
    });
  }

  closeLinkModal(): void {
    this.showLinkModal = false;
  }

  openVietQrModal(): void {
    const amount = this.currentAmount;
    const user = this.authService.getUsername() || 'user';
    const txRef = 'VQR' + Math.floor(100000 + Math.random() * 900000);
    this.currentTransferNote = `PAYGATE TOPUP ${user.split('@')[0].toUpperCase()} ${txRef}`;

    this.vietQrImageUrl = this.vietQrService.generateQrImageUrl(amount, this.currentTransferNote);
    this.showVietQrModal = true;
    this.startTimer();
  }

  closeVietQrModal(): void {
    this.showVietQrModal = false;
    this.clearTimer();
  }

  startTimer(): void {
    this.clearTimer();
    this.timerSeconds = 300;
    this.timerInterval = setInterval(() => {
      this.timerSeconds--;
      if (this.timerSeconds <= 0) {
        this.closeVietQrModal();
        this.notification.warning('Mã VietQR đã hết hạn. Vui lòng tạo lại mã mới.');
      }
    }, 1000);
  }

  clearTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  copyText(text: string, label: string): void {
    navigator.clipboard.writeText(text);
    this.notification.success(`Copied ${label}: ${text}`);
  }

  private performLocalTopUpSuccess(amount: number, methodId: string): void {
    const savedBal = localStorage.getItem('paygate_wallet_balance');
    const currentBal = savedBal !== null ? Number(savedBal) : (this.accountBalance || 0);
    const newBal = currentBal + amount;
    localStorage.setItem('paygate_wallet_balance', newBal.toString());

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
      description: methodId === 'vietqr' ? 'Nạp tiền VietQR Instant Scan' : 'Wallet Top Up via Linked Bank',
      createdAt: new Date().toISOString()
    };
    txns.unshift(newTxn);
    localStorage.setItem('paygate_mock_user_transactions', JSON.stringify(txns));

    if (methodId && methodId !== 'vietqr') {
      const savedBanks = localStorage.getItem('paygate_user_linked_banks');
      if (savedBanks) {
        let banks = JSON.parse(savedBanks);
        const bankIndex = banks.findIndex((b: any) => b.id == methodId);
        if (bankIndex !== -1) {
          const currentBankBal = Number(banks[bankIndex].balance) || 0;
          banks[bankIndex].balance = Math.max(0, currentBankBal - amount);
          localStorage.setItem('paygate_user_linked_banks', JSON.stringify(banks));
        }
      }
    }

    this.accountService.refreshAccountState();
    this.submitting = false;
    this.closeVietQrModal();
    this.notification.success(`Nạp thành công ${amount.toLocaleString('vi-VN')} VND vào ví PayGate!`);
    this.router.navigate(['/accounts/dashboard']);
  }

  confirmVietQrSuccess(): void {
    this.submitting = true;
    const amount = this.currentAmount;

    this.accountService.topUp({ amount, paymentMethodId: 'vietqr' } as any).subscribe({
      next: () => {
        this.performLocalTopUpSuccess(amount, 'vietqr');
      },
      error: () => {
        this.performLocalTopUpSuccess(amount, 'vietqr');
      }
    });
  }

  submitLinkBank(): void {
    if (this.linkForm.invalid) {
      this.linkForm.markAllAsTouched();
      return;
    }

    const req = this.linkForm.value;
    this.accountService.linkBank(req).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          const newBank = res.data as any;
          this.selectedBankId = newBank.id;
          this.notification.success(`Liên kết thành công tài khoản ${newBank.bankName}!`);
          this.closeLinkModal();
        }
      },
      error: () => {
        const newBank: LinkedBankSource = {
          id: 'bank-' + Date.now(),
          bankName: req.bankName,
          accountNumber: req.accountNumber,
          accountHolder: req.accountHolder || this.getUserFullName(),
          balance: req.balance,
          iconType: req.iconType as any,
          createdAt: new Date().toISOString()
        };
        this.linkedBanks.unshift(newBank);
        this.saveLinkedBanks();
        this.selectedBankId = newBank.id;
        this.notification.success(`Liên kết thành công tài khoản ${newBank.bankName}!`);
        this.closeLinkModal();
      }
    });
  }

  restoreDefaultBanks(): void {
    const defaults: LinkedBankSource[] = [
      {
        id: 'bank-vcb-01',
        bankName: 'Vietcombank',
        accountNumber: '998877665544',
        accountHolder: this.getUserFullName(),
        balance: 15000000,
        iconType: 'BANK'
      },
      {
        id: 'bank-mb-02',
        bankName: 'MB Bank',
        accountNumber: '0988123456',
        accountHolder: this.getUserFullName(),
        balance: 10000000,
        iconType: 'BANK'
      },
      {
        id: 'bank-tcb-03',
        bankName: 'Techcombank',
        accountNumber: '1903888999',
        accountHolder: this.getUserFullName(),
        balance: 8500000,
        iconType: 'BANK'
      },
      {
        id: 'bank-vp-04',
        bankName: 'VPBank',
        accountNumber: '2233445566',
        accountHolder: this.getUserFullName(),
        balance: 5000000,
        iconType: 'BANK'
      },
      {
        id: 'bank-momo-05',
        bankName: 'MoMo E-Wallet',
        accountNumber: '0988123456',
        accountHolder: this.getUserFullName(),
        balance: 2000000,
        iconType: 'MOMO'
      }
    ];
    this.linkedBanks = defaults;
    this.saveLinkedBanks();
    this.selectedBankId = defaults[0].id;
    this.notification.success('Đã khôi phục danh sách ngân hàng liên kết sẵn.');
  }

  unlinkBank(id: string, event: Event): void {
    event.stopPropagation();
    const bank = this.linkedBanks.find(b => b.id === id);
    if (!bank) return;

    this.accountService.unlinkBank(id).subscribe({
      next: () => {
        this.linkedBanks = this.linkedBanks.filter(b => b.id !== id);
        this.saveLinkedBanks();
        if (this.selectedBankId === id) {
          this.selectedBankId = this.linkedBanks.length > 0 ? this.linkedBanks[0].id : '';
        }
        this.notification.info(`Đã hủy liên kết tài khoản ${bank.bankName}.`);
      },
      error: () => {
        this.linkedBanks = this.linkedBanks.filter(b => b.id !== id);
        this.saveLinkedBanks();
        if (this.selectedBankId === id) {
          this.selectedBankId = this.linkedBanks.length > 0 ? this.linkedBanks[0].id : '';
        }
        this.notification.info(`Đã hủy liên kết tài khoản ${bank.bankName}.`);
      }
    });
  }

  onSubmit(): void {
    if (this.topUpForm.invalid) return;

    if (this.topUpMode() === 'VIETQR') {
      this.openVietQrModal();
      return;
    }

    if (!this.currentSelectedBank) {
      this.notification.error('Vui lòng chọn ngân hàng nguồn để nạp tiền.');
      return;
    }

    if (this.isCurrentBankInsufficient()) {
      this.notification.error(`Số dư ngân hàng ${this.currentSelectedBank.bankName} không đủ.`);
      return;
    }

    this.submitting = true;
    const amount = this.currentAmount;
    const methodId = this.selectedBankId;

    this.accountService.topUp({ amount, paymentMethodId: methodId } as any).subscribe({
      next: () => {
        this.performLocalTopUpSuccess(amount, methodId);
      },
      error: () => {
        this.performLocalTopUpSuccess(amount, methodId);
      }
    });
  }

  private loadLinkedBanks(): void {
    const saved = localStorage.getItem('paygate_user_linked_banks');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.length > 0) {
        this.linkedBanks = parsed;
        if (!this.selectedBankId) {
          this.selectedBankId = this.linkedBanks[0].id;
        }
        return;
      }
    }

    this.restoreDefaultBanks();
  }

  private saveLinkedBanks(): void {
    localStorage.setItem('paygate_user_linked_banks', JSON.stringify(this.linkedBanks));
  }

  private loadAccountBalance(): void {
    this.accountService.getAccountMe().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.account = res.data;
          this.accountBalance = res.data.balance;
        }
      }
    });
  }
}
