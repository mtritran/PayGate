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
    <h2 mat-dialog-title class="dialog-title">
      <mat-icon color="primary">receipt_long</mat-icon> Transaction Details
    </h2>

    <mat-dialog-content class="dialog-content">
      <div *ngIf="loading" class="spinner-box">
        <mat-spinner diameter="40"></mat-spinner>
      </div>

      <div *ngIf="!loading && detail" class="detail-container">
        <!-- Summary Info Grid -->
        <div class="info-grid">
          <div class="info-item">
            <span class="label">Transaction Ref:</span>
            <span class="value font-mono">{{ detail.transactionRef }}</span>
          </div>
          <div class="info-item">
            <span class="label">Transaction Type:</span>
            <span class="value">{{ detail.type }}</span>
          </div>
          <div class="info-item">
            <span class="label">Amount:</span>
            <span class="value amount-highlight">{{ detail.amount | currency:'VND':'symbol':'1.0-0' }}</span>
          </div>
          <div class="info-item">
            <span class="label">Status:</span>
            <span class="status-badge" [ngClass]="detail.status.toLowerCase()">{{ detail.status }}</span>
          </div>
          <div class="info-item">
            <span class="label">Source Account:</span>
            <span class="value">#{{ detail.sourceAccountId }}</span>
          </div>
          <div class="info-item">
            <span class="label">Destination Account:</span>
            <span class="value">#{{ detail.destAccountId }}</span>
          </div>
          <div class="info-item full">
            <span class="label">Description / Note:</span>
            <span class="value">{{ detail.description || 'None' }}</span>
          </div>
          <div class="info-item full">
            <span class="label">Created Time:</span>
            <span class="value">{{ detail.createdAt | date:'dd/MM/yyyy HH:mm:ss' }}</span>
          </div>
        </div>

        <!-- Double-entry Ledger Entries Section -->
        <div class="ledger-section">
          <h4><mat-icon>menu_book</mat-icon> Double-Entry Ledger Entries</h4>
          <p class="ledger-subtitle">System records balanced double-entry accounting records for each transaction:</p>

          <table mat-table [dataSource]="detail.ledgerEntries" class="ledger-table">
            <ng-container matColumnDef="id">
              <th mat-header-cell *matHeaderCellDef> Entry ID </th>
              <td mat-cell *matCellDef="let entry"> #{{ entry.id }} </td>
            </ng-container>

            <ng-container matColumnDef="accountId">
              <th mat-header-cell *matHeaderCellDef> Account ID </th>
              <td mat-cell *matCellDef="let entry"> #{{ entry.accountId }} </td>
            </ng-container>

            <ng-container matColumnDef="entryType">
              <th mat-header-cell *matHeaderCellDef> Entry Type </th>
              <td mat-cell *matCellDef="let entry">
                <span class="entry-badge" [ngClass]="entry.entryType.toLowerCase()">
                  {{ entry.entryType }}
                </span>
              </td>
            </ng-container>

            <ng-container matColumnDef="amount">
              <th mat-header-cell *matHeaderCellDef> Amount </th>
              <td mat-cell *matCellDef="let entry"> {{ entry.amount | currency:'VND':'symbol':'1.0-0' }} </td>
            </ng-container>

            <ng-container matColumnDef="balanceAfter">
              <th mat-header-cell *matHeaderCellDef> Balance After </th>
              <td mat-cell *matCellDef="let entry"> <strong>{{ entry.balanceAfter | currency:'VND':'symbol':'1.0-0' }}</strong> </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="ledgerColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: ledgerColumns;"></tr>
          </table>
        </div>
      </div>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close color="primary">Close</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-title { display: flex; align-items: center; gap: 8px; margin: 0; }
    .dialog-content { padding-top: 16px; }
    .spinner-box { display: flex; justify-content: center; padding: 32px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; background: #f9f9f9; padding: 16px; border-radius: 8px; }
    .info-item { display: flex; flex-direction: column; gap: 4px; }
    .info-item.full { grid-column: span 2; }
    .label { font-size: 0.8rem; color: #666; font-weight: 500; }
    .value { font-size: 0.95rem; font-weight: 600; color: #333; }
    .font-mono { font-family: monospace; }
    .amount-highlight { font-size: 1.1rem; color: #1976d2; font-weight: 700; }
    .status-badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: 600; width: fit-content; }
    .status-badge.completed { background: #4caf50; color: white; }
    .status-badge.pending { background: #ff9800; color: white; }
    .status-badge.failed { background: #f44336; color: white; }
    .ledger-section { margin-top: 20px; }
    .ledger-section h4 { display: flex; align-items: center; gap: 6px; margin: 0 0 4px 0; }
    .ledger-subtitle { font-size: 0.85rem; color: #666; margin-bottom: 12px; }
    .ledger-table { width: 100%; }
    .entry-badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 700; }
    .entry-badge.debit { background: #ffebee; color: #c62828; }
    .entry-badge.credit { background: #e8f5e9; color: #2e7d32; }
  `]
})
export class TransactionDetailComponent implements OnInit {
  detail: TransactionDetailResponse | null = null;
  loading = true;
  ledgerColumns: string[] = ['id', 'accountId', 'entryType', 'amount', 'balanceAfter'];

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { ref: string },
    private transactionService: TransactionService,
    private dialogRef: MatDialogRef<TransactionDetailComponent>
  ) {}

  ngOnInit(): void {
    this.loadDetail();
  }

  private loadDetail(): void {
    this.transactionService.getTransactionByRef(this.data.ref).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.detail = res.data;
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }
}
