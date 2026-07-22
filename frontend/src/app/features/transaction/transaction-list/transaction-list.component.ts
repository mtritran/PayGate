import { Component, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { TransactionService } from '../../../core/services/transaction.service';
import { TransactionResponse } from '../../../core/models/transaction.model';
import { TransactionDetailComponent } from '../transaction-detail/transaction-detail.component';

@Component({
  selector: 'app-transaction-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    CurrencyPipe,
    DatePipe,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatDialogModule
  ],
  template: `
    <div class="history-container">
      <div class="header-actions">
        <h2>Lịch Sử Giao Dịch</h2>
        <div>
          <a mat-raised-button color="accent" routerLink="/transactions/pay">
            <mat-icon>payment</mat-icon> Tạo Thanh Toán
          </a>
        </div>
      </div>

      <mat-card>
        <mat-card-content>
          <div *ngIf="loading" class="spinner-box">
            <mat-spinner diameter="40"></mat-spinner>
          </div>

          <table mat-table [dataSource]="transactions" *ngIf="!loading" class="full-width-table">
            <!-- Transaction Ref Column -->
            <ng-container matColumnDef="transactionRef">
              <th mat-header-cell *matHeaderCellDef> Mã Giao Dịch (Ref) </th>
              <td mat-cell *matCellDef="let element">
                <span class="ref-link" (click)="openDetail(element.transactionRef)">{{ element.transactionRef }}</span>
              </td>
            </ng-container>

            <!-- Type Column -->
            <ng-container matColumnDef="type">
              <th mat-header-cell *matHeaderCellDef> Loại </th>
              <td mat-cell *matCellDef="let element">
                <span class="type-chip" [ngClass]="element.type.toLowerCase()">
                  {{ element.type }}
                </span>
              </td>
            </ng-container>

            <!-- Amount Column -->
            <ng-container matColumnDef="amount">
              <th mat-header-cell *matHeaderCellDef> Số Tiền </th>
              <td mat-cell *matCellDef="let element" [ngClass]="element.type.toLowerCase()">
                <strong>{{ element.type === 'TOPUP' ? '+' : '-' }}{{ element.amount | currency:'VND':'symbol':'1.0-0' }}</strong>
              </td>
            </ng-container>

            <!-- Status Column -->
            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef> Trạng Thái </th>
              <td mat-cell *matCellDef="let element">
                <span class="status-badge" [ngClass]="element.status.toLowerCase()">
                  {{ element.status }}
                </span>
              </td>
            </ng-container>

            <!-- Date Column -->
            <ng-container matColumnDef="createdAt">
              <th mat-header-cell *matHeaderCellDef> Thời Gian </th>
              <td mat-cell *matCellDef="let element"> {{ element.createdAt | date:'dd/MM/yyyy HH:mm:ss' }} </td>
            </ng-container>

            <!-- Action Column -->
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef> Chi Tiết </th>
              <td mat-cell *matCellDef="let element">
                <button mat-icon-button color="primary" (click)="openDetail(element.transactionRef)">
                  <mat-icon>visibility</mat-icon>
                </button>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
          </table>

          <div *ngIf="!loading && transactions.length === 0" class="empty-text">
            Chưa có lịch sử giao dịch.
          </div>

          <mat-paginator
            [length]="totalElements"
            [pageSize]="pageSize"
            [pageSizeOptions]="[5, 10, 20]"
            (page)="onPageChange($event)">
          </mat-paginator>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .history-container { display: flex; flex-direction: column; gap: 16px; }
    .header-actions { display: flex; justify-content: space-between; align-items: center; }
    .spinner-box { display: flex; justify-content: center; padding: 32px; }
    .full-width-table { width: 100%; }
    .ref-link { font-weight: 600; color: #1976d2; cursor: pointer; text-decoration: underline; }
    .type-chip { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600; }
    .type-chip.topup { background: #e8f5e9; color: #2e7d32; }
    .type-chip.payment { background: #e3f2fd; color: #1565c0; }
    .type-chip.refund { background: #fff3e0; color: #e65100; }
    .status-badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: 600; }
    .status-badge.completed { background: #4caf50; color: white; }
    .status-badge.pending { background: #ff9800; color: white; }
    .status-badge.failed { background: #f44336; color: white; }
    .topup { color: #2e7d32; }
    .payment { color: #c62828; }
    .refund { color: #e65100; }
    .empty-text { padding: 32px; text-align: center; color: #757575; }
  `]
})
export class TransactionListComponent implements OnInit {
  displayedColumns: string[] = ['transactionRef', 'type', 'amount', 'status', 'createdAt', 'actions'];
  transactions: TransactionResponse[] = [];
  loading = true;
  pageIndex = 0;
  pageSize = 10;
  totalElements = 0;

  constructor(
    private transactionService: TransactionService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadTransactions();
  }

  loadTransactions(): void {
    this.loading = true;
    this.transactionService.getMyTransactions(this.pageIndex, this.pageSize).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.transactions = res.data.content;
          this.totalElements = res.data.totalElements;
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadTransactions();
  }

  openDetail(ref: string): void {
    this.dialog.open(TransactionDetailComponent, {
      width: '640px',
      data: { ref }
    });
  }
}
