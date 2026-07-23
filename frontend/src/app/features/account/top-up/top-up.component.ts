import { Component, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AccountService } from '../../../core/services/account.service';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { AccountResponse } from '../../../core/models/account.model';

export interface LinkedBankSource {
  id: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  balance: number;
  iconType: 'BANK' | 'CARD' | 'MOMO';
  createdAt: string;
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
      <!-- Top Header Banner -->
      <div class="page-header text-center">
        <div class="header-tag">PAYGATE INSTANT TOP UP</div>
        <h2>Top Up Wallet</h2>
        <p class="subtitle">Add funds to your PayGate balance via linked payment sources.</p>
      </div>

      <!-- 2-Column Main Grid Layout (Spacious 1200px Grid) -->
      <div class="topup-grid">
        <!-- LEFT COLUMN: Large Metallic Visa Card + Real-time Balance Box -->
        <div class="left-card-column">
          <div class="content-card visa-card-wrapper hover-lift">
            <div class="card-header-flex mb-20">
              <div>
                <span class="hero-tag">PAYGATE VISA DEBIT</span>
                <div class="card-title">Digital Wallet Card</div>
              </div>
              <span class="status-chip active">ACTIVE</span>
            </div>

            <!-- Large Metallic Shimmer Visa Card -->
            <div class="metallic-visa-card shimmer-box">
              <div class="card-top-row">
                <div class="visa-brand-logo">
                  <span class="paygate-brand">PayGate</span>
                  <span class="visa-tag">VISA</span>
                </div>
                <div class="card-contactless">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#a7f3d0" stroke-width="2.2">
                    <path d="M5 12.55a11 11 0 0 1 14.08 0" />
                    <path d="M1.42 9a16 16 0 0 1 21.16 0" />
                    <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
                    <line x1="12" y1="20" x2="12.01" y2="20" stroke-width="3.5"/>
                  </svg>
                </div>
              </div>

              <!-- Large EMV Chip -->
              <div class="card-chip-row mt-20">
                <div class="emv-chip">
                  <div class="chip-line horizontal"></div>
                  <div class="chip-line vertical"></div>
                </div>
              </div>

              <div class="card-mid-section mt-24">
                <div class="wallet-field-label">CARD NUMBER</div>
                <div class="card-num font-mono">4532 •••• •••• {{ account?.id ? ('000' + account?.id).slice(-4) : '8892' }}</div>
              </div>

              <div class="card-bottom-row mt-24">
                <div>
                  <div class="wallet-field-label">CARD HOLDER</div>
                  <div class="card-holder-name">{{ getUserFullName() }}</div>
                </div>
                <div class="card-expiry">
                  <div class="wallet-field-label">EXPIRES</div>
                  <div class="expiry-date">12/28</div>
                </div>
              </div>
            </div>

            <!-- Large Balance Details Box Under Visa Card -->
            <div class="wallet-balance-box mt-24">
              <div class="balance-meta">
                <span class="field-label">Current PayGate Balance</span>
                <div class="balance-display">{{ accountBalance | currency:'VND':'symbol':'1.0-0' }}</div>
              </div>

              <div class="after-topup-badge mt-16">
                <span class="preview-lbl">Preview balance after top-up:</span>
                <strong class="preview-val">
                  +{{ currentAmount | currency:'VND':'symbol':'1.0-0' }}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                  {{ (accountBalance + currentAmount) | currency:'VND':'symbol':'1.0-0' }}
                </strong>
              </div>
            </div>
          </div>
        </div>

        <!-- RIGHT COLUMN: Prominent Large Top Up Form -->
        <div class="right-form-column">
          <div class="content-card form-card hover-lift">
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

              <!-- Dynamic Linked Payment Sources Section -->
              <div class="form-section">
                <div class="flex-between mb-12">
                  <label class="section-label mb-0">Select Linked Payment Source</label>
                  <div class="action-btn-group">
                    <button type="button" class="btn-link-bank" (click)="openLinkModal()">
                      + Liên kết ngân hàng mới
                    </button>
                    <button type="button" class="btn-reset-mock" (click)="resetMockBalances()" title="Dọn danh sách" *ngIf="linkedBanks.length > 0">
                      Clear
                    </button>
                  </div>
                </div>

