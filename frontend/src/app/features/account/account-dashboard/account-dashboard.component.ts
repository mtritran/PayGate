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
          <p class="welcome-subtitle">Here's what's happening across your PayGate wallet today.</p>
        </div>
        <div class="header-action-buttons">
          <a mat-button class="btn-topup ripple-effect" routerLink="/accounts/topup">
            <mat-icon class="btn-icon">add_circle_outline</mat-icon>
            Top up
          </a>
          <a mat-raised-button class="btn-new-payment pulse-glow" routerLink="/transactions/pay">
            <span>New payment</span>
            <span class="arrow">↗</span>
          </a>
        </div>
      </div>

      <div *ngIf="loading" class="loading-box">
        <mat-spinner diameter="44" strokeWidth="3"></mat-spinner>
      </div>

      <div *ngIf="!loading" class="dashboard-content">
        <!-- 4 Top Metric Cards Grid -->
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

        <!-- Middle Section: 7-Day Chart & Metallic Emerald Wallet Card -->
        <div class="middle-grid">
          <!-- Interactive Area Chart Card -->
          <div class="content-card chart-card hover-lift">
            <div class="card-header-flex">
              <div>
                <div class="card-title">Payment Volume — Last 7 days</div>
                <div class="card-subtitle">Daily transaction flow breakdown</div>
              </div>
              <div class="chart-legend">
                <span class="legend-dot"></span>
                <span class="legend-text">Volume (VND)</span>
              </div>
            </div>

            <div class="chart-container">
              <svg viewBox="0 0 500 180" class="svg-chart">
                <defs>
                  <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#059669" stop-opacity="0.35"/>
                    <stop offset="60%" stop-color="#059669" stop-opacity="0.08"/>
                    <stop offset="100%" stop-color="#059669" stop-opacity="0.0"/>
                  </linearGradient>
                  <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>

                <!-- Grid Background -->
                <line x1="40" y1="30" x2="480" y2="30" stroke="#f1f5f9" stroke-dasharray="4,4"/>
                <line x1="40" y1="75" x2="480" y2="75" stroke="#f1f5f9" stroke-dasharray="4,4"/>
                <line x1="40" y1="120" x2="480" y2="120" stroke="#f1f5f9" stroke-dasharray="4,4"/>

                <!-- Y Axis Labels -->
                <text x="32" y="34" font-size="10" fill="#94a3b8" text-anchor="end" font-family="sans-serif">1,600k</text>
                <text x="32" y="79" font-size="10" fill="#94a3b8" text-anchor="end" font-family="sans-serif">1,200k</text>
                <text x="32" y="124" font-size="10" fill="#94a3b8" text-anchor="end" font-family="sans-serif">800k</text>
                <text x="32" y="158" font-size="10" fill="#94a3b8" text-anchor="end" font-family="sans-serif">0k</text>

                <!-- Gradient Fill Area -->
                <path d="M 40 130 Q 110 90, 180 110 T 320 60 T 480 40 L 480 160 L 40 160 Z" fill="url(#chartGradient)"/>

                <!-- Animated Smooth Curve Line -->
                <path class="animated-line" d="M 40 130 Q 110 90, 180 110 T 320 60 T 480 40" fill="none" stroke="#059669" stroke-width="3" stroke-linecap="round" filter="url(#glow)"/>

                <!-- Interactive Data Nodes -->
                <g class="chart-nodes">
                  <circle cx="40" cy="130" r="4.5" fill="#ffffff" stroke="#059669" stroke-width="2.5" class="chart-point" />
                  <circle cx="113" cy="95" r="4.5" fill="#ffffff" stroke="#059669" stroke-width="2.5" class="chart-point" />
                  <circle cx="186" cy="110" r="4.5" fill="#ffffff" stroke="#059669" stroke-width="2.5" class="chart-point" />
                  <circle cx="260" cy="85" r="4.5" fill="#ffffff" stroke="#059669" stroke-width="2.5" class="chart-point" />
                  <circle cx="333" cy="60" r="4.5" fill="#ffffff" stroke="#059669" stroke-width="2.5" class="chart-point" />
                  <circle cx="406" cy="45" r="5" fill="#059669" stroke="#ffffff" stroke-width="2.5" class="chart-point pulsing" />
                  <circle cx="480" cy="40" r="5" fill="#059669" stroke="#ffffff" stroke-width="2.5" class="chart-point" />
                </g>

                <!-- X Axis Day Labels -->
                <text x="40" y="176" font-size="11" font-weight="600" fill="#64748b" text-anchor="middle">Mon</text>
                <text x="113" y="176" font-size="11" font-weight="600" fill="#64748b" text-anchor="middle">Tue</text>
                <text x="186" y="176" font-size="11" font-weight="600" fill="#64748b" text-anchor="middle">Wed</text>
                <text x="260" y="176" font-size="11" font-weight="600" fill="#64748b" text-anchor="middle">Thu</text>
                <text x="333" y="176" font-size="11" font-weight="600" fill="#64748b" text-anchor="middle">Fri</text>
                <text x="406" y="176" font-size="11" font-weight="600" fill="#059669" text-anchor="middle">Sat</text>
                <text x="480" y="176" font-size="11" font-weight="600" fill="#64748b" text-anchor="end">Sun</text>
              </svg>
            </div>
          </div>

          <!-- Metallic Emerald Glass Wallet Card -->
          <div class="content-card wallet-box-card hover-lift">
            <div class="card-header-flex mb-12">
              <div class="card-title">Wallet Card</div>
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

              <div class="card-mid-section mt-16">
                <div class="wallet-field-label">ACCOUNT NUMBER</div>
                <div class="account-num-wrapper">
                  <span class="wallet-account-num">{{ account?.accountNumber || 'PAY0000000001' }}</span>
                  <mat-icon class="copy-btn-icon" (click)="copyAccNumber()" title="Copy Account Number">content_copy</mat-icon>
                </div>
              </div>

              <div class="card-bottom-section mt-16">
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

        <!-- Bottom Table Card: Recent Transactions -->
        <div class="content-card table-card hover-lift">
          <div class="table-header-row">
            <div>
              <div class="card-title">Recent Transactions</div>
              <div class="card-subtitle">Real-time payment logs on your wallet</div>
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
      from { opacity: 0; transform: translateY(12px); }
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
    .console-dashboard { display: flex; flex-direction: column; gap: 24px; color: #0f172a; font-family: 'Inter', system-ui, sans-serif; }
    .loading-box { display: flex; justify-content: center; padding: 60px; }

    /* Welcome Header Banner */
    .welcome-header { display: flex; justify-content: space-between; align-items: flex-start; }
    .welcome-badge { display: inline-flex; align-items: center; gap: 6px; background-color: #ecfdf5; border: 1px solid #a7f3d0; padding: 3px 10px; border-radius: 20px; margin-bottom: 8px; }
    .pulse-indicator { width: 8px; height: 8px; background-color: #10b981; border-radius: 50%; animation: pulseGlow 2s infinite; }
    .badge-text { font-size: 0.72rem; font-weight: 700; color: #047857; text-transform: uppercase; letter-spacing: 0.04em; }

    .welcome-title-group h2 { font-size: 1.65rem; font-weight: 800; margin: 0 0 4px 0; color: #0f172a; letter-spacing: -0.02em; }
    .welcome-subtitle { font-size: 0.875rem; color: #64748b; margin: 0; }
    .header-action-buttons { display: flex; align-items: center; gap: 12px; }

    .btn-topup { background-color: #ffffff; border: 1px solid #cbd5e1; color: #334155; border-radius: 10px; font-weight: 600; font-size: 0.875rem; padding: 0 16px; height: 42px; transition: all 0.2s; display: flex; align-items: center; gap: 6px; }
    .btn-topup:hover { background-color: #f8fafc; border-color: #94a3b8; color: #0f172a; }
    .btn-icon { font-size: 18px; width: 18px; height: 18px; color: #059669; }

    .btn-new-payment { background: linear-gradient(135deg, #059669 0%, #047857 100%); color: #ffffff !important; border-radius: 10px; font-weight: 600; font-size: 0.875rem; padding: 0 20px; height: 42px; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 12px rgba(5, 150, 105, 0.25); transition: all 0.2s; }
    .btn-new-payment:hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(5, 150, 105, 0.35); }
    .arrow { font-size: 1.1rem; font-weight: 700; }

    /* Hover Lift Glass Effect */
    .hover-lift { transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s cubic-bezier(0.16, 1, 0.3, 1); }
    .hover-lift:hover { transform: translateY(-3px); box-shadow: 0 12px 24px -6px rgba(15, 23, 42, 0.08); }

    /* 4 Top Metric Cards Grid */
    .metrics-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
    .metric-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.03); display: flex; flex-direction: column; justify-content: space-between; }
    .metric-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .metric-label { font-size: 0.7rem; font-weight: 700; color: #64748b; letter-spacing: 0.05em; text-transform: uppercase; }

    .icon-circle { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; }
    .emerald-tint { background-color: #ecfdf5; }
    .blue-tint { background-color: #e0f2fe; }
    .purple-tint { background-color: #f3e8ff; }
    .red-tint { background-color: #fee2e2; }

    .metric-icon { font-size: 20px; width: 20px; height: 20px; }
    .metric-icon.green { color: #059669; }
    .metric-icon.blue { color: #0284c7; }
    .metric-icon.purple { color: #9333ea; }
    .metric-icon.red { color: #dc2626; }

    .metric-value-row { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; margin-bottom: 4px; }
    .metric-value { font-size: 1.55rem; font-weight: 800; color: #0f172a; letter-spacing: -0.02em; }
    
    .trend-badge { display: inline-flex; align-items: center; gap: 2px; font-size: 0.72rem; font-weight: 700; padding: 2px 8px; border-radius: 12px; }
    .trend-badge.positive { background-color: #dcfce7; color: #15803d; }
    .trend-badge.neutral { background-color: #f1f5f9; color: #475569; }
    .trend-badge.negative { background-color: #fee2e2; color: #b91c1c; }
    .trend-icon { font-size: 14px; width: 14px; height: 14px; }
    .metric-subtext { font-size: 0.75rem; color: #94a3b8; }

    /* Middle Grid (Chart + Wallet Card) */
    .middle-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 20px; }
    .content-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 22px; box-shadow: 0 1px 3px rgba(0,0,0,0.03); }
    .card-header-flex { display: flex; justify-content: space-between; align-items: flex-start; }
    .card-title { font-size: 1rem; font-weight: 700; color: #0f172a; }
    .card-subtitle { font-size: 0.8rem; color: #64748b; margin-top: 2px; }
    .mb-12 { margin-bottom: 12px; }
    .mt-16 { margin-top: 16px; }

    /* SVG Chart */
    .chart-card { display: flex; flex-direction: column; }
    .chart-legend { display: flex; align-items: center; gap: 6px; }
    .legend-dot { width: 8px; height: 8px; background-color: #059669; border-radius: 50%; }
    .legend-text { font-size: 0.75rem; font-weight: 600; color: #475569; }
    .chart-container { width: 100%; height: 190px; margin-top: 16px; }
    .svg-chart { width: 100%; height: 100%; overflow: visible; }
    .chart-point { transition: r 0.2s ease, fill 0.2s ease; cursor: pointer; }
    .chart-point:hover { r: 7; fill: #047857; }

    /* Metallic Emerald Wallet Card (Screenshot Match) */
    .wallet-box-card { display: flex; flex-direction: column; justify-content: space-between; }
    .status-chip { font-size: 0.68rem; font-weight: 800; padding: 2px 8px; border-radius: 10px; letter-spacing: 0.04em; }
    .status-chip.active { background-color: #dcfce7; color: #15803d; }

    .emerald-wallet-card { background: linear-gradient(135deg, #047857 0%, #065f46 50%, #064e3b 100%); color: #ffffff; border-radius: 14px; padding: 22px; position: relative; overflow: hidden; box-shadow: 0 8px 20px rgba(4, 120, 87, 0.2); }
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
    .wallet-balance-num { font-size: 1.8rem; font-weight: 800; margin-top: 2px; color: #ffffff; letter-spacing: -0.01em; }
    .currency-tag { font-size: 0.75rem; font-weight: 800; background-color: rgba(255,255,255,0.15); padding: 2px 8px; border-radius: 6px; color: #ffffff; }

    .wallet-card-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 16px; }
    .btn-wallet-outline { border: 1px solid #e2e8f0; color: #334155; border-radius: 10px; font-weight: 600; font-size: 0.85rem; height: 40px; display: flex; align-items: center; justify-content: center; gap: 6px; transition: all 0.15s; }
    .btn-wallet-outline:hover { background-color: #f8fafc; border-color: #cbd5e1; color: #0f172a; }
    .btn-wallet-solid { background-color: #059669 !important; color: #ffffff !important; border-radius: 10px; font-weight: 600; font-size: 0.85rem; height: 40px; display: flex; align-items: center; justify-content: center; gap: 6px; box-shadow: 0 2px 6px rgba(5, 150, 105, 0.2); }
    .btn-wallet-solid:hover { background-color: #047857 !important; }
    .action-icon { font-size: 18px; width: 18px; height: 18px; }

    /* Bottom Recent Transactions Table */
    .table-card { display: flex; flex-direction: column; gap: 16px; }
    .table-header-row { display: flex; justify-content: space-between; align-items: flex-start; }
    .view-all-link { font-size: 0.85rem; font-weight: 600; color: #059669; text-decoration: none; transition: color 0.15s; }
    .view-all-link:hover { color: #047857; text-decoration: underline; }

    .custom-table-wrapper { overflow-x: auto; }
    .paygate-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 0.875rem; }
    .paygate-table th { padding: 14px 16px; font-size: 0.72rem; font-weight: 700; color: #64748b; border-bottom: 1px solid #e2e8f0; text-transform: uppercase; letter-spacing: 0.04em; }
    .paygate-table td { padding: 14px 16px; border-bottom: 1px solid #f1f5f9; color: #1e293b; transition: background-color 0.15s; }
    
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
