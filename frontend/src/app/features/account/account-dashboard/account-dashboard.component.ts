import { Component, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
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
    MatProgressSpinnerModule
  ],
  template: `
    <div class="console-dashboard">
      <!-- Top Welcome Banner & Action Buttons -->
      <div class="welcome-header">
        <div class="welcome-title-group">
          <h2>Welcome back, {{ getDisplayName() }}</h2>
          <p class="welcome-subtitle">Here's what's happening across your PayGate wallet today.</p>
        </div>
        <div class="header-action-buttons">
          <a mat-button class="btn-topup" routerLink="/accounts/topup">Top up</a>
          <a mat-raised-button class="btn-new-payment" routerLink="/transactions/pay">
            New payment <span class="arrow">↗</span>
          </a>
        </div>
      </div>

      <div *ngIf="loading" class="loading-box">
        <mat-spinner diameter="40"></mat-spinner>
      </div>

      <div *ngIf="!loading">
        <!-- 4 Top Metric Cards Grid -->
        <div class="metrics-grid">
          <!-- Metric 1: Wallet Balance -->
          <div class="metric-card">
            <div class="metric-header">
              <span class="metric-label">WALLET BALANCE</span>
              <mat-icon class="metric-icon green">account_balance_wallet</mat-icon>
            </div>
            <div class="metric-value">{{ (account?.balance || 0) | currency:'VND':'symbol':'1.0-0' }}</div>
          </div>

          <!-- Metric 2: Total Volume (7D) -->
          <div class="metric-card">
            <div class="metric-header">
              <span class="metric-label">TOTAL VOLUME (7D)</span>
              <mat-icon class="metric-icon blue">trending_up</mat-icon>
            </div>
            <div class="metric-value">{{ totalVolume | currency:'VND':'symbol':'1.0-0' }}</div>
          </div>

          <!-- Metric 3: Transactions Count -->
          <div class="metric-card">
            <div class="metric-header">
              <span class="metric-label">TRANSACTIONS</span>
              <mat-icon class="metric-icon purple">import_export</mat-icon>
            </div>
            <div class="metric-value">{{ totalTransactionsCount }}</div>
          </div>

          <!-- Metric 4: Failed Count -->
          <div class="metric-card">
            <div class="metric-header">
              <span class="metric-label">FAILED</span>
              <mat-icon class="metric-icon red">error_outline</mat-icon>
            </div>
            <div class="metric-value">{{ failedTransactionsCount }}</div>
          </div>
        </div>

        <!-- Middle Section: 7-Day Chart & Wallet Card -->
        <div class="middle-grid">
          <!-- Chart Card -->
          <div class="content-card chart-card">
            <div class="card-title">Payment Volume — Last 7 days</div>
            <div class="chart-container">
              <svg viewBox="0 0 500 180" class="svg-chart">
                <defs>
                  <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#059669" stop-opacity="0.3"/>
                    <stop offset="100%" stop-color="#059669" stop-opacity="0.0"/>
                  </linearGradient>
                </defs>
                <!-- Horizontal Grid Lines -->
                <line x1="40" y1="30" x2="480" y2="30" stroke="#f1f5f9" stroke-dasharray="3,3"/>
                <line x1="40" y1="75" x2="480" y2="75" stroke="#f1f5f9" stroke-dasharray="3,3"/>
                <line x1="40" y1="120" x2="480" y2="120" stroke="#f1f5f9" stroke-dasharray="3,3"/>

                <!-- Y Axis Labels -->
                <text x="30" y="35" font-size="10" fill="#94a3b8" text-anchor="end">1600k</text>
                <text x="30" y="80" font-size="10" fill="#94a3b8" text-anchor="end">1200k</text>
                <text x="30" y="125" font-size="10" fill="#94a3b8" text-anchor="end">800k</text>
                <text x="30" y="160" font-size="10" fill="#94a3b8" text-anchor="end">0k</text>

                <!-- Gradient Fill Area -->
                <path d="M 40 130 Q 110 90, 180 110 T 320 60 T 480 40 L 480 160 L 40 160 Z" fill="url(#chartGradient)"/>
                <!-- Smooth Curve Line -->
                <path d="M 40 130 Q 110 90, 180 110 T 320 60 T 480 40" fill="none" stroke="#059669" stroke-width="2.5" stroke-linecap="round"/>

                <!-- X Axis Day Labels -->
                <text x="40" y="175" font-size="10" fill="#64748b">Mon</text>
                <text x="113" y="175" font-size="10" fill="#64748b">Tue</text>
                <text x="186" y="175" font-size="10" fill="#64748b">Wed</text>
                <text x="260" y="175" font-size="10" fill="#64748b">Thu</text>
                <text x="333" y="175" font-size="10" fill="#64748b">Fri</text>
                <text x="406" y="175" font-size="10" fill="#64748b">Sat</text>
                <text x="480" y="175" font-size="10" fill="#64748b" text-anchor="end">Sun</text>
              </svg>
            </div>
          </div>

          <!-- Wallet Green Card -->
          <div class="content-card wallet-box-card">
            <div class="card-title mb-12">Wallet</div>
            
            <div class="emerald-wallet-card">
              <div class="wallet-field-label">ACCOUNT NUMBER</div>
              <div class="wallet-account-num">{{ account?.accountNumber || 'PAY0000000001' }}</div>

              <div class="wallet-field-label mt-16">AVAILABLE BALANCE</div>
              <div class="wallet-balance-num">{{ (account?.balance || 0) | currency:'VND':'symbol':'1.0-0' }}</div>
            </div>

            <div class="wallet-card-actions">
              <a mat-button class="btn-wallet-outline" routerLink="/accounts/dashboard">View account</a>
              <a mat-raised-button class="btn-wallet-solid" routerLink="/transactions/history">History</a>
            </div>
          </div>
        </div>

        <!-- Bottom Table: Recent Transactions -->
        <div class="content-card table-card">
          <div class="table-header-row">
            <div class="card-title">Recent Transactions</div>
            <a routerLink="/transactions/history" class="view-all-link">View all</a>
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
                <tr *ngFor="let tx of recentTransactions">
                  <td class="font-mono">{{ tx.transactionRef }}</td>
                  <td class="font-medium">{{ tx.type }}</td>
                  <td class="font-mono text-muted">PAY000000000{{ tx.destAccountId }}</td>
                  <td class="font-bold">{{ tx.amount | currency:'VND':'symbol':'1.0-0' }}</td>
                  <td>
                    <span class="status-pill" [ngClass]="tx.status.toLowerCase()">
                      {{ tx.status }}
                    </span>
                  </td>
                  <td class="text-muted">{{ tx.createdAt | date:'dd MMM YYYY, HH:mm' }}</td>
                </tr>
                <tr *ngIf="recentTransactions.length === 0">
                  <td colspan="6" class="text-center py-4 text-muted">No transactions found.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .console-dashboard { display: flex; flex-direction: column; gap: 24px; color: #0f172a; }
    .loading-box { display: flex; justify-content: center; padding: 48px; }

    /* Header Banner */
    .welcome-header { display: flex; justify-content: space-between; align-items: flex-start; }
    .welcome-title-group h2 { font-size: 1.5rem; font-weight: 700; margin: 0 0 4px 0; color: #0f172a; }
    .welcome-subtitle { font-size: 0.875rem; color: #64748b; margin: 0; }
    .header-action-buttons { display: flex; align-items: center; gap: 12px; }
    
    .btn-topup { background-color: #ffffff; border: 1px solid #cbd5e1; color: #334155; border-radius: 8px; font-weight: 600; font-size: 0.875rem; padding: 0 16px; height: 38px; }
    .btn-new-payment { background-color: #059669; color: #ffffff; border-radius: 8px; font-weight: 600; font-size: 0.875rem; padding: 0 18px; height: 38px; display: flex; align-items: center; gap: 6px; }
    .btn-new-payment:hover { background-color: #047857; }
    .arrow { font-size: 1rem; }

    /* Top 4 Metrics Cards */
    .metrics-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
    .metric-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px 20px; box-shadow: 0 1px 2px rgba(0,0,0,0.03); }
    .metric-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .metric-label { font-size: 0.72rem; font-weight: 700; color: #64748b; letter-spacing: 0.04em; }
    .metric-icon { font-size: 18px; width: 18px; height: 18px; }
    .metric-icon.green { color: #059669; }
    .metric-icon.blue { color: #0284c7; }
    .metric-icon.purple { color: #8b5cf6; }
    .metric-icon.red { color: #ef4444; }
    .metric-value { font-size: 1.45rem; font-weight: 700; color: #0f172a; }

    /* Middle Grid */
    .middle-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 20px; }
    .content-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; box-shadow: 0 1px 2px rgba(0,0,0,0.03); }
    .card-title { font-size: 0.95rem; font-weight: 700; color: #0f172a; }
    .mb-12 { margin-bottom: 12px; }

    .chart-card { display: flex; flex-direction: column; }
    .chart-container { width: 100%; height: 180px; margin-top: 12px; }
    .svg-chart { width: 100%; height: 100%; overflow: visible; }

    /* Wallet Card Box */
    .wallet-box-card { display: flex; flex-direction: column; justify-content: space-between; }
    .emerald-wallet-card { background: linear-gradient(135deg, #047857 0%, #064e3b 100%); color: #ffffff; border-radius: 12px; padding: 20px; }
    .wallet-field-label { font-size: 0.68rem; font-weight: 700; letter-spacing: 0.05em; color: #a7f3d0; opacity: 0.9; }
    .wallet-account-num { font-size: 1.05rem; font-weight: 700; font-family: monospace; margin-top: 4px; color: #ffffff; }
    .mt-16 { margin-top: 16px; }
    .wallet-balance-num { font-size: 1.6rem; font-weight: 800; margin-top: 4px; color: #ffffff; }

    .wallet-card-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 16px; }
    .btn-wallet-outline { border: 1px solid #cbd5e1; color: #334155; border-radius: 8px; font-weight: 600; font-size: 0.85rem; height: 38px; }
    .btn-wallet-solid { background-color: #059669; color: #ffffff; border-radius: 8px; font-weight: 600; font-size: 0.85rem; height: 38px; }

    /* Table Section */
    .table-card { display: flex; flex-direction: column; gap: 16px; }
    .table-header-row { display: flex; justify-content: space-between; align-items: center; }
    .view-all-link { font-size: 0.85rem; font-weight: 600; color: #059669; text-decoration: none; }
    .view-all-link:hover { text-decoration: underline; }

    .custom-table-wrapper { overflow-x: auto; }
    .paygate-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 0.875rem; }
    .paygate-table th { padding: 12px 14px; font-size: 0.75rem; font-weight: 600; color: #64748b; border-bottom: 1px solid #e2e8f0; }
    .paygate-table td { padding: 14px; border-bottom: 1px solid #f1f5f9; color: #1e293b; }
    .paygate-table tr:last-child td { border-bottom: none; }

    .font-mono { font-family: monospace; font-size: 0.825rem; font-weight: 600; color: #334155; }
    .font-medium { font-weight: 600; }
    .font-bold { font-weight: 700; color: #0f172a; }
    .text-muted { color: #64748b; }
    .text-center { text-align: center; }
    .py-4 { padding-top: 16px; padding-bottom: 16px; }

    .status-pill { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 0.72rem; font-weight: 700; text-transform: uppercase; }
    .status-pill.completed { background-color: #dcfce7; color: #15803d; }
    .status-pill.failed { background-color: #fee2e2; color: #b91c1c; }
    .status-pill.pending { background-color: #fef3c7; color: #b45309; }

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
  failedTransactionsCount = 1;
  loading = true;

  constructor(
    private accountService: AccountService,
    private transactionService: TransactionService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadDashboardData();
  }

  getDisplayName(): string {
    const user = this.authService.getUsername();
    if (!user) return 'Nguyen';
    return user.split('@')[0];
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
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }
}