                <!-- Dynamic Grid of User's Linked Banks -->
                <div class="method-grid" *ngIf="linkedBanks.length > 0">
                  <div
                    *ngFor="let bank of linkedBanks"
                    class="method-card"
                    [class.active]="selectedBankId === bank.id"
                    [class.insufficient]="isBankInsufficient(bank)"
                    (click)="selectBank(bank.id)">
                    <button type="button" class="btn-unlink" (click)="unlinkBank(bank.id, $event)" title="Hủy liên kết">
                      ✕
                    </button>
                    <div class="method-icon-box">
                      <svg *ngIf="bank.iconType === 'BANK'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                        <line x1="3" y1="21" x2="21" y2="21" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                        <polyline points="12 3 2 10 22 10 12 3" />
                        <line x1="6" y1="10" x2="6" y2="21" />
                        <line x1="10" y1="10" x2="10" y2="21" />
                        <line x1="14" y1="10" x2="14" y2="21" />
                        <line x1="18" y1="10" x2="18" y2="21" />
                      </svg>
                      <svg *ngIf="bank.iconType === 'CARD'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                        <line x1="1" y1="10" x2="23" y2="10" />
                      </svg>
                      <svg *ngIf="bank.iconType === 'MOMO'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                        <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                        <line x1="12" y1="18" x2="12.01" y2="18" />
                      </svg>
                    </div>
                    <div class="method-info">
                      <span class="method-title">{{ bank.bankName }}</span>
                      <span class="method-acc font-mono">{{ maskAccNum(bank.accountNumber) }}</span>
                      <span class="method-balance" [class.text-danger]="isBankInsufficient(bank)">
                        Hạn mức: {{ bank.balance | currency:'VND':'symbol':'1.0-0' }}
                      </span>
                    </div>
                  </div>
                </div>

                <!-- Clean SVG Empty State if No Bank Linked -->
                <div *ngIf="linkedBanks.length === 0" class="empty-linked-box" (click)="openLinkModal()">
                  <div class="empty-icon">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="1.8">
                      <line x1="3" y1="21" x2="21" y2="21" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                      <polyline points="12 3 2 10 22 10 12 3" />
                      <line x1="6" y1="10" x2="6" y2="21" />
                      <line x1="10" y1="10" x2="10" y2="21" />
                      <line x1="14" y1="10" x2="14" y2="21" />
                      <line x1="18" y1="10" x2="18" y2="21" />
                    </svg>
                  </div>
                  <div class="empty-text">
                    <strong>Chưa có ngân hàng nào được liên kết</strong>
                    <span>Nhấn vào đây để thực hiện liên kết ngân hàng/ví điện tử mới</span>
                  </div>
                </div>

                <!-- Clean Warning Banner if Selected Source Insufficient -->
                <div class="insufficient-banner mt-16" *ngIf="isCurrentBankInsufficient()">
                  <div class="banner-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                      <line x1="12" y1="9" x2="12" y2="13"/>
                      <line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                  </div>
                  <div class="banner-text">
                    <strong>Số dư nguồn {{ currentSelectedBank?.bankName }} không đủ!</strong>
                    <span>Bạn muốn nạp <strong>{{ currentAmount | currency:'VND':'symbol':'1.0-0' }}</strong> nhưng số dư nguồn này chỉ còn <strong>{{ currentSelectedBank?.balance | currency:'VND':'symbol':'1.0-0' }}</strong> (Thiếu {{ (currentAmount - (currentSelectedBank?.balance || 0)) | currency:'VND':'symbol':'1.0-0' }}).</span>
                  </div>
                </div>
              </div>

