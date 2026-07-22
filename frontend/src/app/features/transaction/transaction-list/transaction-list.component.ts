import { Component, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
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
    FormsModule,
    CurrencyPipe,
    DatePipe,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatDialogModule
  ],
  template: `
    <div class="transactions-page">
      <!-- Header Group -->
      <div class="page-header flex-between">
        <div>
          <h2>Transactions</h2>
          <p class="subtitle">All payments, refunds and top-ups on your wallet.</p>
        </div>
        <a mat-raised-button class="btn-new-payment" routerLink="/transactions/pay">
          New payment
        </a>
      </div>

      <!-- Main Content Card -->
      <div class="content-card table-card">
        <!-- Filter Tabs & Search Bar Row -->
        <div class="filter-row flex-between">
          <!-- Filter Tabs -->
          <div class="filter-tabs">
            <button
              class="tab-btn"
              [class.active]="selectedTab === 'ALL'"
              (click)="setTab('ALL')">
              All
            </button>
            <button
              class="tab-btn"
              [class.active]="selectedTab === 'COMPLETED'"
              (click)="setTab('COMPLETED')">
              Completed
            </button>
            <button
              class="tab-btn"
              [class.active]="selectedTab === 'PROCESSING'"
              (click)="setTab('PROCESSING')">
              Processing
            </button>
            <button
              class="tab-btn"
              [class.active]="selectedTab === 'FAILED'"
              (click)="setTab('FAILED')">
              Failed
            </button>
          </div>

          <!-- Search Box -->
          <div class="search-box">
            <mat-icon class="search-icon">search</mat-icon>
            <input
              type="text"
              class="search-input"
              placeholder="Search by reference or note"
              [(ngModel)]="searchQuery"
              (ngModelChange)="onSearchChange()">
          </div>
        </div>

        <!-- Table Loading -->
        <div *ngIf="loading" class="spinner-box">
          <mat-spinner diameter="40"></mat-spinner>
        </div>

        <!-- Transactions Table -->
        <div *ngIf="!loading" class="custom-table-wrapper">
          <table class="paygate-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Type</th>
                <th>From</th>
                <th>To</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let tx of filteredTransactions">
                <td class="font-mono">
                  <span class="ref-green-link" (click)="openDetail(tx.transactionRef)">
                    {{ tx.transactionRef }}
                  </span>
                </td>
                <td class="font-medium">{{ tx.type }}</td>
                <td class="font-mono text-muted">PAY000000000{{ tx.sourceAccountId }}</td>
                <td class="font-mono text-muted">PAY000000000{{ tx.destAccountId }}</td>
                <td class="font-bold">{{ tx.amount | currency:'VND':'symbol':'1.0-0' }}</td>
                <td>
                  <span class="status-pill" [ngClass]="tx.status.toLowerCase()">
                    {{ tx.status }}
                  </span>
                </td>
                <td class="text-muted">{{ tx.createdAt | date:'dd MMM YYYY, HH:mm' }}</td>
              </tr>
              <tr *ngIf="filteredTransactions.length === 0">
                <td colspan="7" class="text-center py-4 text-muted">No transactions matching filter.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Paginator -->
        <mat-paginator
          [length]="totalElements"
          [pageSize]="pageSize"
          [pageSizeOptions]="[5, 10, 20]"
          (page)="onPageChange($event)"
          class="custom-paginator">
        </mat-paginator>
      </div>
    </div>
  `,
  styles: [`
    .transactions-page { display: flex; flex-direction: column; gap: 20px; color: #0f172a; }
    .flex-between { display: flex; justify-content: space-between; align-items: center; }
    .page-header h2 { font-size: 1.5rem; font-weight: 700; margin: 0 0 4px 0; }
    .subtitle { font-size: 0.875rem; color: #64748b; margin: 0; }

    .btn-new-payment { background-color: #059669 !important; color: #ffffff !important; border-radius: 8px; font-weight: 600; font-size: 0.875rem; padding: 0 18px; height: 38px; }

    .content-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; box-shadow: 0 1px 2px rgba(0,0,0,0.03); }
    .filter-row { margin-bottom: 20px; flex-wrap: wrap; gap: 16px; }

    /* Tabs Pill Group */
    .filter-tabs { display: flex; background-color: #f1f5f9; padding: 4px; border-radius: 8px; gap: 2px; }
    .tab-btn { background: transparent; border: none; padding: 6px 14px; border-radius: 6px; font-size: 0.825rem; font-weight: 600; color: #64748b; cursor: pointer; transition: all 0.15s; }
    .tab-btn:hover { color: #0f172a; }
    .tab-btn.active { background-color: #ffffff; color: #0f172a; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }

    /* Search Box */
    .search-box { display: flex; align-items: center; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0 12px; width: 280px; height: 36px; }
    .search-icon { font-size: 18px; width: 18px; height: 18px; color: #94a3b8; margin-right: 8px; }
    .search-input { border: none; outline: none; width: 100%; font-size: 0.825rem; color: #0f172a; background: transparent; }
    .search-input::placeholder { color: #94a3b8; }

    .spinner-box { display: flex; justify-content: center; padding: 48px; }
    .custom-table-wrapper { overflow-x: auto; }
    .paygate-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 0.875rem; }
    .paygate-table th { padding: 12px 14px; font-size: 0.75rem; font-weight: 600; color: #64748b; border-bottom: 1px solid #e2e8f0; }
    .paygate-table td { padding: 14px; border-bottom: 1px solid #f1f5f9; color: #1e293b; }
    .paygate-table tr:last-child td { border-bottom: none; }

    .ref-green-link { color: #059669; font-weight: 600; cursor: pointer; text-decoration: none; }
    .ref-green-link:hover { text-decoration: underline; }

    .font-mono { font-family: monospace; font-size: 0.825rem; font-weight: 600; }
    .font-medium { font-weight: 600; }
    .font-bold { font-weight: 700; color: #0f172a; }
    .text-muted { color: #64748b; }
    .text-center { text-align: center; }
    .py-4 { padding-top: 16px; padding-bottom: 16px; }

    .status-pill { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 0.72rem; font-weight: 700; text-transform: uppercase; }
    .status-pill.completed { background-color: #dcfce7; color: #15803d; }
    .status-pill.failed { background-color: #fee2e2; color: #b91c1c; }
    .status-pill.processing { background-color: #e0f2fe; color: #0369a1; }
    .status-pill.pending { background-color: #fef3c7; color: #b45309; }

    .custom-paginator { margin-top: 12px; border-top: 1px solid #f1f5f9; }
  `]
})
export class TransactionListComponent implements OnInit {
  transactions: TransactionResponse[] = [];
  filteredTransactions: TransactionResponse[] = [];
  selectedTab: 'ALL' | 'COMPLETED' | 'PROCESSING' | 'FAILED' = 'ALL';
  searchQuery = '';
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

  setTab(tab: 'ALL' | 'COMPLETED' | 'PROCESSING' | 'FAILED'): void {
    this.selectedTab = tab;
    this.applyFilters();
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  private applyFilters(): void {
    let result = [...this.transactions];

    if (this.selectedTab !== 'ALL') {
      result = result.filter(t => t.status.toUpperCase() === this.selectedTab);
    }

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(t =>
        t.transactionRef.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q))
      );
    }

    this.filteredTransactions = result;
  }

  loadTransactions(): void {
    this.loading = true;
    this.transactionService.getMyTransactions(this.pageIndex, this.pageSize).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.transactions = res.data.content;
          this.totalElements = res.data.totalElements;
          this.applyFilters();
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
