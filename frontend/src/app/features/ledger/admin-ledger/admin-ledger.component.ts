import { Component, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { LedgerService } from '../../../core/services/ledger.service';
import { LedgerEntry, LedgerVerificationResponse } from '../../../core/models/ledger.model';

@Component({
  selector: 'app-admin-ledger',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CurrencyPipe,
    DatePipe,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="console-page">
      <!-- Page Header -->
      <div class="page-header">
        <div class="header-title-group">
          <h2>Double-Entry Ledger Audit</h2>
          <p class="header-subtitle">Verify total DEBIT balance equals total CREDIT balance to audit financial integrity.</p>
        </div>
        <button mat-raised-button class="btn-primary" [disabled]="loadingAudit" (click)="runAudit()">
          <mat-icon class="btn-icon">verified</mat-icon>
          {{ loadingAudit ? 'Auditing...' : 'Run Ledger Audit' }}
        </button>
      </div>

      <!-- Audit Metrics Grid -->
      <div class="metrics-grid" *ngIf="auditResult">
        <!-- Status Card -->
        <div class="metric-card" [class.balanced]="auditResult.balanced" [class.unbalanced]="!auditResult.balanced">
          <div class="metric-header">
            <span class="metric-label">INTEGRITY STATUS</span>
            <mat-icon class="metric-icon">{{ auditResult.balanced ? 'check_circle' : 'error' }}</mat-icon>
          </div>
          <div class="metric-value">{{ auditResult.balanced ? 'BALANCED' : 'UNBALANCED' }}</div>
          <div class="metric-footer">{{ auditResult.message }}</div>
        </div>

        <!-- Total Debit -->
        <div class="metric-card">
          <div class="metric-header">
            <span class="metric-label">TOTAL DEBIT VOLUME</span>
            <mat-icon class="metric-icon blue">trending_up</mat-icon>
          </div>
          <div class="metric-value">{{ auditResult.totalDebit | currency:'VND':'symbol':'1.0-0' }}</div>
          <div class="metric-footer text-muted">Sum of all DEBIT journal entries</div>
        </div>

        <!-- Total Credit -->
        <div class="metric-card">
          <div class="metric-header">
            <span class="metric-label">TOTAL CREDIT VOLUME</span>
            <mat-icon class="metric-icon purple">trending_down</mat-icon>
          </div>
          <div class="metric-value">{{ auditResult.totalCredit | currency:'VND':'symbol':'1.0-0' }}</div>
          <div class="metric-footer text-muted">Sum of all CREDIT journal entries</div>
        </div>
      </div>

      <!-- Account History Lookup Card -->
      <div class="table-card">
        <div class="lookup-bar">
          <div class="lookup-title">
            <mat-icon class="lookup-icon">search</mat-icon>
            <span>Account Journal History Lookup</span>
          </div>

          <div class="lookup-inputs">
            <input
              type="number"
              [(ngModel)]="searchAccountId"
              placeholder="Enter Account ID (e.g. 1)"
              class="lookup-input"
            />
            <button mat-button class="btn-lookup" [disabled]="!searchAccountId || loadingEntries" (click)="lookupAccountEntries()">
              Lookup History
            </button>
          </div>
        </div>

        <div *ngIf="loadingEntries" class="loading-box">
          <mat-spinner diameter="40"></mat-spinner>
        </div>

        <div *ngIf="!loadingEntries" class="custom-table-wrapper">
          <table class="paygate-table">
            <thead>
              <tr>
                <th>ENTRY ID</th>
                <th>TRANSACTION ID</th>
                <th>ENTRY TYPE</th>
                <th>AMOUNT</th>
                <th>BALANCE AFTER</th>
                <th>TIMESTAMP</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let entry of entries">
                <td class="font-mono">#{{ entry.id }}</td>
                <td class="font-mono text-indigo">TXN-{{ entry.transactionId }}</td>
                <td>
                  <span [class.debit]="entry.entryType === 'DEBIT'" [class.credit]="entry.entryType === 'CREDIT'" class="type-pill">
                    {{ entry.entryType }}
                  </span>
                </td>
                <td class="font-bold">{{ entry.amount | currency:'VND':'symbol':'1.0-0' }}</td>
                <td>{{ entry.balanceAfter | currency:'VND':'symbol':'1.0-0' }}</td>
                <td class="text-muted text-xs">{{ entry.createdAt | date:'medium' }}</td>
              </tr>

              <tr *ngIf="entries.length === 0">
                <td colspan="6" class="text-center py-6 text-muted">
                  Enter an Account ID above and click "Lookup History" to view journal entries.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .console-page { display: flex; flex-direction: column; gap: 20px; padding: 4px; }
    
    .page-header {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 20px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
    }
    .header-title-group h2 { margin: 0; font-size: 1.4rem; font-weight: 800; color: #0f172a; }
    .header-subtitle { margin: 4px 0 0 0; color: #64748b; font-size: 0.85rem; }

    .btn-primary {
      background-color: #059669;
      color: #ffffff;
      border-radius: 8px;
      font-weight: 600;
      font-size: 0.85rem;
      height: 38px;
      padding: 0 16px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .btn-primary:hover { background-color: #047857; }
    .btn-icon { font-size: 18px; width: 18px; height: 18px; }

    /* Metrics Grid */
    .metrics-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
    .metric-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 1px 2px rgba(0,0,0,0.03);
    }
    .metric-card.balanced { border-color: #a7f3d0; background: #f0fdf4; }
    .metric-card.balanced .metric-value { color: #15803d; }
    .metric-card.balanced .metric-icon { color: #16a34a; }
    
    .metric-card.unbalanced { border-color: #fecaca; background: #fef2f2; }
    .metric-card.unbalanced .metric-value { color: #b91c1c; }
    .metric-card.unbalanced .metric-icon { color: #dc2626; }

    .metric-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .metric-label { font-size: 0.72rem; font-weight: 700; color: #64748b; letter-spacing: 0.04em; }
    .metric-icon { font-size: 20px; width: 20px; height: 20px; }
    .metric-icon.blue { color: #0284c7; }
    .metric-icon.purple { color: #8b5cf6; }
    .metric-value { font-size: 1.45rem; font-weight: 800; color: #0f172a; }
    .metric-footer { font-size: 0.75rem; margin-top: 6px; }

    /* Lookup Table Card */
    .table-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.03); overflow: hidden; }
    .lookup-bar { padding: 16px 20px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; }
    .lookup-title { display: flex; align-items: center; gap: 8px; font-size: 0.95rem; font-weight: 700; color: #0f172a; }
    .lookup-icon { color: #4f46e5; font-size: 20px; width: 20px; height: 20px; }
    
    .lookup-inputs { display: flex; gap: 8px; }
    .lookup-input { border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 12px; font-size: 0.85rem; outline: none; width: 220px; }
    .lookup-input:focus { border-color: #4f46e5; }
    .btn-lookup { background: #4f46e5; color: #ffffff; font-weight: 600; font-size: 0.825rem; border-radius: 6px; height: 34px; }
    .btn-lookup:hover { background: #4338ca; }

    .loading-box { display: flex; justify-content: center; padding: 40px; }

    .custom-table-wrapper { overflow-x: auto; }
    .paygate-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 0.875rem; }
    .paygate-table th { padding: 14px 18px; font-size: 0.72rem; font-weight: 700; color: #64748b; border-bottom: 1px solid #e2e8f0; background: #f8fafc; letter-spacing: 0.04em; }
    .paygate-table td { padding: 16px 18px; border-bottom: 1px solid #f1f5f9; color: #1e293b; }
    
    .type-pill { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 0.72rem; font-weight: 700; }
    .type-pill.debit { background-color: #e0f2fe; color: #0369a1; }
    .type-pill.credit { background-color: #dcfce7; color: #15803d; }

    .font-mono { font-family: monospace; font-size: 0.825rem; font-weight: 700; }
    .text-indigo { color: #4338ca; }
    .font-bold { font-weight: 700; color: #0f172a; }
    .text-muted { color: #64748b; }
    .text-xs { font-size: 0.75rem; }
    .text-center { text-align: center; }
    .py-6 { padding-top: 24px; padding-bottom: 24px; }
  `]
})
export class AdminLedgerComponent implements OnInit {
  auditResult: LedgerVerificationResponse | null = null;
  loadingAudit = false;

  searchAccountId: number | null = null;
  entries: LedgerEntry[] = [];
  loadingEntries = false;

  constructor(private ledgerService: LedgerService) {}

  ngOnInit(): void {
    this.runAudit();
  }

  runAudit(): void {
    this.loadingAudit = true;
    this.ledgerService.verifyLedger().subscribe({
      next: (res) => {
        this.loadingAudit = false;
        if (res.success && res.data) {
          this.auditResult = res.data;
        }
      },
      error: () => {
        this.loadingAudit = false;
      }
    });
  }

  lookupAccountEntries(): void {
    if (!this.searchAccountId) return;
    this.loadingEntries = true;
    this.ledgerService.getEntriesByAccount(this.searchAccountId).subscribe({
      next: (res) => {
        this.loadingEntries = false;
        if (res.success && res.data) {
          this.entries = res.data;
        }
      },
      error: () => {
        this.loadingEntries = false;
      }
    });
  }
}