              <!-- Prominent Submit Button -->
              <div class="submit-action mt-28">
                <button
                  class="btn-emerald-submit pulse-glow"
                  type="submit"
                  [disabled]="topUpForm.invalid || submitting || !currentSelectedBank || isCurrentBankInsufficient()">
                  <span *ngIf="!submitting" class="btn-content">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="16" />
                      <line x1="8" y1="12" x2="16" y2="12" />
                    </svg>
                    Top up {{ currentAmount | currency:'VND':'symbol':'1.0-0' }} via {{ currentSelectedBank?.bankName || 'Ngân hàng' }} ↗
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
    </div>

    <!-- MODAL DIALOG: LINK NEW BANK ACCOUNT (Full Viewport Blur) -->
    <div class="link-modal-overlay" *ngIf="showLinkModal">
      <div class="link-modal-card fade-in-up">
        <div class="modal-header">
          <div class="modal-title-group">
            <span class="modal-tag">PAYGATE BANK LINK</span>
            <h3>Liên Kết Ngân Hàng Mới</h3>
            <p class="modal-sub">Nhập thông tin tài khoản ngân hàng hoặc ví điện tử để thêm vào danh sách liên kết.</p>
          </div>
          <button type="button" class="btn-close-modal" (click)="closeLinkModal()">✕</button>
        </div>

        <form [formGroup]="linkForm" (ngSubmit)="confirmLinkBank()" class="modal-form">
          <!-- Bank Select / Provider -->
          <div class="form-group">
            <label class="input-label">Tên Ngân hàng / Ví điện tử</label>
            <select formControlName="bankName" class="modal-select">
              <option value="MB Bank">MB Bank (Ngân hàng Quân Đội)</option>
              <option value="Vietcombank">Vietcombank (VCB)</option>
              <option value="Techcombank">Techcombank (TCB)</option>
              <option value="VPBank">VPBank</option>
              <option value="BIDV">BIDV</option>
              <option value="Agribank">Agribank</option>
              <option value="ACB">ACB (Á Châu)</option>
              <option value="MoMo Wallet">Ví điện tử MoMo</option>
              <option value="ZaloPay">Ví ZaloPay</option>
              <option value="Napas ATM Card">Thẻ ATM Nội Địa Napas</option>
            </select>
          </div>

          <!-- Account / Card Number -->
          <div class="form-group">
            <label class="input-label">Số Tài Khoản / Số Thẻ (Nhập tay tự do)</label>
            <input
              type="text"
              formControlName="accountNumber"
              placeholder="VD: 9704 2200 1199 8812..."
              class="modal-input">
          </div>

          <!-- Account Holder Name -->
          <div class="form-group">
            <label class="input-label">Tên Chủ Tài Khoản</label>
            <input
              type="text"
              formControlName="accountHolder"
              placeholder="VD: NGUYEN VAN A..."
              class="modal-input uppercase">
          </div>

          <!-- Initial Mock Balance / Limit -->
          <div class="form-group">
            <label class="input-label">Hạn mức / Số dư ban đầu (Mock Balance - VND)</label>
            <div class="input-wrapper">
              <span class="currency-prefix">₫</span>
              <input
                type="number"
                formControlName="balance"
                placeholder="VD: 5000000"
                class="modal-input pl-36">
            </div>
          </div>

          <!-- Modal Action Bar -->
          <div class="modal-action-bar mt-20">
            <button type="button" class="btn-cancel" (click)="closeLinkModal()">Hủy bỏ</button>
            <button type="submit" class="btn-confirm-link" [disabled]="linkForm.invalid">
              + Xác Nhận Liên Kết
            </button>
          </div>
        </form>
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
    @keyframes shimmer {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }
    .fade-in-up { animation: fadeInUp 0.4s ease-out forwards; }

