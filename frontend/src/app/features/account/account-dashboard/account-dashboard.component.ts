import { Component, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AccountService } from '../../../core/services/account.service';
import { TransactionService } from '../../../core/services/transaction.service';
import { AuthService } from '../../../core/services/auth.service';
import { AccountResponse } from '../../../core/models/account.model';
import { TransactionResponse } from '../../../core/models/transaction.model';

@Component({
  selector: 'app-account-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    CurrencyPipe,
    DatePipe,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  template: `
    <div class="console-dashboard fade-in-up">
      <!-- Top Welcome Banner & Action Buttons -->
      <div class="welcome-header">
        <div class="welcome-title-group">
          <div class="welcome-badge">
            <span class="pulse-indicator"></span>
            <span class="badge-text">PayGate Live Console</span>
          </div>
          <h2>Welcome back, {{ getDisplayName() }} 👋</h2>
          <p class="welcome-subtitle">Here is your real-time payment volume, wallet balance, and ledger activity.</p>
        </div>

        <div class="header-action-buttons">
          <a mat-button class="btn-topup ripple-effect" routerLink="/accounts/topup">
            <mat-icon class="btn-icon">add_circle_outline</mat-icon>
            Top up wallet
          </a>
          <a mat-raised-button class="btn-new-payment pulse-glow" routerLink="/transactions/pay">
            <span>Send Payment</span>
            <span class="arrow">↗</span>
          </a>
        </div>
      </div>

      <div *ngIf="loading" class="loading-box">
        <mat-spinner diameter="44" strokeWidth="3"></mat-spinner>
      </div>

      <div *ngIf="!loading" class="dashboard-content">
        <!-- 4 Top Metric Cards Grid (Generous Spacing) -->
        <div class="metrics-grid">
          <!-- Metric 1: Wallet Balance -->
          <div class="metric-card hover-lift">
            <div class="metric-header">
              <span class="metric-label">WALLET BALANCE</span>
              <div class="icon-circle emerald-tint">
                <mat-icon class="metric-icon green">account_balance_wallet</mat-icon>
              </div>
            </div>
            <div class="metric-value-row">
              <span class="metric-value">{{ (account?.balance || 0) | currency:'VND':'symbol':'1.0-0' }}</span>
              <span class="trend-badge positive">
                <mat-icon class="trend-icon">trending_up</mat-icon> +12.5%
              </span>
            </div>
            <div class="metric-subtext">Updated 1 min ago</div>
          </div>

          <!-- Metric 2: Total Volume (7D) -->
          <div class="metric-card hover-lift">
            <div class="metric-header">
              <span class="metric-label">TOTAL VOLUME (7D)</span>
              <div class="icon-circle blue-tint">
                <mat-icon class="metric-icon blue">insights</mat-icon>
              </div>
            </div>
            <div class="metric-value-row">
              <span class="metric-value">{{ totalVolume | currency:'VND':'symbol':'1.0-0' }}</span>
              <span class="trend-badge positive">
                <mat-icon class="trend-icon">trending_up</mat-icon> +8.4%
              </span>
            </div>
            <div class="metric-subtext">Past 7 consecutive days</div>
          </div>

          <!-- Metric 3: Transactions Count -->
          <div class="metric-card hover-lift">
            <div class="metric-header">
              <span class="metric-label">TRANSACTIONS</span>
              <div class="icon-circle purple-tint">
                <mat-icon class="metric-icon purple">swap_horiz</mat-icon>
              </div>
            </div>
            <div class="metric-value-row">
              <span class="metric-value">{{ totalTransactionsCount }}</span>
              <span class="trend-badge neutral">
                <mat-icon class="trend-icon">sync</mat-icon> Live
              </span>
            </div>
            <div class="metric-subtext">Processed successfully</div>
          </div>

          <!-- Metric 4: Failed Count -->
          <div class="metric-card hover-lift">
            <div class="metric-header">
              <span class="metric-label">FAILED</span>
              <div class="icon-circle red-tint">
                <mat-icon class="metric-icon red">error_outline</mat-icon>
              </div>
            </div>
            <div class="metric-value-row">
              <span class="metric-value">{{ failedTransactionsCount }}</span>
              <span class="trend-badge negative" *ngIf="failedTransactionsCount > 0">
                <mat-icon class="trend-icon">warning</mat-icon> Action req
              </span>
              <span class="trend-badge positive" *ngIf="failedTransactionsCount === 0">
                <mat-icon class="trend-icon">check_circle</mat-icon> 0%
              </span>
            </div>
            <div class="metric-subtext">Declined or error rate</div>
          </div>
        </div>

        <!-- Middle Section: Payment Volume Centerpiece Hero Chart & Wallet Card -->
        <div class="middle-grid">
          <!-- PAYMENT VOLUME CENTERPIECE HERO CARD -->
          <div class="content-card chart-card-hero hover-lift">
            <!-- Centerpiece Title & Tag -->
            <div class="hero-chart-header flex-between">
              <div>
                <span class="hero-tag">7-DAY PAYMENT ANALYTICS</span>
                <h3 class="hero-title">Payment Volume Breakdown</h3>
              </div>
              <div class="time-range-badge">
                <mat-icon class="time-icon">calendar_today</mat-icon>
                <span>Mon – Sun</span>
              </div>
            </div>

            <!-- PAYMENT AMOUNT AS CENTRAL FOCUS -->
            <div class="payment-centerpiece">
              <div class="centerpiece-sub">TOTAL PROCESSED PAYMENT VOLUME</div>
              <div class="centerpiece-amount-hero">
                {{ totalVolume | currency:'VND':'symbol':'1.0-0' }}
              </div>
              
              <!-- Inflow / Outflow Breakdown Badges -->
              <div class="breakdown-badges">
                <div class="breakdown-item inflow">
                  <span class="breakdown-dot green"></span>
                  <span class="breakdown-lbl">Inflow (Top Up):</span>
                  <strong class="breakdown-val">+₫7,000,000</strong>
                </div>
                <div class="breakdown-divider"></div>
                <div class="breakdown-item outflow">
                  <span class="breakdown-dot red"></span>
                  <span class="breakdown-lbl">Outflow (Payment):</span>
                  <strong class="breakdown-val">-₫2,773,000</strong>
                </div>
              </div>
            </div>

            <!-- HIGH-END GRADIENT BAR & AREA HYBRID CHART -->
            <div class="hero-chart-container">
              <svg viewBox="0 0 540 160" class="svg-chart">
                <defs>
                  <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#059669" stop-opacity="0.9"/>
                    <stop offset="100%" stop-color="#10b981" stop-opacity="0.3"/>
                  </linearGradient>
                  <linearGradient id="barGradActive" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#047857" stop-opacity="1"/>
                    <stop offset="100%" stop-color="#059669" stop-opacity="0.6"/>
                  </linearGradient>
                  <linearGradient id="glowArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#10b981" stop-opacity="0.25"/>
                    <stop offset="100%" stop-color="#10b981" stop-opacity="0.0"/>
                  </linearGradient>
                  <filter id="shadowGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>

                <!-- Grid Horizontal Guidelines -->
                <line x1="30" y1="20" x2="510" y2="20" stroke="#f1f5f9" stroke-dasharray="4,4"/>
                <line x1="30" y1="60" x2="510" y2="60" stroke="#f1f5f9" stroke-dasharray="4,4"/>
                <line x1="30" y1="100" x2="510" y2="100" stroke="#f1f5f9" stroke-dasharray="4,4"/>

                <!-- Area Fill Glow -->
                <path d="M 50 110 Q 125 70, 200 90 T 350 40 T 490 30 L 490 120 L 50 120 Z" fill="url(#glowArea)"/>

                <!-- 7 Day Vertical Volume Bars with Rounded Tops -->
                <g class="chart-bars">
                  <!-- Mon: 750k -->
                  <rect x="42" y="70" width="16" height="50" rx="6" fill="url(#barGrad)" class="chart-bar"/>
                  <!-- Tue: 1,000k -->
                  <rect x="115" y="55" width="16" height="65" rx="6" fill="url(#barGrad)" class="chart-bar"/>
                  <!-- Wed: 850k -->
                  <rect x="188" y="65" width="16" height="55" rx="6" fill="url(#barGrad)" class="chart-bar"/>
                  <!-- Thu: 1,150k -->
                  <rect x="261" y="45" width="16" height="75" rx="6" fill="url(#barGrad)" class="chart-bar"/>
                  <!-- Fri: 1,400k -->
                  <rect x="334" y="32" width="16" height="88" rx="6" fill="url(#barGrad)" class="chart-bar"/>
                  <!-- Sat (Active High Peak): 1,550k -->
                  <rect x="407" y="24" width="16" height="96" rx="6" fill="url(#barGradActive)" class="chart-bar active" filter="url(#shadowGlow)"/>
                  <!-- Sun: 1,500k -->
                  <rect x="480" y="28" width="16" height="92" rx="6" fill="url(#barGrad)" class="chart-bar"/>
                </g>

                <!-- Trend Connection Line -->
                <path d="M 50 70 L 123 55 L 196 65 L 269 45 L 342 32 L 415 24 L 488 28" fill="none" stroke="#059669" stroke-width="2.5" stroke-linecap="round" />

                <!-- Nodes -->
                <circle cx="50" cy="70" r="3.5" fill="#ffffff" stroke="#059669" stroke-width="2"/>
                <circle cx="123" cy="55" r="3.5" fill="#ffffff" stroke="#059669" stroke-width="2"/>
                <circle cx="196" cy="65" r="3.5" fill="#ffffff" stroke="#059669" stroke-width="2"/>
                <circle cx="269" cy="45" r="3.5" fill="#ffffff" stroke="#059669" stroke-width="2"/>
                <circle cx="342" cy="32" r="3.5" fill="#ffffff" stroke="#059669" stroke-width="2"/>
                <circle cx="415" cy="24" r="5" fill="#059669" stroke="#ffffff" stroke-width="2.5"/>
                <circle cx="488" cy="28" r="3.5" fill="#ffffff" stroke="#059669" stroke-width="2"/>

                <!-- X Axis Labels -->
                <text x="50" y="142" font-size="11" font-weight="600" fill="#64748b" text-anchor="middle">Mon</text>
                <text x="123" y="142" font-size="11" font-weight="600" fill="#64748b" text-anchor="middle">Tue</text>
                <text x="196" y="142" font-size="11" font-weight="600" fill="#64748b" text-anchor="middle">Wed</text>
                <text x="269" y="142" font-size="11" font-weight="600" fill="#64748b" text-anchor="middle">Thu</text>
                <text x="342" y="142" font-size="11" font-weight="600" fill="#64748b" text-anchor="middle">Fri</text>
                <text x="415" y="142" font-size="11" font-weight="800" fill="#059669" text-anchor="middle">Sat</text>
                <text x="488" y="142" font-size="11" font-weight="600" fill="#64748b" text-anchor="middle">Sun</text>
              </svg>
            </div>
          </div>

          <!-- Metallic Emerald Glass Wallet Card -->
          <div class="content-card wallet-box-card hover-lift">
            <div class="card-header-flex mb-16">
              <div>
                <span class="hero-tag">PAYGATE WALLET</span>
                <div class="card-title">Digital Debit Card</div>
              </div>
              <span class="status-chip active">ACTIVE</span>
            </div>

            <!-- Metallic Shimmer Card -->
            <div class="emerald-wallet-card shimmer-box">
              <div class="card-top-row">
                <div class="paygate-brand-chip">
                  <mat-icon class="chip-icon">credit_card</mat-icon>
                  <span>PayGate Debit</span>
                </div>
                <div class="card-contactless">
                  <mat-icon>wifi</mat-icon>
                </div>
              </div>

              <div class="card-mid-section mt-20">
                <div class="wallet-field-label">ACCOUNT NUMBER</div>
                <div class="account-num-wrapper">
                  <span class="wallet-account-num">{{ account?.accountNumber || 'PAY0000000001' }}</span>
                  <mat-icon class="copy-btn-icon" (click)="copyAccNumber()" title="Copy Account Number">content_copy</mat-icon>
                </div>
              </div>

              <div class="card-bottom-section mt-20">
                <div>
                  <div class="wallet-field-label">AVAILABLE BALANCE</div>
                  <div class="wallet-balance-num">{{ (account?.balance || 0) | currency:'VND':'symbol':'1.0-0' }}</div>
                </div>
                <div class="currency-tag">VND</div>
              </div>
            </div>

            <!-- Card Actions -->
            <div class="wallet-card-actions">
              <a mat-button class="btn-wallet-outline" routerLink="/accounts/me">
                <mat-icon class="action-icon">account_circle</mat-icon>
                View account
              </a>
              <a mat-raised-button class="btn-wallet-solid" routerLink="/transactions/history">
                <mat-icon class="action-icon">history</mat-icon>
                History
              </a>
            </div>
          </div>
        </div>

        <!-- Bottom Table Card: Recent Transactions (Spaced Out) -->
        <div class="content-card table-card hover-lift">
          <div class="table-header-row">
            <div>
              <span class="hero-tag">LIVE AUDIT LOGS</span>
              <div class="card-title">Recent Transactions</div>
              <div class="card-subtitle">Real-time payment logs processed on your wallet</div>
            </div>
            <a routerLink="/transactions/history" class="view-all-link">
              View all transactions ↗
            </a>
          </div>

          <div class="custom-table-wrapper">
            <table class="paygate-table">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Type</th>
                  <th>Counterparty</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let tx of recentTransactions" class="table-row-interactive">
                  <td class="font-mono">
                    <div class="ref-cell">
                      <mat-icon class="dir-icon" [ngClass]="tx.type === 'TOPUP' ? 'inbound' : 'outbound'">
                        {{ tx.type === 'TOPUP' ? 'south_west' : 'north_east' }}
                      </mat-icon>
                      <span class="ref-link">{{ tx.transactionRef }}</span>
                    </div>
                  </td>
                  <td class="font-medium">
                    <span class="type-badge">{{ tx.type }}</span>
                  </td>
                  <td class="font-mono text-muted">PAY000000000{{ tx.destAccountId }}</td>
                  <td class="font-bold" [ngClass]="tx.type === 'TOPUP' ? 'text-green' : 'text-dark'">
                    {{ tx.type === 'TOPUP' ? '+' : '-' }}{{ tx.amount | currency:'VND':'symbol':'1.0-0' }}
                  </td>
                  <td>
                    <span class="status-pill" [ngClass]="tx.status.toLowerCase()">
                      <span class="pill-dot"></span>
                      {{ tx.status }}
                    </span>
                  </td>
                  <td class="text-muted">{{ tx.createdAt | date:'dd MMM YYYY, HH:mm' }}</td>
                </tr>
                <tr *ngIf="recentTransactions.length === 0">
                  <td colspan="6" class="text-center py-6 text-muted">
                    <div class="empty-state">
                      <mat-icon class="empty-icon">receipt_long</mat-icon>
                      <div>No transactions found. Make your first payment or top up today!</div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* Keyframe Animations */
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(14px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes pulseGlow {
      0% { box-shadow: 0 0 0 0 rgba(5, 150, 105, 0.4); }
      70% { box-shadow: 0 0 0 10px rgba(5, 150, 105, 0); }
      100% { box-shadow: 0 0 0 0 rgba(5, 150, 105, 0); }
    }
    @keyframes shimmer {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }

    .fade-in-up { animation: fadeInUp 0.4s ease-out forwards; }
    
    /* Generous Spacing for Dashboard */
    .console-dashboard { display: flex; flex-direction: column; gap: 32px; color: #0f172a; font-family: 'Inter', system-ui, sans-serif; }
    .loading-box { display: flex; justify-content: center; padding: 60px; }

    /* Welcome Header Banner */
    .welcome-header { display: flex; justify-content: space-between; align-items: flex-start; }
    .welcome-badge { display: inline-flex; align-items: center; gap: 6px; background-color: #ecfdf5; border: 1px solid #a7f3d0; padding: 4px 12px; border-radius: 20px; margin-bottom: 8px; }
    .pulse-indicator { width: 8px; height: 8px; background-color: #10b981; border-radius: 50%; animation: pulseGlow 2s infinite; }
    .badge-text { font-size: 0.72rem; font-weight: 800; color: #047857; text-transform: uppercase; letter-spacing: 0.05em; }

    .welcome-title-group h2 { font-size: 1.75rem; font-weight: 800; margin: 0 0 4px 0; color: #0f172a; letter-spacing: -0.02em; }
    .welcome-subtitle { font-size: 0.9rem; color: #64748b; margin: 0; }
    .header-action-buttons { display: flex; align-items: center; gap: 14px; }

    .btn-topup { background-color: #ffffff; border: 1px solid #cbd5e1; color: #334155; border-radius: 10px; font-weight: 600; font-size: 0.875rem; padding: 0 18px; height: 44px; transition: all 0.2s; display: flex; align-items: center; gap: 8px; }
    .btn-topup:hover { background-color: #f8fafc; border-color: #94a3b8; color: #0f172a; }
    .btn-icon { font-size: 18px; width: 18px; height: 18px; color: #059669; }

    .btn-new-payment { background: linear-gradient(135deg, #059669 0%, #047857 100%); color: #ffffff !important; border-radius: 10px; font-weight: 700; font-size: 0.875rem; padding: 0 22px; height: 44px; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 14px rgba(5, 150, 105, 0.3); transition: all 0.2s; }
    .btn-new-payment:hover { transform: translateY(-1.5px); box-shadow: 0 6px 18px rgba(5, 150, 105, 0.4); }
    .arrow { font-size: 1.1rem; font-weight: 700; }

    /* Hover Lift Glass Effect */
    .hover-lift { transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s cubic-bezier(0.16, 1, 0.3, 1); }
    .hover-lift:hover { transform: translateY(-3px); box-shadow: 0 16px 32px -8px rgba(15, 23, 42, 0.08); }

    .dashboard-content { display: flex; flex-direction: column; gap: 32px; }

    /* 4 Top Metric Cards Grid (Spaced out gap: 20px) */
    .metrics-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; }
    .metric-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 18px; padding: 22px 24px; box-shadow: 0 4px 20px -5px rgba(0,0,0,0.03); display: flex; flex-direction: column; justify-content: space-between; }
    .metric-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
    .metric-label { font-size: 0.7rem; font-weight: 800; color: #64748b; letter-spacing: 0.05em; text-transform: uppercase; }

    .icon-circle { width: 38px; height: 38px; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
    .emerald-tint { background-color: #ecfdf5; border: 1px solid #a7f3d0; }
    .blue-tint { background-color: #e0f2fe; border: 1px solid #bae6fd; }
    .purple-tint { background-color: #f3e8ff; border: 1px solid #e9d5ff; }
    .red-tint { background-color: #fee2e2; border: 1px solid #fecaca; }

    .metric-icon { font-size: 20px; width: 20px; height: 20px; }
    .metric-icon.green { color: #059669; }
    .metric-icon.blue { color: #0284c7; }
    .metric-icon.purple { color: #9333ea; }
    .metric-icon.red { color: #dc2626; }

    .metric-value-row { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; margin-bottom: 6px; }
    .metric-value { font-size: 1.6rem; font-weight: 800; color: #0f172a; letter-spacing: -0.02em; }
    
    .trend-badge { display: inline-flex; align-items: center; gap: 2px; font-size: 0.72rem; font-weight: 700; padding: 2px 8px; border-radius: 12px; }
    .trend-badge.positive { background-color: #dcfce7; color: #15803d; }
    .trend-badge.neutral { background-color: #f1f5f9; color: #475569; }
    .trend-badge.negative { background-color: #fee2e2; color: #b91c1c; }
    .trend-icon { font-size: 14px; width: 14px; height: 14px; }
    .metric-subtext { font-size: 0.75rem; color: #94a3b8; }

    /* Middle Grid (Chart + Wallet Card) */
    .middle-grid { display: grid; grid-template-columns: 1.8fr 1.2fr; gap: 24px; }
    .content-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 20px; padding: 28px; box-shadow: 0 4px 20px -5px rgba(0,0,0,0.03); }
    .card-header-flex { display: flex; justify-content: space-between; align-items: flex-start; }
    .hero-tag { font-size: 0.68rem; font-weight: 800; color: #059669; letter-spacing: 0.06em; text-transform: uppercase; display: block; margin-bottom: 2px; }
    .hero-title { font-size: 1.25rem; font-weight: 800; color: #0f172a; margin: 0; letter-spacing: -0.01em; }
    .card-title { font-size: 1.05rem; font-weight: 800; color: #0f172a; margin-top: 2px; }
    .card-subtitle { font-size: 0.825rem; color: #64748b; margin-top: 2px; }
    
    .mb-16 { margin-bottom: 16px; }
    .mt-20 { margin-top: 20px; }

    /* HERO PAYMENT CENTERPIECE CARD */
    .chart-card-hero { display: flex; flex-direction: column; gap: 20px; background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%); }
    .hero-chart-header { display: flex; justify-content: space-between; align-items: flex-start; }
    
    .time-range-badge { display: flex; align-items: center; gap: 6px; background: #f1f5f9; padding: 5px 12px; border-radius: 10px; font-size: 0.78rem; font-weight: 700; color: #475569; }
    .time-icon { font-size: 14px; width: 14px; height: 14px; color: #059669; }

    /* Centered Payment Amount Focus */
    .payment-centerpiece {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 24px;
      text-align: center;
      box-shadow: 0 4px 16px -4px rgba(5, 150, 105, 0.08);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    .centerpiece-sub { font-size: 0.7rem; font-weight: 800; color: #64748b; letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 4px; }
    .centerpiece-amount-hero { font-size: 2.5rem; font-weight: 900; color: #059669; letter-spacing: -0.03em; margin: 2px 0 14px 0; text-shadow: 0 2px 10px rgba(5, 150, 105, 0.15); }
    
    .breakdown-badges { display: flex; align-items: center; gap: 18px; background: #f8fafc; padding: 8px 18px; border-radius: 12px; border: 1px solid #e2e8f0; }
    .breakdown-item { display: flex; align-items: center; gap: 6px; font-size: 0.8rem; }
    .breakdown-dot { width: 8px; height: 8px; border-radius: 50%; }
    .breakdown-dot.green { background-color: #10b981; }
    .breakdown-dot.red { background-color: #ef4444; }
    .breakdown-lbl { color: #64748b; font-weight: 500; }
    .breakdown-val { color: #0f172a; font-weight: 700; }
    .breakdown-divider { width: 1px; height: 16px; background-color: #cbd5e1; }

    .hero-chart-container { width: 100%; height: 170px; margin-top: 4px; }
    .svg-chart { width: 100%; height: 100%; overflow: visible; }
    
    .chart-bar { transition: all 0.2s ease; cursor: pointer; }
    .chart-bar:hover { fill: #047857 !important; filter: drop-shadow(0 4px 8px rgba(5, 150, 105, 0.4)); }

    /* Metallic Emerald Wallet Card */
    .wallet-box-card { display: flex; flex-direction: column; justify-content: space-between; }
    .status-chip { font-size: 0.68rem; font-weight: 800; padding: 3px 10px; border-radius: 10px; letter-spacing: 0.04em; }
    .status-chip.active { background-color: #dcfce7; color: #15803d; border: 1px solid #a7f3d0; }

    .emerald-wallet-card { background: linear-gradient(135deg, #047857 0%, #065f46 50%, #064e3b 100%); color: #ffffff; border-radius: 16px; padding: 24px; position: relative; overflow: hidden; box-shadow: 0 10px 24px rgba(4, 120, 87, 0.25); }
    .shimmer-box::after { content: ''; position: absolute; top: -50%; left: -50%; width: 200%; height: 200%; background: linear-gradient(60deg, transparent 30%, rgba(255,255,255,0.08) 50%, transparent 70%); transform: rotate(30deg); transition: transform 0.6s; }
    .emerald-wallet-card:hover::after { animation: shimmer 1.5s infinite; }

    .card-top-row { display: flex; justify-content: space-between; align-items: center; }
    .paygate-brand-chip { display: flex; align-items: center; gap: 6px; font-size: 0.75rem; font-weight: 700; color: #a7f3d0; text-transform: uppercase; letter-spacing: 0.05em; }
    .chip-icon { font-size: 18px; width: 18px; height: 18px; color: #a7f3d0; }
    .card-contactless mat-icon { font-size: 20px; width: 20px; height: 20px; color: #a7f3d0; opacity: 0.8; }

    .wallet-field-label { font-size: 0.68rem; font-weight: 700; letter-spacing: 0.06em; color: #a7f3d0; opacity: 0.9; text-transform: uppercase; }
    .account-num-wrapper { display: flex; align-items: center; gap: 8px; margin-top: 4px; }
    .wallet-account-num { font-size: 1.15rem; font-weight: 700; font-family: monospace; color: #ffffff; letter-spacing: 0.04em; }
    .copy-btn-icon { font-size: 16px; width: 16px; height: 16px; color: #a7f3d0; cursor: pointer; transition: color 0.15s; }
    .copy-btn-icon:hover { color: #ffffff; }

    .card-bottom-section { display: flex; justify-content: space-between; align-items: flex-end; }
    .wallet-balance-num { font-size: 1.85rem; font-weight: 800; margin-top: 2px; color: #ffffff; letter-spacing: -0.01em; }
    .currency-tag { font-size: 0.75rem; font-weight: 800; background-color: rgba(255,255,255,0.15); padding: 3px 10px; border-radius: 8px; color: #ffffff; }

    .wallet-card-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 20px; }
    .btn-wallet-outline { border: 1px solid #e2e8f0; color: #334155; border-radius: 12px; font-weight: 600; font-size: 0.85rem; height: 42px; display: flex; align-items: center; justify-content: center; gap: 6px; transition: all 0.15s; }
    .btn-wallet-outline:hover { background-color: #f8fafc; border-color: #cbd5e1; color: #0f172a; }
    .btn-wallet-solid { background-color: #059669 !important; color: #ffffff !important; border-radius: 12px; font-weight: 700; font-size: 0.85rem; height: 42px; display: flex; align-items: center; justify-content: center; gap: 6px; box-shadow: 0 4px 12px rgba(5, 150, 105, 0.25); }
    .btn-wallet-solid:hover { background-color: #047857 !important; }
    .action-icon { font-size: 18px; width: 18px; height: 18px; }

    /* Bottom Recent Transactions Table */
    .table-card { display: flex; flex-direction: column; gap: 18px; }
    .table-header-row { display: flex; justify-content: space-between; align-items: flex-start; }
    .view-all-link { font-size: 0.85rem; font-weight: 700; color: #059669; text-decoration: none; transition: color 0.15s; }
    .view-all-link:hover { color: #047857; text-decoration: underline; }

    .custom-table-wrapper { overflow-x: auto; }
    .paygate-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 0.875rem; }
    .paygate-table th { padding: 14px 18px; font-size: 0.72rem; font-weight: 700; color: #64748b; border-bottom: 1px solid #e2e8f0; background: #f8fafc; text-transform: uppercase; letter-spacing: 0.04em; }
    .paygate-table td { padding: 16px 18px; border-bottom: 1px solid #f1f5f9; color: #1e293b; transition: background-color 0.15s; }
    
    .table-row-interactive:hover td { background-color: #f8fafc; }

    .ref-cell { display: flex; align-items: center; gap: 8px; }
    .dir-icon { font-size: 16px; width: 16px; height: 16px; border-radius: 50%; padding: 2px; }
    .dir-icon.inbound { background-color: #dcfce7; color: #16a34a; }
    .dir-icon.outbound { background-color: #fee2e2; color: #dc2626; }

    .ref-link { font-family: monospace; font-size: 0.825rem; font-weight: 700; color: #059669; }
    .type-badge { font-weight: 600; font-size: 0.825rem; background-color: #f1f5f9; padding: 2px 8px; border-radius: 6px; color: #334155; }

    .font-mono { font-family: monospace; font-size: 0.825rem; font-weight: 600; }
    .font-medium { font-weight: 600; }
    .font-bold { font-weight: 700; }
    .text-green { color: #16a34a; }
    .text-dark { color: #0f172a; }
    .text-muted { color: #64748b; }
    .text-center { text-align: center; }
    .py-6 { padding-top: 24px; padding-bottom: 24px; }

    .status-pill { display: inline-flex; align-items: center; gap: 6px; padding: 3px 10px; border-radius: 14px; font-size: 0.72rem; font-weight: 700; text-transform: uppercase; }
    .pill-dot { width: 6px; height: 6px; border-radius: 50%; }
    
    .status-pill.completed { background-color: #dcfce7; color: #15803d; }
    .status-pill.completed .pill-dot { background-color: #16a34a; }
    
    .status-pill.failed { background-color: #fee2e2; color: #b91c1c; }
    .status-pill.failed .pill-dot { background-color: #dc2626; }
    
    .status-pill.processing { background-color: #e0f2fe; color: #0369a1; }
    .status-pill.processing .pill-dot { background-color: #0284c7; }

    .empty-state { display: flex; flex-direction: column; align-items: center; gap: 8px; color: #94a3b8; }
    .empty-icon { font-size: 32px; width: 32px; height: 32px; color: #cbd5e1; }

    @media (max-width: 1024px) {
      .metrics-grid { grid-template-columns: repeat(2, 1fr); }
      .middle-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class AccountDashboardComponent implements OnInit {
  account: AccountResponse | null = null;
  recentTransactions: TransactionResponse[] = [];
  totalVolume = 2773000;
  totalTransactionsCount = 7;
  failedTransactionsCount = 0;
  loading = true;

  constructor(
    private accountService: AccountService,
    private transactionService: TransactionService,
    private authService: AuthService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadDashboardData();
  }

  getDisplayName(): string {
    const user = this.authService.getUsername();
    if (!user) return 'Nguyen';
    return user.split('@')[0];
  }

  copyAccNumber(): void {
    const num = this.account?.accountNumber || 'PAY0000000001';
    navigator.clipboard.writeText(num);
    this.snackBar.open('Copied Account Number: ' + num, 'Close', { duration: 2000 });
  }

  private loadDashboardData(): void {
    this.loading = true;
    this.accountService.getAccountMe().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.account = res.data;
          this.loadRecentTransactions(res.data.id);
        } else {
          this.loading = false;
        }
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  private loadRecentTransactions(accountId: number): void {
    this.accountService.getAccountHistory(accountId, 0, 6).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.recentTransactions = res.data.content;
          if (res.data.totalElements > 0) {
            this.totalTransactionsCount = res.data.totalElements;
          }
          this.failedTransactionsCount = res.data.content.filter(t => t.status === 'FAILED').length;
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }
}
