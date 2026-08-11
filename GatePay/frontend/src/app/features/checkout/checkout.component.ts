import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  BnplCheckoutResult,
  BnplProposalResult,
  CheckoutInfo,
  CheckoutService
} from '../../core/services/checkout.service';
import { AuthService } from '../../core/services/auth.service';
import { AccountService } from '../../core/services/account.service';
import { AccountResponse } from '../../core/models/account.model';
import { NotificationService } from '../../core/services/notification.service';
import { PinModalComponent } from '../../shared/components/pin-modal/pin-modal.component';
import { BnplProfileFormComponent, BnplProfileFormData } from '../../shared/components/bnpl-profile-form/bnpl-profile-form.component';
import { BnplProfileService } from '../../core/services/bnpl-profile.service';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, ReactiveFormsModule, RouterLink, PinModalComponent, BnplProfileFormComponent],
  template: `
    <main class="checkout-page fade-in">
      <div class="hero-bg">
        <div class="orb o1"></div>
        <div class="orb o2"></div>
        <div class="orb o3"></div>
      </div>
      
      <section class="checkout-shell">
        <header class="header">
          <div>
            <p class="eyebrow">PayGate checkout</p>
            <h1>{{ isBnpl() ? 'BNPL approval' : 'Wallet payment' }}</h1>
          </div>
          <span class="status">{{ info()?.status || 'LOADING' }}</span>
        </header>

        <section *ngIf="loading()" class="state">
          <div class="spinner"></div>
          <p>Loading checkout...</p>
        </section>

        <section *ngIf="errorMsg() && !loading()" class="state error">
          <h2>Checkout unavailable</h2>
          <p>{{ errorMsg() }}</p>
          <a routerLink="/" class="link">Back to PayGate</a>
        </section>

        <ng-container *ngIf="info() && !loading() && !errorMsg()">
          <section class="summary">
            <div>
              <p class="eyebrow">Merchant</p>
              <h2>{{ info()?.merchantName }}</h2>
              <p class="muted">Order {{ info()?.orderId }}</p>
              <p class="muted" *ngIf="info()?.merchantCustomerRef">MP user {{ info()?.merchantCustomerRef }}</p>
            </div>
            <div class="amount">
              <span>Total</span>
              <strong>{{ info()?.amount | currency:'VND':'symbol':'1.0-0' }}</strong>
              <small *ngIf="isBnpl()">Finance {{ financeAmount() | currency:'VND':'symbol':'1.0-0' }}</small>
            </div>
          </section>

          <section *ngIf="isBnpl(); else walletFlow" class="flow">
            <ng-container *ngIf="isLoggedIn(); else bnplAuthGate">
            <!-- Steps nav: simplified for returning borrowers -->
            <nav class="steps" *ngIf="!readyToCreateLoan()">
              <span [class.active]="step() >= 1">Profile</span>
              <span [class.active]="step() >= 2">Limit</span>
              <span [class.active]="step() >= 3">Loan</span>
              <span [class.active]="step() >= 4">Done</span>
            </nav>
            <nav class="steps steps-2" *ngIf="readyToCreateLoan() && !proposal() && !confirmed()">
              <span class="active">Create Loan</span>
              <span [class.active]="!!proposal() || !!confirmed()">Done</span>
            </nav>

            <div *ngIf="step() === 1" class="panel">
              <div>
                <h3>Borrower profile</h3>
                <p class="muted">
                  PayGate links this checkout to the PayGate account you signed in with.
                </p>
              </div>

              <div class="notice" *ngIf="myProfile()?.approvedLimit">
                <span>You have a pre-approved limit of <strong>{{ myProfile()?.approvedLimit | currency:'VND':'symbol':'1.0-0' }}</strong>!</span>
              </div>

              <app-bnpl-profile-form 
                [initialData]="myProfile() || { fullName: info()?.customerName }" 
                [loading]="working()"
                submitLabel="Save and Continue"
                (formSubmit)="submitProfile($event)">
              </app-bnpl-profile-form>
            </div>

            <section *ngIf="step() === 2" class="panel">
              <div>
                <h3>Credit assessment</h3>
                <p class="muted">We evaluated your profile for BNPL credit limit.</p>
              </div>

              <button *ngIf="!assessment()" type="button" (click)="assessCredit()" [disabled]="working()">
                {{ working() ? 'Assessing...' : 'Assess credit limit' }}
              </button>

              <dl *ngIf="assessment()" class="metrics">
                <div>
                  <dt>Status</dt>
                  <dd>{{ assessment()?.status }}</dd>
                </div>
                <div>
                  <dt>Maximum finance</dt>
                  <dd>{{ assessment()?.maximumFinancedAmount | currency:'VND':'symbol':'1.0-0' }}</dd>
                </div>
              </dl>

              <button *ngIf="step() === 2 && assessment()" type="button" (click)="goToLoan()" [disabled]="working()">
                Choose loan option
              </button>
            </section>

            <!-- Step 3: Loan creation - shown for new AND returning borrowers -->
            <form *ngIf="(step() === 3 || readyToCreateLoan()) && !proposal() && !confirmed()" [formGroup]="proposalForm" (ngSubmit)="createProposal()" class="panel loan-create-panel">

              <!-- Header badge -->
              <div class="loan-header">
                <div>
                  <span class="loan-eyebrow">Buy Now, Pay Later</span>
                  <h3 class="loan-title">Create your BNPL loan</h3>
                </div>
                <div class="approved-badge">
                  <span class="badge-check">✓</span>
                  <div>
                    <div class="badge-label">Pre-approved limit</div>
                    <div class="badge-amount">{{ (assessment()?.approvedLimit || myProfile()?.approvedLimit) | currency:'VND':'symbol':'1.0-0' }}</div>
                  </div>
                </div>
              </div>

              <!-- Order summary strip -->
              <div class="order-strip">
                <div class="strip-item">
                  <span class="strip-label">Product price</span>
                  <span class="strip-value">{{ info()?.amount | currency:'VND':'symbol':'1.0-0' }}</span>
                </div>
                <div class="strip-divider"></div>
                <div class="strip-item">
                  <span class="strip-label">You pay upfront</span>
                  <span class="strip-value">{{ upfrontPreview() | currency:'VND':'symbol':'1.0-0' }}</span>
                </div>
                <div class="strip-divider"></div>
                <div class="strip-item highlight">
                  <span class="strip-label">Amount financed</span>
                  <span class="strip-value" style="color:#c20067; font-size:1.1rem">{{ proposalForm.value.financedAmount | currency:'VND':'symbol':'1.0-0' }}</span>
                </div>
              </div>

              <!-- Financed amount slider -->
              <div class="slider-section">
                <div class="slider-header">
                  <span class="slider-label">Adjust financed amount</span>
                  <span class="slider-max">Max: {{ maxFinancedLimit() | currency:'VND':'symbol':'1.0-0' }}</span>
                </div>
                <input type="range" formControlName="financedAmount" min="0" [max]="maxFinancedLimit()" step="100000"
                  class="loan-slider">
                <!-- Live cost summary under slider -->
                <div class="slider-summary">
                  <span>Principal <strong>{{ proposalForm.value.financedAmount | currency:'VND':'symbol':'1.0-0' }}</strong></span>
                  <span class="plus-sign">+</span>
                  <span>Interest <strong style="color:#c20067">{{ totalInterestPreview() | currency:'VND':'symbol':'1.0-0' }}</strong></span>
                  <span class="equals-sign">=</span>
                  <span>Total repayment <strong style="color:#0d2b5c">{{ totalRepaymentPreview() | currency:'VND':'symbol':'1.0-0' }}</strong></span>
                </div>
              </div>

              <!-- Tenor selector: 4 clickable cards -->
              <div class="tenor-section">
                <label class="section-label">Repayment period</label>
                <div class="tenor-cards">
                  <button *ngFor="let t of tenorOptions" type="button"
                    class="tenor-card"
                    [class.tenor-active]="proposalForm.value.tenorMonths === t.months"
                    (click)="proposalForm.patchValue({ tenorMonths: t.months })">
                    <span class="tc-months">{{ t.months }} months</span>
                    <span class="tc-rate">{{ t.rate }}%/month</span>
                    <span class="tc-monthly" *ngIf="proposalForm.value.tenorMonths === t.months">
                      {{ calcMonthly(t.months) | currency:'VND':'symbol':'1.0-0' }}/mo
                    </span>
                  </button>
                </div>
              </div>

              <!-- Repayment breakdown card -->
              <div class="repay-card">
                <div class="repay-row">
                  <span>Principal (financed)</span>
                  <span>{{ proposalForm.value.financedAmount | currency:'VND':'symbol':'1.0-0' }}</span>
                </div>
                <div class="repay-row">
                  <span>Total interest ({{ proposalForm.value.tenorMonths }} × 1.5%/month)</span>
                  <span class="interest-val">+ {{ totalInterestPreview() | currency:'VND':'symbol':'1.0-0' }}</span>
                </div>
                <div class="repay-row repay-total">
                  <span>Total repayment</span>
                  <strong>{{ totalRepaymentPreview() | currency:'VND':'symbol':'1.0-0' }}</strong>
                </div>
                <div class="monthly-highlight">
                  <div>
                    <div class="mh-label">Monthly installment</div>
                    <div class="mh-sub">{{ proposalForm.value.tenorMonths }} payments starting next month</div>
                  </div>
                  <div class="mh-amount">{{ monthlyInstallmentPreview() | currency:'VND':'symbol':'1.0-0' }}<span class="mh-unit">/month</span></div>
                </div>
              </div>

              <button type="submit" [disabled]="proposalForm.invalid || working()" class="confirm-btn">
                {{ working() ? 'Creating loan...' : 'Confirm & create loan →' }}
              </button>
            </form>

            <section *ngIf="proposal()" class="panel approved">
              <div>
                <h3>Proposal {{ proposal()?.proposalRef }}</h3>
                <p class="muted">Confirm to create the loan and disburse to the seeded merchant.</p>
              </div>

              <dl class="metrics">
                <div>
                  <dt>Financed</dt>
                  <dd>{{ proposal()?.financedAmount | currency:'VND':'symbol':'1.0-0' }}</dd>
                </div>
                <div>
                  <dt>Upfront</dt>
                  <dd>{{ proposal()?.upfrontAmount | currency:'VND':'symbol':'1.0-0' }}</dd>
                </div>
                <div>
                  <dt>Monthly</dt>
                  <dd>{{ proposal()?.monthlyInstallment | currency:'VND':'symbol':'1.0-0' }}</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>{{ proposal()?.status }}</dd>
                </div>
              </dl>

              <button type="button" (click)="confirmProposal()" [disabled]="working() || !!confirmed()">
                {{ working() ? 'Confirming...' : 'Finish' }}
              </button>
            </section>

            <section *ngIf="confirmed()" class="result">
              <h2>Payment successful</h2>
              <p>Loan {{ confirmed()?.loanRef }} and transaction {{ confirmed()?.transactionRef }} were created.</p>
              <button type="button" (click)="returnToMerchant('SUCCESS')">Return to Marketplace</button>
            </section>
            </ng-container>
          </section>
        </ng-container>
      </section>

      <ng-template #bnplAuthGate>
        <section class="panel auth-panel checkout-shell">
          <div>
            <h3>Sign in to PayGate</h3>
            <p class="muted">
              Sign in with your PayGate account before PayGate checks your BNPL limit.
            </p>
          </div>

          <div class="notice">
            <span>Marketplace user id</span>
            <strong>{{ info()?.merchantCustomerRef || 'Missing merchantCustomerRef' }}</strong>
          </div>

          <div class="auth-tabs">
            <button type="button" [class.active]="!showRegister" (click)="showRegister = false">Log in</button>
            <button type="button" [class.active]="showRegister" (click)="showRegister = true">Register</button>
          </div>

          <form *ngIf="!showRegister" [formGroup]="loginForm" (ngSubmit)="onLogin()" class="grid one">
            <label>Username
              <input type="text" formControlName="username">
            </label>
            <label>Password
              <input type="password" formControlName="password">
            </label>
            <button type="submit" [disabled]="loginForm.invalid || working()">Log in and continue</button>
          </form>

          <form *ngIf="showRegister" [formGroup]="registerForm" (ngSubmit)="onRegister()" class="grid two">
            <label>Full name
              <input type="text" formControlName="fullName">
            </label>
            <label>Username
              <input type="text" formControlName="username">
            </label>
            <label>Email
              <input type="email" formControlName="email">
            </label>
            <label>Password
              <input type="password" formControlName="password">
            </label>
            <button type="submit" [disabled]="registerForm.invalid || working()">
              {{ working() ? 'Creating...' : 'Create account and continue' }}
            </button>
          </form>
        </section>
      </ng-template>

      <ng-template #walletFlow>
        <section class="flow checkout-shell">
          <div *ngIf="!isLoggedIn()" class="panel">
            <h3>Log in to PayGate Wallet</h3>
            <form [formGroup]="loginForm" (ngSubmit)="onLogin()" class="grid one">
              <label>Username
                <input type="text" formControlName="username">
              </label>
              <label>Password
                <input type="password" formControlName="password">
              </label>
              <button type="submit" [disabled]="loginForm.invalid || working()">Log in</button>
            </form>
          </div>

          <div *ngIf="isLoggedIn()" class="panel">
            <h3>{{ currentUser() }}</h3>
            <p class="muted">Balance: {{ (account()?.balance || 0) | currency:'VND':'symbol':'1.0-0' }}</p>
            <div class="actions">
              <button type="button" class="secondary" (click)="cancelPayment()">Cancel</button>
              <button type="button" (click)="openOtpModal()" [disabled]="isBalanceInsufficient() || working()">
                Pay with OTP
              </button>
            </div>
          </div>
        </section>
      </ng-template>

      <app-pin-modal
        [isOpen]="showOtpModal()"
        title="OTP verification"
        action="Order payment"
        [bypassVerification]="true"
        (confirmed)="onOtpConfirmed($event)"
        (cancelled)="closeOtpModal()"
      ></app-pin-modal>
    </main>
  `,
  styles: [`
    :host { display: block; }
    .checkout-page {
      position: relative;
      min-height: 100vh;
      padding: 48px 16px;
      background: #eef3f8;
      color: #0d2b5c;
      font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      overflow: hidden;
      background: radial-gradient(circle at 75% 10%, rgba(255,255,255,1), transparent 35%),
                  linear-gradient(160deg, #fff0f6 0%, #ffe1ef 35%, #fff5f9 65%, #fce4ec 100%);
    }
    
    @keyframes fl {
      0%,100%{transform:translateY(0) scale(1)}
      50%{transform:translateY(-24px) scale(1.06)}
    }
    @keyframes fu { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
    .fade-in { animation:fu .5s ease-out; }
    
    .hero-bg { position:absolute; inset:0; pointer-events:none; overflow:hidden; z-index: 0; }
    .orb { position:absolute; border-radius:50%; filter:blur(100px); opacity:.12; }
    .o1 { width:600px; height:600px; top:-150px; right:-150px; background:#f8bbd0; animation:fl 10s ease-in-out infinite; }
    .o2 { width:450px; height:450px; bottom:-100px; left:-120px; background:#e8d5f5; animation:fl 12s ease-in-out infinite reverse; }
    .o3 { width:350px; height:350px; top:40%; left:40%; transform:translate(-50%,-50%); background:#fce4ec; opacity:.08; }

    .checkout-shell {
      position: relative;
      z-index: 1;
      max-width: 920px;
      margin: 0 auto;
      background: rgba(255,255,255,0.85);
      backdrop-filter: blur(16px);
      border: 1px solid rgba(244,114,182,.2);
      border-radius: 24px;
      overflow: hidden;
      box-shadow: 0 20px 60px rgba(194,0,103,.06);
    }
    .header {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: center;
      padding: 32px 36px;
      background: transparent;
      border-bottom: 1px solid rgba(244,114,182,.15);
      color: #0d2b5c;
    }
    h1, h2, h3, h4 { margin: 0; letter-spacing: -0.02em; color: #0d2b5c; }
    h1 { font-size: 32px; font-weight: 900; }
    h2 { font-size: 24px; font-weight: 800; }
    h3 { font-size: 18px; font-weight: 800; }
    h4 { font-size: 14px; font-weight: 700; }
    .eyebrow {
      margin: 0 0 6px;
      color: #c20067;
      font-size: 13px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .status {
      padding: 8px 16px;
      border-radius: 999px;
      background: #fce4ec;
      color: #c20067;
      font-size: 13px;
      font-weight: 800;
      white-space: nowrap;
      border: 1px solid #f8bbd0;
    }
    .state {
      padding: 56px 28px;
      text-align: center;
      color: #64748b;
    }
    .error h2 { color: #dc2626; }
    .spinner {
      width: 34px;
      height: 34px;
      border: 3px solid rgba(194,0,103,.2);
      border-top-color: #c20067;
      border-radius: 50%;
      margin: 0 auto 14px;
      animation: spin .8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    
    .summary {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 18px;
      align-items: center;
      padding: 32px 36px;
      border-bottom: 1px solid rgba(244,114,182,.15);
    }
    .muted {
      margin: 6px 0 0;
      color: #64748b;
      line-height: 1.5;
      font-size: 14px;
    }
    .amount {
      text-align: right;
      min-width: 210px;
    }
    .amount span, .amount small {
      display: block;
      color: #64748b;
      font-size: 14px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .amount strong {
      display: block;
      margin: 6px 0;
      color: #0d2b5c;
      font-size: 32px;
      font-weight: 900;
      letter-spacing: -0.03em;
    }
    
    .flow {
      display: grid;
      gap: 20px;
      padding: 32px 36px 40px;
    }
    .steps {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
    }
    .steps span {
      padding: 12px;
      border-radius: 12px;
      background: #f1f5f9;
      color: #64748b;
      text-align: center;
      font-size: 14px;
      font-weight: 700;
      transition: all 0.2s;
    }
    .steps span.active {
      background: linear-gradient(135deg, #fff0f6, #fce4ec);
      color: #c20067;
      box-shadow: 0 4px 12px rgba(194,0,103,.1);
    }
    
    .panel {
      display: grid;
      gap: 20px;
      padding: 28px;
      border: 1px solid #f3d6e5;
      border-radius: 20px;
      background: #fff;
      box-shadow: 0 6px 20px rgba(194,0,103,.03);
    }
    .auth-panel {
      border-color: #f3d6e5;
      background: #fff;
      margin-top: 24px;
    }
    
    .auth-tabs {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
      padding: 6px;
      border-radius: 14px;
      background: #f1f5f9;
    }
    .auth-tabs button {
      background: transparent;
      color: #64748b;
      box-shadow: none;
      padding: 10px;
      border-radius: 10px;
    }
    .auth-tabs button.active {
      background: #c20067;
      color: #fff;
      box-shadow: 0 4px 12px rgba(194,0,103,.2);
    }
    
    .approved { border-color: #f48fb1; background: #fff5f9; }
    
    .grid {
      display: grid;
      gap: 16px;
    }
    .grid.one { grid-template-columns: 1fr; }
    .grid.two { grid-template-columns: repeat(2, 1fr); }
    .grid.three { grid-template-columns: repeat(3, 1fr); }
    .subsection {
      display: grid;
      gap: 12px;
      padding-top: 8px;
    }
    
    label {
      display: grid;
      gap: 8px;
      color: #475569;
      font-size: 14px;
      font-weight: 700;
    }
    input, select {
      width: 100%;
      box-sizing: border-box;
      padding: 14px 16px;
      border: 1px solid #cbd6e2;
      border-radius: 12px;
      background: #fff;
      color: #172033;
      font: inherit;
      transition: all 0.2s;
    }
    input:focus, select:focus {
      outline: none;
      border-color: #c20067;
      box-shadow: 0 0 0 3px rgba(194,0,103,.15);
    }
    
    button {
      border: 0;
      border-radius: 12px;
      padding: 14px 24px;
      background: linear-gradient(135deg, #c20067, #ef4b8c);
      color: #fff;
      font-weight: 800;
      font-size: 15px;
      cursor: pointer;
      transition: all 0.2s;
      box-shadow: 0 10px 24px rgba(194,0,103,.25);
    }
    button:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 14px 28px rgba(194,0,103,.35);
    }
    button.secondary {
      background: #f1f5f9;
      color: #475569;
      box-shadow: none;
    }
    button.secondary:hover:not(:disabled) {
      background: #e2e8f0;
      box-shadow: none;
    }
    button:disabled {
      opacity: .6;
      cursor: not-allowed;
      box-shadow: none;
    }
    
    .notice {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      padding: 16px;
      border: 1px solid #f3d6e5;
      border-radius: 12px;
      background: #fff0f6;
      color: #c20067;
      font-weight: 600;
    }
    .notice strong { color: #c20067; font-size: 16px; font-weight: 800; }
    
    .metrics {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin: 0;
    }
    .metrics div {
      padding: 16px;
      border: 1px solid #e5edf7;
      border-radius: 12px;
      background: #f8fafc;
    }
    dt {
      color: #64748b;
      font-size: 13px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    dd {
      margin: 8px 0 0;
      color: #0d2b5c;
      font-size: 18px;
      font-weight: 900;
    }
    
    .result {
      display: grid;
      gap: 16px;
      padding: 28px;
      border: 1px solid #a7f3d0;
      border-radius: 20px;
      background: #ecfdf5;
      text-align: center;
    }
    .result h2 { color: #065f46; }
    
    .actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
    }
    .link {
      color: #c20067;
      font-weight: 800;
      text-decoration: none;
    }
    .link:hover { text-decoration: underline; }

    /* ═══ LOAN CREATE PANEL ═══════════════════════════════ */
    .loan-create-panel { gap: 20px; padding: 28px; }

    /* Header */
    .loan-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      padding-bottom: 18px;
      border-bottom: 1px solid #f1e8f0;
    }
    .loan-eyebrow {
      display: block;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #c20067;
      margin-bottom: 4px;
    }
    .loan-title { margin: 0; font-size: 1.25rem; font-weight: 900; color: #0d2b5c; }
    .approved-badge {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-shrink: 0;
      padding: 10px 14px;
      background: linear-gradient(135deg, #ecfdf5, #d1fae5);
      border: 1px solid #a7f3d0;
      border-radius: 14px;
    }
    .badge-check {
      width: 28px; height: 28px;
      border-radius: 50%;
      background: #065f46;
      color: #fff;
      display: flex; align-items: center; justify-content: center;
      font-size: 13px; font-weight: 900;
      flex-shrink: 0;
    }
    .badge-label { font-size: 11px; font-weight: 700; color: #065f46; text-transform: uppercase; letter-spacing: 0.05em; }
    .badge-amount { font-size: 14px; font-weight: 900; color: #065f46; }

    /* Order summary strip */
    .order-strip {
      display: flex;
      gap: 0;
      background: #f8fafc;
      border: 1px solid #e5edf7;
      border-radius: 14px;
      overflow: hidden;
    }
    .strip-item {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 14px 16px;
    }
    .strip-item.highlight { background: #fff0f6; }
    .strip-divider { width: 1px; background: #e5edf7; flex-shrink: 0; }
    .strip-label { font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; }
    .strip-value { font-size: 15px; font-weight: 900; color: #0d2b5c; }

    /* Slider section */
    .slider-section { display: flex; flex-direction: column; gap: 10px; }
    .slider-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .slider-label { font-weight: 700; font-size: 14px; color: #475569; }
    .slider-max { font-size: 13px; color: #94a3b8; font-weight: 600; }
    .loan-slider {
      width: 100%;
      height: 6px;
      cursor: pointer;
      accent-color: #c20067;
      border-radius: 999px;
    }
    /* Live equation under slider */
    .slider-summary {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
      padding: 10px 14px;
      background: #fff;
      border: 1px solid #e5edf7;
      border-radius: 10px;
      font-size: 13px;
      color: #475569;
    }
    .slider-summary strong { font-weight: 800; }
    .plus-sign, .equals-sign {
      font-size: 16px;
      font-weight: 900;
      color: #94a3b8;
      flex-shrink: 0;
    }

    /* Tenor section */
    .tenor-section { display: flex; flex-direction: column; gap: 10px; }
    .section-label { font-weight: 700; font-size: 14px; color: #475569; }
    .tenor-cards {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
    }
    .tenor-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 3px;
      padding: 14px 8px;
      border: 2px solid #e2e8f0;
      border-radius: 14px;
      background: #f8fafc;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.16,1,0.3,1);
      box-shadow: none;
      color: inherit;
      font-family: inherit;
      min-height: 72px;
      justify-content: center;
    }
    .tenor-card:hover:not(:disabled) {
      border-color: #f8bbd0;
      background: #fff0f6;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(194,0,103,.1);
    }
    .tenor-active {
      border-color: #c20067 !important;
      background: linear-gradient(135deg, #fff0f6, #fce4ec) !important;
      box-shadow: 0 6px 16px rgba(194,0,103,.18) !important;
    }
    .tc-months { font-size: 14px; font-weight: 900; color: #0d2b5c; }
    .tc-rate { font-size: 11px; font-weight: 700; color: #94a3b8; }
    .tc-monthly {
      font-size: 11px;
      font-weight: 800;
      color: #c20067;
      margin-top: 4px;
      padding: 2px 6px;
      background: #fff;
      border-radius: 6px;
      border: 1px solid #f8bbd0;
      white-space: nowrap;
    }
    .tenor-active .tc-rate { color: #c20067; }

    /* Repayment breakdown card */
    .repay-card {
      display: flex;
      flex-direction: column;
      gap: 0;
      border: 1px solid #e5edf7;
      border-radius: 16px;
      overflow: hidden;
      background: #fff;
    }
    .repay-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      font-size: 14px;
      color: #475569;
      border-bottom: 1px solid #f1f5f9;
    }
    .repay-row:last-of-type { border-bottom: none; }
    .interest-val { color: #c20067; font-weight: 700; }
    .repay-total {
      font-weight: 700;
      font-size: 15px;
      color: #0d2b5c;
      background: #f8fafc;
    }
    .monthly-highlight {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      padding: 16px;
      background: linear-gradient(135deg, #fff0f6, #fce4ec);
      border-top: 2px solid #f8bbd0;
    }
    .mh-label { font-size: 14px; font-weight: 800; color: #0d2b5c; }
    .mh-sub { font-size: 11px; color: #c20067; font-weight: 600; margin-top: 2px; }
    .mh-amount {
      font-size: 1.6rem;
      font-weight: 900;
      color: #c20067;
      white-space: nowrap;
      letter-spacing: -0.02em;
    }
    .mh-unit { font-size: 0.85rem; font-weight: 700; color: #c20067; opacity: 0.7; }

    /* Confirm button */
    .confirm-btn {
      width: 100%;
      padding: 16px 24px;
      font-size: 16px;
      border-radius: 14px;
      letter-spacing: 0.01em;
    }

    .steps-2 { grid-template-columns: repeat(2, 1fr) !important; }
    
    @media (max-width: 760px) {
      .checkout-page { padding: 0; }
      .checkout-shell { border-radius: 0; border: none; }
      .header, .summary, .flow { padding-left: 20px; padding-right: 20px; }
      .summary, .grid.two, .grid.three, .metrics, .steps {
        grid-template-columns: 1fr;
      }
      .amount { text-align: left; min-width: 0; }
      .notice, .actions { flex-direction: column; align-items: stretch; }
      button { width: 100%; }
      .tenor-cards { grid-template-columns: repeat(2, 1fr); }
      .order-strip { flex-direction: column; }
      .strip-divider { width: auto; height: 1px; }
      .approved-badge { flex-direction: column; gap: 6px; }
      .slider-summary { font-size: 12px; }
    }
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
  private profileService = inject(BnplProfileService);

  token = signal('');
  info = signal<CheckoutInfo | null>(null);
  account = signal<AccountResponse | null>(null);
  assessment = signal<BnplCheckoutResult | null>(null);
  proposal = signal<BnplProposalResult | null>(null);
  confirmed = signal<BnplProposalResult | null>(null);
  manualStep = signal(1);
  myProfile = signal<any>(null);

  loading = signal(true);
  working = signal(false);
  errorMsg = signal('');
  showOtpModal = signal(false);
  showRegister = false;

  isBnpl = computed(() => (this.info()?.method || '').toUpperCase() === 'BNPL');
  readyToCreateLoan = signal(false);
  step = computed(() => {
    if (this.confirmed()) return 4;
    if (this.proposal()) return 4;
    if (this.readyToCreateLoan()) return 3;
    if (this.manualStep() === 3 && this.assessment()) return 3;
    if (this.assessment()) return 2;
    return 1;
  });
  financeAmount = computed(() => Number(this.info()?.financeAmount || this.info()?.amount || 0));
  maxFinancedLimit = computed(() => {
    const fromAssessment = Number(this.assessment()?.maximumFinancedAmount || 0);
    const fromProfile = Number(this.myProfile()?.approvedLimit || 0);
    const cap = this.financeAmount();
    const limit = fromAssessment > 0 ? fromAssessment : fromProfile;
    return cap > 0 ? Math.min(limit, cap) : limit;
  });

  tenorOptions = [
    { months: 3, rate: 1.5 },
    { months: 6, rate: 1.5 },
    { months: 9, rate: 1.5 },
    { months: 12, rate: 1.5 }
  ];

  proposalForm = this.fb.group({
    financedAmount: [0, [Validators.required, Validators.min(1000)]],
    tenorMonths: [6, [Validators.required, Validators.min(1)]]
  });

  loginForm = this.fb.group({
    username: ['', Validators.required],
    password: ['', Validators.required]
  });

  registerForm = this.fb.group({
    fullName: ['', Validators.required],
    username: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const token = params['token'];
      if (!token) {
        this.errorMsg.set('Missing payment token');
        this.loading.set(false);
        return;
      }
      this.token.set(token);
      this.loadCheckoutInfo(token);
    });

    if (this.isLoggedIn()) {
      this.loadUserAccount();
      this.loadBnplProfile();
    }
  }

  loadBnplProfile(): void {
    this.profileService.getMyProfile().subscribe({
      next: (res) => {
        if (res.data) {
          this.myProfile.set(res.data);
          // If already has approved limit: skip profile/assessment steps, go straight to loan form
          if (res.data.approvedLimit && res.data.approvedLimit > 0) {
            this.readyToCreateLoan.set(true);
            // Pre-fill financed amount with the product amount (capped at approved limit)
            const cap = Number(res.data.approvedLimit);
            const productAmount = this.financeAmount();
            const prefill = productAmount > 0 ? Math.min(productAmount, cap) : cap;
            this.proposalForm.patchValue({ financedAmount: prefill }, { emitEvent: false });
          }
        }
      }
    });
  }

  loadCheckoutInfo(token: string): void {
    this.loading.set(true);
    this.checkoutService.getCheckoutInfo(token).subscribe({
      next: res => {
        this.loading.set(false);
        this.info.set(res.data);
        if (this.shouldRedirectToPayGateLogin(res.data)) {
          this.redirectToPayGateLogin(token, res.data);
          return;
        }
        this.prefillRegisterForm(res.data);
        this.proposalForm.patchValue({ financedAmount: this.financeAmount() }, { emitEvent: false });
      },
      error: err => {
        this.loading.set(false);
        this.errorMsg.set(err?.error?.message || 'Payment session does not exist or has expired');
      }
    });
  }

  submitProfile(data: BnplProfileFormData): void {
    this.working.set(true);
    this.checkoutService.submitBorrowerProfile(this.token(), {
      fullName: data.fullName || '',
      occupation: data.occupation || '',
      companyName: data.companyName || '',
      monthlyIncome: Number(data.monthlyIncome || 0),
      relative1Name: data.relative1Name || '',
      relative1Phone: data.relative1Phone || '',
      relative1Relationship: data.relative1Relationship || '',
      relative2Name: data.relative2Name || '',
      relative2Phone: data.relative2Phone || '',
      relative2Relationship: data.relative2Relationship || ''
    }).subscribe({
      next: () => this.assessCredit(),
      error: err => this.fail(err, 'Could not save borrower profile')
    });
  }

  assessCredit(): void {
    this.checkoutService.assessBnplCredit(this.token()).subscribe({
      next: res => {
        this.working.set(false);
        this.assessment.set(res.data);
        this.manualStep.set(3);
        this.proposalForm.patchValue({
          financedAmount: Math.min(Number(res.data.maximumFinancedAmount || 0), this.financeAmount())
        });
        this.notify.success('Credit approved');
      },
      error: err => this.fail(err, 'Credit assessment failed')
    });
  }

  goToLoan(): void {
    this.manualStep.set(3);
  }

  createProposal(): void {
    if (this.proposalForm.invalid) return;
    // For new borrowers we have assessment; for returning borrowers we use profile approvedLimit
    const hasAssessment = !!this.assessment();
    const hasProfileLimit = !!(this.myProfile()?.approvedLimit);
    if (!hasAssessment && !hasProfileLimit) {
      this.notify.error('No approved credit limit found');
      return;
    }
    const financedAmount = Number(this.proposalForm.value.financedAmount || 0);
    const max = hasAssessment
      ? Number(this.assessment()?.maximumFinancedAmount || 0)
      : Number(this.myProfile()?.approvedLimit || 0);
    if (max > 0 && financedAmount > max) {
      this.notify.error('Financed amount exceeds approved limit');
      return;
    }

    this.working.set(true);
    this.checkoutService.createBnplProposal(
      this.token(),
      financedAmount,
      Number(this.proposalForm.value.tenorMonths || 6)
    ).subscribe({
      next: res => {
        this.working.set(false);
        this.proposal.set(res.data);
        this.confirmed.set(null);
        this.notify.success('Proposal created');
      },
      error: err => this.fail(err, 'Could not create proposal')
    });
  }

  confirmProposal(): void {
    const proposalRef = this.proposal()?.proposalRef;
    if (!proposalRef) return;

    this.working.set(true);
    this.checkoutService.confirmBnplProposal(proposalRef).subscribe({
      next: res => {
        this.working.set(false);
        this.proposal.set(res.data);
        this.confirmed.set(res.data);
        this.notify.success('BNPL checkout confirmed');
      },
      error: err => this.fail(err, 'Could not confirm proposal')
    });
  }

  upfrontPreview(): number {
    const total = Number(this.info()?.amount || 0);
    const financed = Number(this.proposalForm.value.financedAmount || 0);
    return Math.max(total - financed, 0);
  }

  totalInterestPreview(): number {
    const financed = Number(this.proposalForm.value.financedAmount || 0);
    const tenor = Number(this.proposalForm.value.tenorMonths || 6);
    return financed * 0.015 * tenor;
  }

  totalRepaymentPreview(): number {
    const financed = Number(this.proposalForm.value.financedAmount || 0);
    return financed + this.totalInterestPreview();
  }

  monthlyInstallmentPreview(): number {
    const tenor = Number(this.proposalForm.value.tenorMonths || 6);
    return tenor > 0 ? this.totalRepaymentPreview() / tenor : 0;
  }

  /** Calculate monthly installment for any given tenor (used by tenor cards) */
  calcMonthly(tenorMonths: number): number {
    const financed = Number(this.proposalForm.value.financedAmount || 0);
    const totalInterest = financed * 0.015 * tenorMonths;
    return tenorMonths > 0 ? (financed + totalInterest) / tenorMonths : 0;
  }

  returnToMerchant(status: 'SUCCESS' | 'CANCELLED'): void {
    const info = this.info();
    const target = status === 'SUCCESS' ? info?.returnUrl : info?.cancelUrl;
    if (!target) {
      this.router.navigate(['/']);
      return;
    }
    const url = new URL(target, window.location.origin);
    url.searchParams.set('status', status);
    url.searchParams.set('orderId', info?.orderId || '');
    if (this.confirmed()?.transactionRef) {
      url.searchParams.set('transactionRef', this.confirmed()!.transactionRef!);
    }
    window.location.href = url.toString();
  }

  isLoggedIn(): boolean {
    return this.authService.isAuthenticated();
  }

  currentUser(): string {
    return this.authService.getUsername() || '';
  }

  loadUserAccount(): void {
    this.accountService.getAccountMe().subscribe({
      next: res => {
        if (res.data) this.account.set(res.data);
      }
    });
  }

  onLogin(): void {
    if (this.loginForm.invalid) return;
    this.working.set(true);
    this.authService.login({
      username: this.loginForm.value.username || '',
      password: this.loginForm.value.password || ''
    }).subscribe({
      next: () => {
        this.working.set(false);
        this.loadUserAccount();
        this.notify.success('Logged in');
      },
      error: err => this.fail(err, 'Login failed')
    });
  }

  onRegister(): void {
    if (this.registerForm.invalid) return;
    this.working.set(true);
    const raw = this.registerForm.getRawValue();
    this.authService.register({
      fullName: raw.fullName || '',
      username: raw.username || '',
      email: raw.email || '',
      password: raw.password || ''
    }).subscribe({
      next: () => {
        this.authService.login({
          username: raw.username || '',
          password: raw.password || ''
        }).subscribe({
          next: () => {
            this.working.set(false);
            this.loadUserAccount();
            this.notify.success('PayGate account created');
          },
          error: err => this.fail(err, 'Account created, but login failed')
        });
      },
      error: err => this.fail(err, 'Registration failed')
    });
  }

  isBalanceInsufficient(): boolean {
    const account = this.account();
    const info = this.info();
    return !!account && !!info && account.balance < info.amount;
  }

  onOtpConfirmed(otpCode: string): void {
    this.showOtpModal.set(false);
    this.working.set(true);
    this.checkoutService.processCheckout(this.token(), otpCode).subscribe({
      next: res => {
        this.working.set(false);
        this.notify.success('Payment successful');
        window.location.href = res.data.redirectUrl;
      },
      error: err => this.fail(err, 'Payment failed')
    });
  }

  openOtpModal(): void {
    this.showOtpModal.set(true);
  }

  closeOtpModal(): void {
    this.showOtpModal.set(false);
  }

  cancelPayment(): void {
    if (this.isBnpl()) {
      this.returnToMerchant('CANCELLED');
      return;
    }

    const token = this.token();
    const doRedirect = () => {
      const cancelUrl = this.info()?.cancelUrl;
      if (cancelUrl) {
        window.location.href = cancelUrl;
      } else {
        this.router.navigate(['/']);
      }
    };

    // Notify PayGate backend so it publishes a PAYMENT_CANCELLED webhook
    // to the merchant. Redirect regardless of API success — the webhook
    // is the authoritative notification, the redirect is just UX.
    if (token) {
      this.checkoutService.cancelCheckout(token).subscribe({
        next: () => doRedirect(),
        error: () => doRedirect()
      });
    } else {
      doRedirect();
    }
  }

  private fail(err: any, fallback: string): void {
    this.working.set(false);
    this.notify.error(err?.error?.message || fallback);
  }

  private shouldRedirectToPayGateLogin(info: CheckoutInfo): boolean {
    return (info.method || '').toUpperCase() === 'BNPL' && !this.authService.isAuthenticated();
  }

  private redirectToPayGateLogin(token: string, info: CheckoutInfo): void {
    this.router.navigate(['/login'], {
      queryParams: {
        returnUrl: `/checkout?token=${token}`,
        email: info.customerEmail || undefined,
        name: info.customerName || undefined
      }
    });
  }

  private prefillRegisterForm(info: CheckoutInfo): void {
    const email = info.customerEmail || '';
    const username = email.includes('@') ? email.split('@')[0].replace(/[^a-zA-Z0-9._-]/g, '') : email;
    this.registerForm.patchValue({
      fullName: info.customerName || '',
      username: username || '',
      email
    }, { emitEvent: false });
  }
}