    .topup-page { display: flex; flex-direction: column; gap: 32px; color: #0f172a; align-items: center; font-family: 'Inter', system-ui, sans-serif; padding-bottom: 40px; }
    .text-center { text-align: center; }
    .flex-between { display: flex; justify-content: space-between; align-items: center; }
    .mb-8 { margin-bottom: 8px; }
    .mb-12 { margin-bottom: 12px; }
    .mb-16 { margin-bottom: 16px; }
    .mb-20 { margin-bottom: 20px; }
    .mb-0 { margin-bottom: 0 !important; }
    .mt-12 { margin-top: 12px; }
    .mt-16 { margin-top: 16px; }
    .mt-20 { margin-top: 20px; }
    .mt-24 { margin-top: 24px; }
    .mt-28 { margin-top: 28px; }
    
    .header-tag { font-size: 0.75rem; font-weight: 800; color: #059669; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 6px; }
    .page-header h2 { font-size: 2.1rem; font-weight: 800; margin: 0 0 6px 0; letter-spacing: -0.02em; }
    .subtitle { font-size: 0.975rem; color: #64748b; margin: 0; }

    /* Spacious 2-Column Grid Layout (1200px Max-Width) */
    .topup-grid { display: grid; grid-template-columns: 1.1fr 1.25fr; gap: 36px; width: 100%; max-width: 1200px; }

    .content-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 24px; padding: 34px; box-shadow: 0 6px 24px -6px rgba(0,0,0,0.05); }
    .hover-lift { transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s cubic-bezier(0.16, 1, 0.3, 1); }
    .hover-lift:hover { transform: translateY(-3px); box-shadow: 0 20px 40px -10px rgba(15, 23, 42, 0.09); }

    /* Left Column: Large Metallic Visa Glass Card */
    .card-header-flex { display: flex; justify-content: space-between; align-items: flex-start; }
    .hero-tag { font-size: 0.72rem; font-weight: 800; color: #059669; letter-spacing: 0.06em; text-transform: uppercase; display: block; margin-bottom: 2px; }
    .card-title { font-size: 1.15rem; font-weight: 800; color: #0f172a; margin-top: 2px; }
    .status-chip { font-size: 0.72rem; font-weight: 800; padding: 4px 12px; border-radius: 12px; letter-spacing: 0.04em; }
    .status-chip.active { background-color: #dcfce7; color: #15803d; border: 1px solid #a7f3d0; }

    .metallic-visa-card {
      background: linear-gradient(135deg, #047857 0%, #065f46 50%, #064e3b 100%);
      color: #ffffff;
      border-radius: 20px;
      padding: 30px;
      position: relative;
      overflow: hidden;
      box-shadow: 0 14px 32px rgba(4, 120, 87, 0.3);
    }
    .shimmer-box::after { content: ''; position: absolute; top: -50%; left: -50%; width: 200%; height: 200%; background: linear-gradient(60deg, transparent 30%, rgba(255,255,255,0.14) 50%, transparent 70%); transform: rotate(30deg); transition: transform 0.6s; }
    .metallic-visa-card:hover::after { animation: shimmer 1.5s infinite; }

    .card-top-row { display: flex; justify-content: space-between; align-items: center; }
    .visa-brand-logo { display: flex; align-items: center; gap: 10px; }
    .paygate-brand { font-size: 1.25rem; font-weight: 800; letter-spacing: -0.01em; color: #ffffff; }
    .visa-tag { font-size: 0.85rem; font-weight: 900; font-style: italic; background: #ffffff; color: #047857; padding: 2px 9px; border-radius: 5px; letter-spacing: 0.06em; }

    /* Large EMV Chip */
    .emv-chip { width: 50px; height: 36px; background: linear-gradient(135deg, #fef08a 0%, #eab308 100%); border-radius: 8px; border: 1px solid #ca8a04; position: relative; overflow: hidden; }
    .chip-line.horizontal { position: absolute; top: 50%; left: 0; right: 0; height: 1px; background: rgba(0,0,0,0.25); }
    .chip-line.vertical { position: absolute; left: 50%; top: 0; bottom: 0; width: 1px; background: rgba(0,0,0,0.25); }

    .wallet-field-label { font-size: 0.72rem; font-weight: 700; letter-spacing: 0.07em; color: #a7f3d0; opacity: 0.95; text-transform: uppercase; }
    .card-num { font-size: 1.5rem; font-weight: 800; color: #ffffff; letter-spacing: 0.08em; margin-top: 6px; text-shadow: 0 2px 4px rgba(0,0,0,0.25); }

    .card-bottom-row { display: flex; justify-content: space-between; align-items: flex-end; }
    .card-holder-name { font-size: 1.1rem; font-weight: 800; color: #ffffff; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 4px; }
    .expiry-date { font-size: 1.05rem; font-weight: 800; color: #ffffff; margin-top: 4px; font-family: monospace; }

    /* Large Wallet Balance Details Box Under Visa Card */
    .wallet-balance-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 18px; padding: 24px; display: flex; flex-direction: column; gap: 12px; }
    .field-label { font-size: 0.825rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }
    .balance-display { font-size: 2.35rem; font-weight: 800; color: #0f172a; margin-top: 4px; letter-spacing: -0.02em; }

    .after-topup-badge { background: #ecfdf5; border: 1px solid #a7f3d0; padding: 12px 18px; border-radius: 14px; font-size: 0.85rem; display: flex; flex-direction: column; gap: 4px; }
    .preview-lbl { font-size: 0.8rem; font-weight: 700; color: #047857; }
    .preview-val { font-size: 1.05rem; font-weight: 800; color: #059669; display: flex; align-items: center; gap: 8px; }

    /* Form Sections */
    .custom-topup-form { display: flex; flex-direction: column; gap: 26px; }
    .section-label { font-size: 0.9rem; font-weight: 700; color: #334155; margin-bottom: 12px; display: block; }
    
    .action-btn-group { display: flex; align-items: center; gap: 8px; }
    .btn-link-bank { background: #ecfdf5; border: 1px solid #059669; border-radius: 8px; padding: 4px 12px; font-size: 0.775rem; font-weight: 800; color: #059669; cursor: pointer; transition: all 0.15s; }
    .btn-link-bank:hover { background-color: #059669; color: #ffffff; }

    .btn-reset-mock { background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 4px 10px; font-size: 0.775rem; font-weight: 700; color: #475569; cursor: pointer; transition: all 0.15s; }
    .btn-reset-mock:hover { background-color: #f1f5f9; color: #0f172a; border-color: #94a3b8; }

    /* Large Preset Grid */
    .preset-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; }
    .preset-btn { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 15px 0; font-size: 0.95rem; font-weight: 800; color: #334155; cursor: pointer; transition: all 0.15s; }
    .preset-btn:hover { border-color: #cbd5e1; background-color: #ffffff; }
    .preset-btn.active { background-color: #ecfdf5; border-color: #059669; color: #059669; box-shadow: 0 0 0 2px #059669; }

    /* Large Custom Amount Input */
    .input-wrapper { position: relative; display: flex; align-items: center; }
    .currency-prefix { position: absolute; left: 16px; font-weight: 800; color: #059669; font-size: 1.3rem; pointer-events: none; }
    .custom-amount-input { width: 100%; height: 54px; border: 1px solid #cbd5e1; border-radius: 12px; padding: 0 16px 0 42px; font-size: 1.15rem; font-weight: 800; color: #0f172a; background: #ffffff; outline: none; transition: all 0.15s; box-sizing: border-box; }
    .custom-amount-input:focus { border-color: #059669; box-shadow: 0 0 0 3.5px rgba(5, 150, 105, 0.15); }
    .error-msg { font-size: 0.825rem; color: #ef4444; margin-top: 6px; font-weight: 700; }

    /* Dynamic Linked Method Selector Grid */
    .method-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
    .method-card { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 18px 10px; display: flex; flex-direction: column; align-items: center; gap: 8px; cursor: pointer; transition: all 0.2s; text-align: center; position: relative; }
    .method-card:hover { border-color: #cbd5e1; background-color: #ffffff; transform: translateY(-2px); }
    .method-card.active { background-color: #ecfdf5; border-color: #059669; box-shadow: 0 0 0 2px #059669; }
    .method-card.insufficient { border-color: #fca5a5; background-color: #fef2f2; }
    .method-card.insufficient.active { border-color: #ef4444; box-shadow: 0 0 0 2px #ef4444; }

    .btn-unlink { position: absolute; top: 6px; right: 6px; background: rgba(0,0,0,0.05); border: none; border-radius: 50%; width: 20px; height: 20px; font-size: 11px; font-weight: 700; color: #64748b; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s; }
    .btn-unlink:hover { background: #fee2e2; color: #dc2626; }

    .method-icon-box { width: 44px; height: 44px; border-radius: 12px; background: #ffffff; border: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: center; color: #64748b; flex-shrink: 0; }
    .method-card.active .method-icon-box { background: #059669; border-color: #059669; color: #ffffff; }
    .method-card.insufficient.active .method-icon-box { background: #dc2626; border-color: #dc2626; color: #ffffff; }
    .method-icon-box svg { width: 24px; height: 24px; }

    .method-info { display: flex; flex-direction: column; gap: 2px; width: 100%; overflow: hidden; }
    .method-title { font-size: 0.875rem; font-weight: 800; color: #334155; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .method-acc { font-size: 0.72rem; color: #64748b; }
    .method-card.active .method-title { color: #059669; }
    .method-card.insufficient.active .method-title { color: #dc2626; }
    .method-balance { font-size: 0.72rem; font-weight: 600; color: #64748b; }
    .text-danger { color: #dc2626 !important; font-weight: 700 !important; }

    .empty-linked-box { border: 2px dashed #cbd5e1; border-radius: 16px; padding: 28px; text-align: center; cursor: pointer; background: #f8fafc; transition: all 0.15s; display: flex; flex-direction: column; align-items: center; gap: 10px; }
    .empty-linked-box:hover { border-color: #059669; background: #ecfdf5; }
    .empty-icon { display: flex; align-items: center; justify-content: center; width: 56px; height: 56px; border-radius: 50%; background: #ffffff; border: 1px solid #e2e8f0; }
    .empty-text { display: flex; flex-direction: column; gap: 2px; color: #475569; font-size: 0.875rem; }
    .empty-text strong { color: #059669; font-size: 0.975rem; }

    /* Insufficient Balance Banner */
    .insufficient-banner {
      background: #fef2f2; border: 1px solid #fecaca; border-radius: 14px; padding: 14px 18px;
      display: flex; gap: 14px; align-items: flex-start; color: #991b1b; font-size: 0.85rem;
    }
    .banner-icon { flex-shrink: 0; margin-top: 2px; }
    .banner-text { display: flex; flex-direction: column; gap: 3px; line-height: 1.45; }
    .banner-text strong { font-weight: 800; color: #b91c1c; }

    /* Prominent Submit Button */
    .btn-emerald-submit {
      width: 100%;
      height: 56px;
      border: none;
      border-radius: 14px;
      background: linear-gradient(135deg, #059669 0%, #047857 100%);
      color: #ffffff;
      font-size: 1.05rem;
      font-weight: 800;
      cursor: pointer;
      box-shadow: 0 6px 18px rgba(5, 150, 105, 0.35);
      transition: all 0.2s;
    }
    .btn-emerald-submit:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(5, 150, 105, 0.45); }
    .btn-emerald-submit:disabled { opacity: 0.55; cursor: not-allowed; box-shadow: none; background: #94a3b8; }
    
    .btn-content { display: flex; align-items: center; justify-content: center; gap: 10px; }
    .btn-spinner { width: 22px; height: 22px; border: 2.5px solid rgba(255, 255, 255, 0.3); border-top-color: #ffffff; border-radius: 50%; animation: spin 0.7s linear infinite; }

    /* Fullscreen Modal Backdrop (100vw / 100vh) */
    .link-modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(15, 23, 42, 0.65);
      backdrop-filter: blur(8px);
      z-index: 99999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      box-sizing: border-box;
    }
    .link-modal-card {
      background: #ffffff;
      border-radius: 24px;
      width: 100%;
      max-width: 520px;
      padding: 32px;
      box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .modal-header { display: flex; justify-content: space-between; align-items: flex-start; }
    .modal-tag { font-size: 0.7rem; font-weight: 800; color: #059669; letter-spacing: 0.05em; text-transform: uppercase; }
    .modal-title-group h3 { font-size: 1.4rem; font-weight: 800; color: #0f172a; margin: 4px 0; }
    .modal-sub { font-size: 0.85rem; color: #64748b; margin: 0; }
    .btn-close-modal { background: #f1f5f9; border: none; border-radius: 50%; width: 32px; height: 32px; font-size: 16px; font-weight: 700; color: #64748b; cursor: pointer; }
    .btn-close-modal:hover { background: #e2e8f0; color: #0f172a; }

    .modal-form { display: flex; flex-direction: column; gap: 16px; }
    .form-group { display: flex; flex-direction: column; gap: 6px; }
    .input-label { font-size: 0.825rem; font-weight: 700; color: #334155; }
    .modal-input { height: 46px; border: 1px solid #cbd5e1; border-radius: 10px; padding: 0 14px; font-size: 0.95rem; font-weight: 700; color: #0f172a; outline: none; transition: border-color 0.15s; }
    .modal-input:focus { border-color: #059669; box-shadow: 0 0 0 3px rgba(5, 150, 105, 0.12); }
    .modal-input.uppercase { text-transform: uppercase; }
    .modal-select { height: 46px; border: 1px solid #cbd5e1; border-radius: 10px; padding: 0 14px; font-size: 0.95rem; font-weight: 700; color: #0f172a; background: #ffffff; outline: none; }
    .pl-36 { padding-left: 36px; }

    .modal-action-bar { display: grid; grid-template-columns: 1fr 1.5fr; gap: 12px; }
    .btn-cancel { height: 46px; border: 1px solid #cbd5e1; background: #ffffff; border-radius: 10px; font-weight: 700; font-size: 0.9rem; color: #475569; cursor: pointer; }
    .btn-cancel:hover { background: #f8fafc; color: #0f172a; }
    .btn-confirm-link { height: 46px; border: none; background: linear-gradient(135deg, #059669 0%, #047857 100%); border-radius: 10px; font-weight: 800; font-size: 0.95rem; color: #ffffff; cursor: pointer; box-shadow: 0 4px 14px rgba(5, 150, 105, 0.3); }
    .btn-confirm-link:disabled { opacity: 0.55; cursor: not-allowed; }

    @media (max-width: 960px) {
      .topup-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class TopUpComponent implements OnInit {
  topUpForm!: FormGroup;
  linkForm!: FormGroup;
  submitting = false;
  showLinkModal = false;
  accountBalance = 0;
  account: AccountResponse | null = null;
  selectedBankId: string = '';

  // Dynamic user's linked banks list stored in localStorage (Empty for new users)
  linkedBanks: LinkedBankSource[] = [];

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
    private authService: AuthService,
    private notification: NotificationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.initLinkForm();
    this.loadLinkedBanks();
    this.loadAccountBalance();
  }

  get currentAmount(): number {
    return Number(this.topUpForm?.value?.amount) || 0;
  }

  get currentSelectedBank(): LinkedBankSource | undefined {
    return this.linkedBanks.find(b => b.id === this.selectedBankId);
  }

  getUserFullName(): string {
    const user = this.authService.getUsername();
    if (!user) return 'NGUYEN VAN A';
    return user.split('@')[0].toUpperCase();
  }

  private initForm(): void {
    this.topUpForm = this.fb.group({
      amount: [500000, [Validators.required, Validators.min(10000), Validators.max(1000000000)]],
      description: ['Nạp tiền vào ví PayGate']
    });
  }

  private initLinkForm(): void {
    this.linkForm = this.fb.group({
      bankName: ['MB Bank', [Validators.required]],
      accountNumber: ['9704 2200 1199 8812', [Validators.required]],
      accountHolder: [this.getUserFullName(), [Validators.required]],
      balance: [5000000, [Validators.required, Validators.min(0)]]
    });
  }

  private loadLinkedBanks(): void {
    const saved = localStorage.getItem('paygate_user_linked_banks');
    if (saved) {
      try {
        this.linkedBanks = JSON.parse(saved);
      } catch (e) {
        this.linkedBanks = [];
      }
    } else {
      // Clean empty array for new users without default pre-filled mock banks
      this.linkedBanks = [];
    }

    if (this.linkedBanks.length > 0 && !this.selectedBankId) {
      this.selectedBankId = this.linkedBanks[0].id;
    }
  }

  private saveLinkedBanks(): void {
    localStorage.setItem('paygate_user_linked_banks', JSON.stringify(this.linkedBanks));
  }

  resetMockBalances(): void {
    localStorage.removeItem('paygate_user_linked_banks');
    this.linkedBanks = [];
    this.selectedBankId = '';
    this.notification.info('Đã xóa sạch danh sách ngân hàng liên kết!');
  }

  openLinkModal(): void {
    this.initLinkForm();
    this.showLinkModal = true;
  }

  closeLinkModal(): void {
    this.showLinkModal = false;
  }

  confirmLinkBank(): void {
    if (this.linkForm.invalid) return;

    const val = this.linkForm.value;
    const isMoMo = val.bankName.toLowerCase().includes('momo') || val.bankName.toLowerCase().includes('zalo');
    const isCard = val.bankName.toLowerCase().includes('napas') || val.bankName.toLowerCase().includes('thẻ');

    const newBank: LinkedBankSource = {
      id: 'bank-' + Date.now(),
      bankName: val.bankName,
      accountNumber: val.accountNumber,
      accountHolder: (val.accountHolder || '').toUpperCase(),
      balance: Number(val.balance) || 5000000,
      iconType: isMoMo ? 'MOMO' : isCard ? 'CARD' : 'BANK',
      createdAt: new Date().toISOString()
    };

    this.linkedBanks.unshift(newBank);
    this.saveLinkedBanks();
    this.selectedBankId = newBank.id;

    this.notification.success(`Liên kết thành công tài khoản ${newBank.bankName}!`);
    this.closeLinkModal();
  }

  unlinkBank(id: string, event: Event): void {
    event.stopPropagation();
    const bank = this.linkedBanks.find(b => b.id === id);
    if (!bank) return;

    this.linkedBanks = this.linkedBanks.filter(b => b.id !== id);
    this.saveLinkedBanks();

    if (this.selectedBankId === id) {
      this.selectedBankId = this.linkedBanks.length > 0 ? this.linkedBanks[0].id : '';
    }

    this.notification.info(`Đã hủy liên kết tài khoản ${bank.bankName}.`);
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

  setPresetAmount(amount: number): void {
    this.topUpForm.patchValue({ amount });
  }

  selectBank(id: string): void {
    this.selectedBankId = id;
  }

  isBankInsufficient(bank: LinkedBankSource): boolean {
    return this.currentAmount > bank.balance;
  }

  isCurrentBankInsufficient(): boolean {
    const bank = this.currentSelectedBank;
    if (!bank) return false;
    return this.isBankInsufficient(bank);
  }

  maskAccNum(num: string): string {
    if (!num) return '•••• 8892';
    const clean = num.replace(/\s+/g, '');
    if (clean.length <= 4) return clean;
    return '•••• ' + clean.slice(-4);
  }

  onSubmit(): void {
    if (this.topUpForm.invalid || !this.currentSelectedBank) return;

    const amount = this.currentAmount;
    const bank = this.currentSelectedBank;

    // Check balance of selected linked bank
    if (amount > bank.balance) {
      const msg = `Số dư tài khoản ${bank.bankName} không đủ! Bạn muốn nạp ${amount.toLocaleString()} ₫ nhưng ${bank.bankName} chỉ còn ${bank.balance.toLocaleString()} ₫.`;
      this.notification.error(msg);
      return;
    }

    this.submitting = true;
    this.accountService.topUp(this.topUpForm.value).subscribe({
      next: (res) => {
        this.submitting = false;
        if (res.success) {
          // Deduct amount from selected linked bank balance
          bank.balance -= amount;
          this.saveLinkedBanks();

          this.notification.success(`Nạp thành công ${amount.toLocaleString()} ₫ từ ${bank.bankName}! Số dư ${bank.bankName} còn lại: ${bank.balance.toLocaleString()} ₫.`);
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
