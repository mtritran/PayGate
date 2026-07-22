import { Component, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AccountService } from '../../../core/services/account.service';
import { TransactionService } from '../../../core/services/transaction.service';
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
    <div class="dashboard-container">
      <h2>Ví Điện Tử & Số Dư</h2>

      <div *ngIf="loading" class="loading-spinner">
        <mat-spinner diameter="40"></mat-spinner>
      </div>

      <div *ngIf="!loading && account" class="grid-layout">
        <!-- Main Wallet Card -->
        <mat-card class="wallet-card">
          <mat-card-header>
            <mat-icon mat-card-avatar color="primary">account_balance_wallet</mat-icon>
            <mat-card-title>Số Dư Khả Dụng</mat-card-title>
            <mat-card-subtitle>Số TK: {{ account.accountNumber }} ({{ account.ownerType }})</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content class="wallet-content">
            <h1 class="balance-amount">{{ account.balance | currency:'VND':'symbol':'1.0-0' }}</h1>
            <span class="status-badge" [ngClass]="account.status.toLowerCase()">
              {{ account.status }}
            </span>
          </mat-card-content>
          <mat-card-actions class="wallet-actions">
            <a mat-raised-button color="primary" routerLink="/accounts/topup">
              <mat-icon>add_card</mat-icon> Nạp Tiền
            </a>
            <a mat-raised-button color="accent" routerLink="/transactions/pay">
              <mat-icon>payment</mat-icon> Thanh Toán
            </a>
            <a mat-button routerLink="/transactions/history">
              <mat-icon>history</mat-icon> Lịch Sử
            </a>
          </mat-card-actions>
        </mat-card>

        <!-- Quick Summary Card -->
        <mat-card class="summary-card">
          <mat-card-header>
            <mat-icon mat-card-avatar>info</mat-icon>
            <mat-card-title>Thông Tin Tài Khoản</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <p><strong>Mã Ví ID:</strong> #{{ account.id }}</p>
            <p><strong>Loại Tiền:</strong> {{ account.currency }}</p>
            <p><strong>Ngày Tạo:</strong> {{ account.createdAt | date:'dd/MM/yyyy HH:mm' }}</p>
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Recent Transactions Section -->
      <div *ngIf="!loading" class="recent-section">
        <h3>Giao Dịch Gần Đây</h3>
        <mat-card>
          <mat-card-content>
            <div *ngIf="recentTransactions.length === 0" class="empty-text">
              Chưa có giao dịch nào được ghi nhận.
            </div>
            <ul *ngIf="recentTransactions.length > 0" class="transaction-list">
              <li *ngFor="let tx of recentTransactions" class="transaction-item">
                <div class="tx-info">
                  <mat-icon [color]="tx.type === 'TOPUP' ? 'primary' : 'warn'">
                    {{ tx.type === 'TOPUP' ? 'arrow_downward' : 'arrow_upward' }}
                  </mat-icon>
                  <div>
                    <div class="tx-ref">{{ tx.transactionRef }}</div>
                    <div class="tx-date">{{ tx.createdAt | date:'dd/MM/yyyy HH:mm' }}</div>
                  </div>
                </div>
                <div class="tx-amount" [ngClass]="tx.type.toLowerCase()">
                  {{ tx.type === 'TOPUP' ? '+' : '-' }}{{ tx.amount | currency:'VND':'symbol':'1.0-0' }}
                </div>
              </li>
            </ul>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-container { display: flex; flex-direction: column; gap: 24px; }
    .loading-spinner { display: flex; justify-content: center; margin: 32px 0; }
    .grid-layout { display: grid; grid-template-columns: 2fr 1fr; gap: 16px; }
    .wallet-card { background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%); color: white; }
    .wallet-card ::ng-deep .mat-mdc-card-title { color: #ffffff !important; }
    .wallet-card ::ng-deep .mat-mdc-card-subtitle { color: #e0e0e0 !important; }
    .wallet-card ::ng-deep .mat-icon { color: #ffffff !important; }
    .wallet-content { padding: 16px 0; }
    .balance-amount { font-size: 2.5rem; font-weight: 700; margin: 8px 0; }
    .status-badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-weight: 600; font-size: 0.8rem; }
    .status-badge.active { background: #4caf50; color: white; }
    .status-badge.frozen { background: #ff9800; color: white; }
    .wallet-actions { display: flex; gap: 12px; }
    .recent-section { margin-top: 16px; }
    .empty-text { padding: 16px; text-align: center; color: #757575; }
    .transaction-list { list-style: none; padding: 0; margin: 0; }
    .transaction-item { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-bottom: 1px solid #eee; }
    .transaction-item:last-child { border-bottom: none; }
    .tx-info { display: flex; align-items: center; gap: 12px; }
    .tx-ref { font-weight: 600; }
    .tx-date { font-size: 0.85rem; color: #757575; }
    .tx-amount { font-weight: 700; font-size: 1.1rem; }
    .tx-amount.topup { color: #2e7d32; }
    .tx-amount.payment { color: #c62828; }
    @media (max-width: 768px) {
      .grid-layout { grid-template-columns: 1fr; }
    }
  `]
})
export class AccountDashboardComponent implements OnInit {
  account: AccountResponse | null = null;
  recentTransactions: TransactionResponse[] = [];
  loading = true;

  constructor(
    private accountService: AccountService,
    private transactionService: TransactionService
  ) {}

  ngOnInit(): void {
    this.loadDashboardData();
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
    this.accountService.getAccountHistory(accountId, 0, 5).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.recentTransactions = res.data.content;
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }
}
