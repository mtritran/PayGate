import { Component, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AccountService } from '../../../core/services/account.service';
import { AccountResponse } from '../../../core/models/account.model';
import { TransactionResponse } from '../../../core/models/transaction.model';

@Component({
  selector: 'app-my-account',
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
    <div class="my-account-page">
      <!-- Header Group -->
      <div class="page-header">
        <h2>My Account</h2>
        <p class="subtitle">Your PayGate wallet balance and history.</p>
      </div>

      <div *ngIf="loading" class="spinner-box">
        <mat-spinner diameter="40"></mat-spinner>
      </div>

      <div *ngIf="!loading">
        <!-- Top Row Grid: Wallet Card & Quick Actions -->
        <div class="top-account-grid">
          <!-- Main Dark Emerald Wallet Card -->
          <div class="emerald-account-card">
            <div class="card-upper flex-between">
              <div>
                <div class="field-label">AVAILABLE BALANCE</div>
                <div class="balance-large">{{ (account?.balance || 0) | currency:'VND':'symbol':'1.0-0' }}</div>
              </div>
              <div class="wallet-icon-box">
                <mat-icon>account_balance_wallet</mat-icon>
              </div>
            </div>

            <div class="card-mid mt-16">
              <div class="field-label">ACCOUNT NUMBER</div>
              <div class="account-number-row">
                <span class="acc-num-text">{{ account?.accountNumber || 'PAY0000000001' }}</span>
                <mat-icon class="copy-icon" (click)="copyAccountNumber()" title="Copy Account Number">content_copy</mat-icon>
              </div>
            </div>

            <div class="card-bottom-meta grid-3 mt-24">
              <div>
                <div class="field-label">CURRENCY</div>
                <div class="meta-val">{{ account?.currency || 'VND' }}</div>
              </div>
              <div>
                <div class="field-label">STATUS</div>
                <span class="status-pill active">{{ account?.status || 'ACTIVE' }}</span>
              </div>
              <div>
                <div class="field-label">OWNER</div>
                <div class="meta-val">{{ account?.ownerType || 'USER' }}</div>
              </div>
            </div>
          </div>

          <!-- Quick Actions Box -->
          <div class="quick-actions-card">
            <div class="card-title">Quick Actions</div>
            <div class="actions-list">
              <a mat-raised-button class="btn-action-solid" routerLink="/transactions/pay">Send payment</a>
              <a mat-stroked-button class="btn-action-outline" routerLink="/accounts/topup">Top up wallet</a>
              <a mat-button class="btn-action-text" routerLink="/transactions/history">Full history</a>
            </div>
          </div>
        </div>

        <!-- Bottom Card: Account Activity -->
        <div class="content-card activity-card mt-24">
          <div class="card-title mb-16">Account Activity</div>

          <div class="custom-table-wrapper">
            <table class="paygate-table">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Type</th>
                  <th>Direction</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let tx of transactions">
                  <td class="font-mono">{{ tx.transactionRef }}</td>
                  <td class="font-medium">{{ tx.type }}</td>
                  <td class="font-mono text-muted">
                    <span *ngIf="tx.type === 'TOPUP'">← PAY0000000000</span>
                    <span *ngIf="tx.type === 'PAYMENT'">→ PAY000000000{{ tx.destAccountId }}</span>
                    <span *ngIf="tx.type === 'REFUND'">← PAY000000000{{ tx.sourceAccountId }}</span>
                  </td>
                  <td class="font-bold" [ngClass]="tx.type === 'TOPUP' || tx.type === 'REFUND' ? 'text-green' : 'text-red'">
                    {{ tx.type === 'TOPUP' || tx.type === 'REFUND' ? '+' : '-' }}{{ tx.amount | currency:'VND':'symbol':'1.0-0' }}
                  </td>
                  <td>
                    <span class="status-pill" [ngClass]="tx.status.toLowerCase()">
                      {{ tx.status }}
                    </span>
                  </td>
                  <td class="text-muted">{{ tx.createdAt | date:'dd MMM YYYY, HH:mm' }}</td>
                </tr>
                <tr *ngIf="transactions.length === 0">
                  <td colspan="6" class="text-center py-4 text-muted">No account activity recorded yet.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .my-account-page { display: flex; flex-direction: column; gap: 20px; color: #0f172a; }
    .page-header h2 { font-size: 1.5rem; font-weight: 700; margin: 0 0 4px 0; }
    .subtitle { font-size: 0.875rem; color: #64748b; margin: 0; }
    .spinner-box { display: flex; justify-content: center; padding: 48px; }

    .top-account-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 20px; }

    /* Dark Emerald Card (Matches Image 2) */
    .emerald-account-card { background: linear-gradient(135deg, #047857 0%, #064e3b 100%); color: #ffffff; border-radius: 12px; padding: 24px; box-shadow: 0 4px 12px rgba(4, 120, 87, 0.15); }
    .flex-between { display: flex; justify-content: space-between; align-items: flex-start; }
    .field-label { font-size: 0.68rem; font-weight: 700; letter-spacing: 0.05em; color: #a7f3d0; opacity: 0.9; text-transform: uppercase; }
    .balance-large { font-size: 2.2rem; font-weight: 800; margin-top: 4px; color: #ffffff; }
    .wallet-icon-box mat-icon { font-size: 28px; width: 28px; height: 28px; color: #a7f3d0; }

    .mt-16 { margin-top: 16px; }
    .mt-24 { margin-top: 24px; }
    .mb-16 { margin-bottom: 16px; }

    .account-number-row { display: flex; align-items: center; gap: 10px; margin-top: 4px; }
    .acc-num-text { font-size: 1.1rem; font-weight: 700; font-family: monospace; color: #ffffff; letter-spacing: 0.03em; }
    .copy-icon { font-size: 18px; width: 18px; height: 18px; color: #a7f3d0; cursor: pointer; }
    .copy-icon:hover { color: #ffffff; }

    .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
    .meta-val { font-size: 0.9rem; font-weight: 700; color: #ffffff; margin-top: 4px; }

    /* Quick Actions Card */
    .quick-actions-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; box-shadow: 0 1px 2px rgba(0,0,0,0.03); display: flex; flex-direction: column; }
    .card-title { font-size: 0.95rem; font-weight: 700; color: #0f172a; }
    .actions-list { display: flex; flex-direction: column; gap: 10px; margin-top: 20px; }
    
    .btn-action-solid { background-color: #059669 !important; color: #ffffff !important; border-radius: 8px; font-weight: 600; font-size: 0.875rem; height: 40px; }
    .btn-action-outline { border: 1px solid #e2e8f0; color: #334155; border-radius: 8px; font-weight: 600; font-size: 0.875rem; height: 40px; background-color: #ffffff; }
    .btn-action-text { color: #334155; font-weight: 600; font-size: 0.875rem; }

    /* Content Table Card */
    .content-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; box-shadow: 0 1px 2px rgba(0,0,0,0.03); }
    .custom-table-wrapper { overflow-x: auto; }
    .paygate-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 0.875rem; }
    .paygate-table th { padding: 12px 14px; font-size: 0.75rem; font-weight: 600; color: #64748b; border-bottom: 1px solid #e2e8f0; }
    .paygate-table td { padding: 14px; border-bottom: 1px solid #f1f5f9; color: #1e293b; }
    .paygate-table tr:last-child td { border-bottom: none; }

    .font-mono { font-family: monospace; font-size: 0.825rem; font-weight: 600; color: #334155; }
    .font-medium { font-weight: 600; }
    .font-bold { font-weight: 700; }
    .text-green { color: #16a34a; }
    .text-red { color: #dc2626; }
    .text-muted { color: #64748b; }
    .text-center { text-align: center; }
    .py-4 { padding-top: 16px; padding-bottom: 16px; }

    .status-pill { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 0.72rem; font-weight: 700; text-transform: uppercase; }
    .status-pill.active, .status-pill.completed { background-color: #dcfce7; color: #15803d; }
    .status-pill.failed { background-color: #fee2e2; color: #b91c1c; }
    .status-pill.processing { background-color: #e0f2fe; color: #0369a1; }
    .status-pill.pending { background-color: #fef3c7; color: #b45309; }

    @media (max-width: 900px) {
      .top-account-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class MyAccountComponent implements OnInit {
  account: AccountResponse | null = null;
  transactions: TransactionResponse[] = [];
  loading = true;

  constructor(
    private accountService: AccountService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadAccountData();
  }

  copyAccountNumber(): void {
    const num = this.account?.accountNumber || 'PAY0000000001';
    navigator.clipboard.writeText(num);
    this.snackBar.open('Copied Account Number to clipboard!', 'Close', { duration: 2000 });
  }

  private loadAccountData(): void {
    this.loading = true;
    this.accountService.getAccountMe().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.account = res.data;
          this.loadHistory(res.data.id);
        } else {
          this.loading = false;
        }
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  private loadHistory(accountId: number): void {
    this.accountService.getAccountHistory(accountId, 0, 10).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.transactions = res.data.content;
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }
}
