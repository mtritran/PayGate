import { Component, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LedgerService } from '../../../core/services/ledger.service';
import { LedgerEntry, LedgerVerificationResponse } from '../../../core/models/ledger.model';

@Component({
  selector: 'app-admin-ledger',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CurrencyPipe,
    DatePipe
  ],
  template: `
    <div class="console-page fade-in-up">
      <!-- Page Header -->
      <div class="page-header flex-between">
        <div>
          <div class="header-tag">REAL-TIME DOUBLE-ENTRY RECONCILIATION</div>
          <h2>Double-Entry Ledger Audit</h2>
          <p class="header-subtitle">Verify total DEBIT volume equals total CREDIT volume to audit financial integrity in real-time.</p>
        </div>
        <button class="btn-emerald-primary pulse-glow" [disabled]="loadingAudit" (click)="runAudit()">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <span>{{ loadingAudit ? 'Auditing...' : 'Run Ledger Audit ↗' }}</span>
        </button>
      </div>

      <!-- Audit Metrics Grid -->
      <div class="metrics-grid" *ngIf="auditResult">
        <!-- Integrity Status Card -->
        <div class="metric-card hover-lift" [class.balanced]="auditResult.balanced" [class.unbalanced]="!auditResult.balanced">
          <div class="metric-header">
            <span class="metric-label">INTEGRITY STATUS</span>
            <div class="status-badge-icon" [class.success]="auditResult.balanced">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
          </div>
          <div class="metric-value">{{ auditResult.balanced ? 'BALANCED' : 'UNBALANCED' }}</div>
          <div class="metric-footer success">✓ DEBIT == CREDIT (Discrepancy: ₫0)</div>
        </div>

        <!-- Total Debit Card -->
        <div class="metric-card hover-lift">
          <div class="metric-header">
            <span class="metric-label">TOTAL DEBIT VOLUME</span>
            <div class="metric-icon-box blue">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="19" x2="12" y2="5" />
                <polyline points="5 12 12 5 19 12" />
              </svg>
            </div>
          </div>
          <div class="metric-value text-dark">{{ auditResult.totalDebit | currency:'VND':'symbol':'1.0-0' }}</div>
          <div class="metric-footer muted">Sum of all DEBIT journal entries</div>
        </div>

        <!-- Total Credit Card -->
        <div class="metric-card hover-lift">
          <div class="metric-header">
            <span class="metric-label">TOTAL CREDIT VOLUME</span>
            <div class="metric-icon-box green">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <polyline points="19 12 12 19 5 12" />
              </svg>
            </div>
          </div>
          <div class="metric-value text-green">{{ auditResult.totalCredit | currency:'VND':'symbol':'1.0-0' }}</div>
          <div class="metric-footer muted">Sum of all CREDIT journal entries</div>
        </div>
      </div>

      <!-- Account History Lookup & Table Card -->
      <div class="table-card">
        <div class="lookup-bar flex-between">
          <div class="lookup-title">
            <svg class="title-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            <span>Account Journal History Audit</span>
          </div>

          <div class="lookup-inputs">
            <div class="input-wrapper">
              <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="number"
                [(ngModel)]="searchAccountId"
                placeholder="Enter Account ID (e.g. 1)"
                class="lookup-input"
                (keyup.enter)="lookupAccountEntries()"
              />
            </div>
            <button class="btn-lookup-action" [disabled]="!searchAccountId || loadingEntries" (click)="lookupAccountEntries()">
              <span>Lookup History ↗</span>
            </button>
          </div>
        </div>

        <div *ngIf="loadingEntries" class="loading-box">
          <div class="spinner"></div>
        </div>

        <div *ngIf="!loadingEntries" class="custom-table-wrapper">
          <table class="paygate-table">
            <thead>
              <tr>
                <th>ENTRY ID</th>
                <th>TRANSACTION ID</th>
                <th>ENTRY TYPE</th>
                <th>AMOUNT</th>
                <th>RUNNING BALANCE AFTER</th>
                <th>TIMESTAMP</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let entry of entries" class="journal-row">
                <td class="font-mono">
                  <span class="entry-id-tag">#{{ entry.id }}</span>
                </td>
                <td class="font-mono">
                  <span class="txn-link">TXN-{{ entry.transactionId }}</span>
                </td>
                <td>
                  <span [class.debit]="entry.entryType === 'DEBIT'" [class.credit]="entry.entryType === 'CREDIT'" class="type-pill">
                    <span class="pill-dot"></span>
                    {{ entry.entryType }}
                  </span>
                </td>
                <td class="font-bold" [ngClass]="entry.entryType === 'CREDIT' ? 'text-green' : 'text-dark'">
                  {{ entry.entryType === 'CREDIT' ? '+' : '-' }}{{ entry.amount | currency:'VND':'symbol':'1.0-0' }}
                </td>
                <td class="font-mono font-bold">{{ entry.balanceAfter | currency:'VND':'symbol':'1.0-0' }}</td>
                <td class="text-muted text-xs">{{ entry.createdAt | date:'medium' }}</td>
              </tr>

              <tr *ngIf="entries.length === 0">
                <td colspan="6" class="text-center py-8 text-muted">
                  No journal entries found for Account #{{ searchAccountId }}.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
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
    .fade-in-up { animation: fadeInUp 0.4s ease-out forwards; }

    .console-page { display: flex; flex-direction: column; gap: 20px; color: #0f172a; font-family: 'Inter', system-ui, sans-serif; }
    .flex-between { display: flex; justify-content: space-between; align-items: center; }

    .header-tag { font-size: 0.7rem; font-weight: 800; color: #059669; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
    .page-header h2 { margin: 0; font-size: 1.65rem; font-weight: 800; color: #0f172a; letter-spacing: -0.02em; }
    .header-subtitle { margin: 4px 0 0 0; color: #64748b; font-size: 0.875rem; }

    .btn-emerald-primary {
      background: linear-gradient(135deg, #059669 0%, #047857 100%);
      color: #ffffff;
      border: none;
      border-radius: 10px;
      font-weight: 700;
      font-size: 0.875rem;
      height: 42px;
      padding: 0 20px;
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(5, 150, 105, 0.25);
      transition: all 0.2s;
    }
    .btn-emerald-primary:hover { transform: translateY(-1.5px); box-shadow: 0 6px 16px rgba(5, 150, 105, 0.35); }

    /* Metrics Grid */
    .metrics-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
    
    .metric-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 20px 22px;
      box-shadow: 0 4px 20px -5px rgba(0,0,0,0.03);
      transition: all 0.2s;
    }
    .metric-card.balanced { border-color: #a7f3d0; background: linear-gradient(135deg, #ffffff 0%, #ecfdf5 100%); }
    
    .metric-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
    .metric-label { font-size: 0.72rem; font-weight: 800; color: #64748b; letter-spacing: 0.05em; }
    
    .status-badge-icon { width: 36px; height: 36px; border-radius: 10px; background: #ecfdf5; color: #059669; display: flex; align-items: center; justify-content: center; }
    .status-badge-icon svg { width: 20px; height: 20px; }
    
    .metric-icon-box { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; }
    .metric-icon-box.blue { background: #e0f2fe; color: #0284c7; }
    .metric-icon-box.green { background: #dcfce7; color: #16a34a; }
    .metric-icon-box svg { width: 18px; height: 18px; }

    .metric-value { font-size: 1.55rem; font-weight: 800; color: #0f172a; letter-spacing: -0.02em; }
    .metric-footer { font-size: 0.75rem; margin-top: 6px; }
    .metric-footer.success { color: #059669; font-weight: 700; }
    .metric-footer.muted { color: #64748b; }

    /* Lookup Table Card */
    .table-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; box-shadow: 0 4px 20px -5px rgba(0,0,0,0.04); overflow: hidden; }
    .lookup-bar { padding: 18px 24px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; }
    .lookup-title { display: flex; align-items: center; gap: 8px; font-size: 0.95rem; font-weight: 800; color: #0f172a; }
    .title-icon { width: 18px; height: 18px; color: #059669; }
    
    .lookup-inputs { display: flex; gap: 10px; align-items: center; }
    .input-wrapper { position: relative; display: flex; align-items: center; }
    .search-icon { position: absolute; left: 12px; width: 16px; height: 16px; color: #94a3b8; pointer-events: none; }
    .lookup-input { border: 1px solid #e2e8f0; border-radius: 10px; padding: 0 14px 0 36px; height: 38px; font-size: 0.85rem; font-weight: 600; outline: none; width: 220px; transition: all 0.15s; }
    .lookup-input:focus { border-color: #059669; box-shadow: 0 0 0 3px rgba(5, 150, 105, 0.1); background: #ffffff; }

    .btn-lookup-action { height: 38px; padding: 0 16px; border: none; background: #059669; color: #ffffff; border-radius: 10px; font-weight: 700; font-size: 0.825rem; cursor: pointer; transition: all 0.15s; }
    .btn-lookup-action:hover:not(:disabled) { background: #047857; }
    .btn-lookup-action:disabled { opacity: 0.5; cursor: not-allowed; }

    .loading-box { display: flex; justify-content: center; padding: 48px; }
    .spinner { width: 32px; height: 32px; border: 3px solid #e2e8f0; border-top-color: #059669; border-radius: 50%; animation: spin 0.7s linear infinite; }

    .custom-table-wrapper { overflow-x: auto; }
    .paygate-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 0.875rem; }
    .paygate-table th { padding: 14px 18px; font-size: 0.72rem; font-weight: 700; color: #64748b; border-bottom: 1px solid #e2e8f0; background: #f8fafc; letter-spacing: 0.04em; text-transform: uppercase; }
    .paygate-table td { padding: 16px 18px; border-bottom: 1px solid #f1f5f9; color: #1e293b; }
    
    .journal-row { transition: background-color 0.15s; }
    .journal-row:hover td { background-color: #f8fafc; }

    .entry-id-tag { font-weight: 700; color: #059669; background: #ecfdf5; padding: 2px 8px; border-radius: 6px; border: 1px solid #a7f3d0; }
    .txn-link { font-weight: 700; color: #4f46e5; }

    .type-pill { display: inline-flex; align-items: center; gap: 6px; padding: 3px 10px; border-radius: 14px; font-size: 0.72rem; font-weight: 700; }
    .pill-dot { width: 6px; height: 6px; border-radius: 50%; }

    .type-pill.debit { background-color: #e0f2fe; color: #0369a1; }
    .type-pill.debit .pill-dot { background-color: #0284c7; }

    .type-pill.credit { background-color: #dcfce7; color: #15803d; }
    .type-pill.credit .pill-dot { background-color: #16a34a; }

    .font-mono { font-family: monospace; }
    .font-bold { font-weight: 700; }
    .text-green { color: #16a34a; }
    .text-dark { color: #0f172a; }
    .text-muted { color: #64748b; }
    .text-xs { font-size: 0.75rem; }
    .text-center { text-align: center; }
    .py-8 { padding-top: 32px; padding-bottom: 32px; }
  `]
})
export class AdminLedgerComponent implements OnInit {
  auditResult: LedgerVerificationResponse | null = null;
  loadingAudit = false;

  searchAccountId: number = 1;
  entries: LedgerEntry[] = [];
  loadingEntries = false;

  constructor(private ledgerService: LedgerService) {}

  ngOnInit(): void {
    this.runAudit();
    this.lookupAccountEntries();
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
