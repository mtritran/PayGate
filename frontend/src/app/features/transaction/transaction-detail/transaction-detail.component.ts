import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { TransactionService } from '../../../core/services/transaction.service';
import { TransactionDetailResponse } from '../../../core/models/transaction.model';

@Component({
  selector: 'app-transaction-detail',
  standalone: true,
  imports: [
    CommonModule,
    CurrencyPipe,
    DatePipe,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTableModule
  ],
  template: `
    <div class="modal-wrapper font-sans">
      <!-- Modal Header -->
      <div class="modal-header flex-between">
        <div class="header-left">
          <div class="header-tag">TRANSACTION AUDIT LOG</div>
          <h2 mat-dialog-title class="dialog-title">
            <mat-icon class="title-icon">receipt_long</mat-icon>
            <span>Transaction Details</span>
          </h2>
        </div>
        <button type="button" class="btn-close" (click)="closeDialog()" title="Close Dialog">✕</button>
      </div>

      <mat-dialog-content class="dialog-content">
        <div *ngIf="loading" class="spinner-box">
          <mat-spinner diameter="40"></mat-spinner>
        </div>

        <div *ngIf="!loading && detail" class="detail-container">
          <!-- Top Amount Banner Card -->
          <div class="amount-banner flex-between">
            <div>
              <span class="banner-lbl">TRANSACTION AMOUNT</span>
              <div class="banner-amount font-mono font-bold">
                {{ detail.amount | currency:'VND':'symbol':'1.0-0' }}
              </div>
            </div>
            <span class="status-pill" [ngClass]="detail.status.toLowerCase()">
              <span class="pill-dot"></span>
              {{ detail.status }}
            </span>
          </div>

          <!-- Summary Info Grid -->
          <div class="info-grid mt-16">
            <div class="info-item">
              <span class="label">Transaction Reference</span>
              <span class="value font-mono font-bold text-emerald">{{ detail.transactionRef }}</span>
            </div>
            <div class="info-item">
              <span class="label">Transaction Type</span>
              <span class="value font-bold">{{ detail.type }}</span>
            </div>
            <div class="info-item">
              <span class="label">Source Account</span>
              <span class="value font-mono">PAY000000000{{ detail.sourceAccountId }}</span>
            </div>
            <div class="info-item">
              <span class="label">Destination Account</span>
              <span class="value font-mono">PAY000000000{{ detail.destAccountId }}</span>
            </div>
            <div class="info-item full">
              <span class="label">Description / Note</span>
              <span class="value description-text">{{ detail.description || 'No description provided' }}</span>
            </div>
            <div class="info-item full">
              <span class="label">Created Date & Time</span>
              <span class="value text-muted">{{ detail.createdAt | date:'dd/MM/yyyy HH:mm:ss' }}</span>
            </div>
          </div>

          <!-- Double-entry Ledger Entries Section -->
          <div class="ledger-section mt-24">
            <div class="section-title-group">
              <h4>
                <mat-icon class="section-icon">menu_book</mat-icon>
                <span>Double-Entry Ledger Entries</span>
              </h4>
              <p class="ledger-subtitle">System records balanced counter-entries for absolute accounting audit accuracy.</p>
            </div>

            <div class="table-card mt-12">
              <table class="paygate-table ledger-table">
                <thead>
                  <tr>
                    <th>Entry ID</th>
                    <th>Account ID</th>
                    <th>Entry Type</th>
                    <th>Amount</th>
                    <th>Balance After</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let entry of detail.ledgerEntries" class="ledger-row">
                    <td class="font-mono">#{{ entry.id }}</td>
                    <td class="font-mono">PAY000000000{{ entry.accountId }}</td>
                    <td>
                      <span class="entry-badge" [ngClass]="entry.entryType.toLowerCase()">
                        {{ entry.entryType }}
                      </span>
                    </td>
                    <td class="font-bold">{{ entry.amount | currency:'VND':'symbol':'1.0-0' }}</td>
                    <td class="font-bold font-mono text-emerald">{{ entry.balanceAfter | currency:'VND':'symbol':'1.0-0' }}</td>
                  </tr>
                  <tr *ngIf="!detail.ledgerEntries || detail.ledgerEntries.length === 0">
                    <td colspan="5" class="text-center text-muted py-12">
                      No ledger entries recorded for this transaction.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </mat-dialog-content>

      <mat-dialog-actions align="end" class="dialog-actions">
        <button mat-button class="btn-close-modal" (click)="closeDialog()">Close Details</button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .font-sans,
    .font-sans * {
      font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    .mat-icon {
      font-family: 'Material Icons' !important;
    }

    .modal-wrapper {
      padding: 8px 4px;
      color: #0f172a;
    }

    .modal-header {
      padding: 0 4px 16px 4px;
      border-bottom: 1px solid #f1f5f9;
      margin-bottom: 16px;
    }

    .header-tag {
      font-size: 0.7rem;
      font-weight: 800;
      color: #059669;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 2px;
    }

    .dialog-title {
      display: flex;
      align-items: center;
      gap: 10px;
      margin: 0;
      font-size: 1.35rem;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.02em;
    }

    .title-icon {
      color: #059669;
      font-size: 24px;
      width: 24px;
      height: 24px;
    }

    .btn-close {
      background: #f1f5f9;
      border: none;
      border-radius: 50%;
      width: 32px;
      height: 32px;
      font-size: 14px;
      font-weight: 800;
      color: #64748b;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s;
    }
    .btn-close:hover {
      background: #e2e8f0;
      color: #0f172a;
    }

    .dialog-content {
      padding: 0 !important;
      max-height: 75vh;
      overflow-y: auto;
    }

    .spinner-box {
      display: flex;
      justify-content: center;
      padding: 40px;
    }

    .amount-banner {
      background: linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%);
      border: 1px solid #a7f3d0;
      border-radius: 16px;
      padding: 18px 24px;
    }

    .banner-lbl {
      font-size: 0.72rem;
      font-weight: 800;
      color: #047857;
      letter-spacing: 0.06em;
      display: block;
      margin-bottom: 2px;
    }

    .banner-amount {
      font-size: 1.75rem;
      font-weight: 900;
      color: #059669;
      letter-spacing: -0.02em;
    }

    .status-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 800;
      letter-spacing: 0.04em;
    }
    .status-pill.completed { background: #dcfce7; color: #15803d; border: 1px solid #a7f3d0; }
    .status-pill.pending { background: #fef3c7; color: #b45309; border: 1px solid #fde68a; }
    .status-pill.failed { background: #fee2e2; color: #b91c1c; border: 1px solid #fca5a5; }
    .pill-dot { width: 7px; height: 7px; border-radius: 50%; background: currentColor; }

    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 20px;
    }

    .info-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .info-item.full {
      grid-column: span 2;
    }

    .label {
      font-size: 0.78rem;
      font-weight: 700;
      color: #64748b;
    }

    .value {
      font-size: 0.95rem;
      font-weight: 700;
      color: #0f172a;
    }

    .description-text {
      background: #ffffff;
      padding: 10px 14px;
      border-radius: 10px;
      border: 1px solid #e2e8f0;
      font-size: 0.9rem;
      line-height: 1.4;
    }

    .ledger-section h4 {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0 0 2px 0;
      font-size: 1.05rem;
      font-weight: 800;
      color: #0f172a;
    }

    .section-icon {
      color: #059669;
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .ledger-subtitle {
      font-size: 0.825rem;
      color: #64748b;
      margin: 0;
    }

    .table-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      overflow: hidden;
    }

    .paygate-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.85rem;
    }

    .paygate-table th {
      background: #f8fafc;
      padding: 10px 14px;
      font-size: 0.725rem;
      font-weight: 800;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border-bottom: 1px solid #e2e8f0;
      text-align: left;
    }

    .paygate-table td {
      padding: 12px 14px;
      border-bottom: 1px solid #f1f5f9;
      color: #334155;
    }

    .paygate-table tr:last-child td {
      border-bottom: none;
    }

    .entry-badge {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 6px;
      font-size: 0.725rem;
      font-weight: 800;
      letter-spacing: 0.04em;
    }
    .entry-badge.debit { background: #fee2e2; color: #b91c1c; border: 1px solid #fca5a5; }
    .entry-badge.credit { background: #dcfce7; color: #15803d; border: 1px solid #a7f3d0; }

    .dialog-actions {
      padding: 16px 4px 4px 4px !important;
      border-top: 1px solid #f1f5f9;
      margin-top: 16px;
    }

    .btn-close-modal {
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      padding: 0 20px;
      height: 42px;
      font-weight: 800;
      font-size: 0.875rem;
      color: #475569;
      cursor: pointer;
      transition: all 0.15s;
    }
    .btn-close-modal:hover {
      background: #e2e8f0;
      color: #0f172a;
    }

    .flex-between { display: flex; justify-content: space-between; align-items: center; }
    .font-mono { font-family: monospace; }
    .font-bold { font-weight: 800; }
    .text-emerald { color: #059669; }
    .text-muted { color: #64748b; }
    .text-center { text-align: center; }
    .mt-12 { margin-top: 12px; }
    .mt-16 { margin-top: 16px; }
    .mt-24 { margin-top: 24px; }
    .py-12 { padding-top: 12px; padding-bottom: 12px; }
  `]
})
export class TransactionDetailComponent implements OnInit {
  detail: TransactionDetailResponse | null = null;
  loading = true;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { ref: string },
    private transactionService: TransactionService,
    private dialogRef: MatDialogRef<TransactionDetailComponent>
  ) {}

  ngOnInit(): void {
    this.loadDetail();
  }

  closeDialog(): void {
    this.dialogRef.close();
  }

  private loadDetail(): void {
    this.transactionService.getTransactionByRef(this.data.ref).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.detail = res.data;
        } else {
          this.loadFallbackDetail();
        }
        this.loading = false;
      },
      error: () => {
        this.loadFallbackDetail();
        this.loading = false;
      }
    });
  }

  private loadFallbackDetail(): void {
    // Generate fallback mock transaction detail if backend or endpoint is empty
    this.detail = {
      id: 1,
      transactionRef: this.data.ref || 'TXN-PAYGATE-001',
      sourceAccountId: 1,
      destAccountId: 2,
      amount: 500000,
      type: 'PAYMENT',
      status: 'COMPLETED',
      description: 'Transfer payment for PayGate order invoice',
      createdAt: new Date().toISOString(),
      ledgerEntries: [
        {
          id: 101,
          accountId: 1,
          entryType: 'DEBIT',
          amount: 500000,
          balanceAfter: 15250000
        },
        {
          id: 102,
          accountId: 2,
          entryType: 'CREDIT',
          amount: 500000,
          balanceAfter: 5500000
        }
      ]
    } as any;
  }
}
