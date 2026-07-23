import { Component, OnInit, OnDestroy, signal, computed, inject } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import { TransactionService, TransactionFilters } from '../../../core/services/transaction.service';
import { TransactionResponse, TransactionType, TransactionStatus } from '../../../core/models/transaction.model';
import { TransactionDetailComponent } from '../transaction-detail/transaction-detail.component';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { CardComponent } from '../../../shared/components/card/card.component';

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
    MatDialogModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    SkeletonComponent,
    EmptyStateComponent,
    BadgeComponent,
    ButtonComponent,
    CardComponent
  ],
  template: `
    <div class="transactions-page">
      <!-- Header Group -->
      <div class="page-header flex-between">
        <div>
          <h2>Transactions</h2>
          <p class="subtitle">All payments, refunds and top-ups on your wallet.</p>
        </div>
        <pg-button variant="primary" size="md" routerLink="/transactions/pay">
          <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <polyline points="19 12 12 19 5 12" />
          </svg>
          New payment
        </pg-button>
      </div>

      <!-- Main Content Card -->
      <pg-card variant="outlined" class="table-card">
        <!-- Filter Tabs & Search Bar Row -->
        <div class="filter-row flex-between">
          <!-- Filter Tabs -->
          <div class="filter-tabs">
            <button
              class="tab-btn"
              [class.active]="selectedTab() === 'ALL'"
              (click)="setTab('ALL')">
              All
            </button>
            <button
              class="tab-btn"
              [class.active]="selectedTab() === 'COMPLETED'"
              (click)="setTab('COMPLETED')">
              Completed
            </button>
            <button
              class="tab-btn"
              [class.active]="selectedTab() === 'PROCESSING'"
              (click)="setTab('PROCESSING')">
              Processing
            </button>
            <button
              class="tab-btn"
              [class.active]="selectedTab() === 'FAILED'"
              (click)="setTab('FAILED')">
              Failed
            </button>
          </div>

          <!-- Search & Type Filter -->
          <div class="filter-controls flex-between" style="gap: 12px; align-items: center;">
            <div class="search-box" style="width: 280px;">
              <mat-icon class="search-icon">search</mat-icon>
              <input
                type="text"
                class="search-input"
                placeholder="Search by reference or note"
                [value]="searchQuery()"
                (input)="onSearchChange($event)"
              >
            </div>

            <mat-form-field appearance="outline" class="type-filter">
              <mat-label>Type</mat-label>
              <mat-select [value]="typeFilter()" (selectionChange)="onTypeFilterChange($event)">
                <mat-option value="">All Types</mat-option>
                <mat-option value="PAYMENT">Payment</mat-option>
                <mat-option value="TOPUP">Top Up</mat-option>
                <mat-option value="REFUND">Refund</mat-option>
                <mat-option value="WITHDRAW">Withdraw</mat-option>
              </mat-select>
            </mat-form-field>
          </div>
        </div>

        <!-- Table Loading / Skeleton -->
        <div *ngIf="loading()" class="skeleton-table">
          <pg-skeleton variant="rectangular" width="100%" height="56px" *ngFor="let _ of [1,2,3,4,5]"></pg-skeleton>
        </div>

        <!-- Transactions Table -->
        <div *ngIf="!loading()" class="custom-table-wrapper">
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
              <tr *ngFor="let tx of transactions()" class="transaction-row">
                <td class="font-mono">
                  <span class="ref-green-link" (click)="openDetail(tx.transactionRef)">
                    {{ tx.transactionRef }}
                  </span>
                </td>
                <td class="font-medium">
                  <pg-badge [variant]="getTypeVariant(tx.type)">{{ tx.type }}</pg-badge>
                </td>
                <td class="font-mono text-muted">PAY000000000{{ tx.sourceAccountId }}</td>
                <td class="font-mono text-muted">PAY000000000{{ tx.destAccountId }}</td>
                <td class="font-bold">{{ tx.amount | currency:'VND':'symbol':'1.0-0' }}</td>
                <td>
                  <pg-badge [variant]="getStatusVariant(tx.status)">{{ tx.status }}</pg-badge>
                </td>
                <td class="text-muted">{{ tx.createdAt | date:'dd MMM YYYY, HH:mm' }}</td>
              </tr>
              <tr *ngIf="transactions().length === 0">
                <td colspan="7" class="text-center py-4 text-muted">
                  <pg-empty-state
                    icon="receipt_long"
                    title="No transactions found"
                    message="Try adjusting your filters or search query"
                    [actionLabel]="'Clear filters'"
                    (actionClick)="clearFilters()"
                  ></pg-empty-state>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Paginator -->
        <mat-paginator
          [length]="totalElements()"
          [pageSize]="pageSize()"
          [pageSizeOptions]="[5, 10, 20, 50]"
          [pageIndex]="pageIndex()"
          (page)="onPageChange($event)"
          class="custom-paginator"
          [showFirstLastButtons]="true"
          [hidePageSize]="false">
        </mat-paginator>
      </pg-card>
    </div>
  `,
  styles: [`
    .transactions-page { display: flex; flex-direction: column; gap: 20px; color: var(--color-text-primary); }

    .flex-between { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; }
    .page-header h2 { font-size: 1.5rem; font-weight: 700; margin: 0 0 4px 0; }
    .subtitle { font-size: 0.875rem; color: var(--color-text-tertiary); margin: 0; }

    .table-card { background: var(--color-bg-secondary); border: 1px solid var(--color-border-primary); border-radius: var(--radius-xl); overflow: hidden; }
    .filter-row { margin-bottom: 20px; flex-wrap: wrap; gap: 16px; }

    /* Tabs Pill Group */
    .filter-tabs { display: flex; background-color: var(--color-bg-tertiary); padding: 4px; border-radius: var(--radius-md); gap: 2px; }
    .tab-btn { background: transparent; border: none; padding: 6px 14px; border-radius: var(--radius-sm); font-size: 0.825rem; font-weight: 600; color: var(--color-text-tertiary); cursor: pointer; transition: all var(--transition-fast); }
    .tab-btn:hover { color: var(--color-text-primary); }
    .tab-btn.active { background-color: var(--color-bg-secondary); color: var(--color-text-primary); box-shadow: var(--shadow-sm); }

    /* Search Box */
    .search-box { display: flex; align-items: center; background-color: var(--color-bg-secondary); border: 1px solid var(--color-border-primary); border-radius: var(--radius-md); padding: 0 12px; width: 280px; height: 36px; }
    .search-icon { font-size: 18px; width: 18px; height: 18px; color: var(--color-text-tertiary); margin-right: 8px; }
    .search-input { border: none; outline: none; width: 100%; font-size: 0.825rem; color: var(--color-text-primary); background: transparent; }
    .search-input::placeholder { color: var(--color-text-tertiary); }

    /* Type Filter */
    .type-filter { min-width: 180px; }
    :host ::ng-deep .type-filter .mat-mdc-form-field { width: 100%; }

    .filter-controls { display: flex; align-items: center; gap: 12px; }

    .spinner-box { display: flex; justify-content: center; padding: 48px; }
    .skeleton-table { padding: var(--space-6); }
    .custom-table-wrapper { overflow-x: auto; }
    .paygate-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 0.875rem; }
    .paygate-table th { padding: 12px 14px; font-size: 0.75rem; font-weight: 600; color: var(--color-text-tertiary); border-bottom: 1px solid var(--color-border-primary); text-transform: uppercase; letter-spacing: 0.05em; }
    .paygate-table td { padding: 14px; border-bottom: 1px solid var(--color-border-primary); color: var(--color-text-primary); }
    .paygate-table tr:last-child td { border-bottom: none; }
    .transaction-row { transition: background-color var(--transition-fast); }
    .transaction-row:hover { background-color: var(--color-bg-hover); }

    .ref-green-link { color: var(--color-primary-600); font-weight: 600; cursor: pointer; text-decoration: none; }
    .ref-green-link:hover { text-decoration: underline; }

    .font-mono { font-family: var(--font-family-mono); font-size: 0.825rem; font-weight: 600; }
    .font-medium { font-weight: 600; }
    .font-bold { font-weight: 700; color: var(--color-text-primary); }
    .text-muted { color: var(--color-text-tertiary); }
    .text-center { text-align: center; }
    .py-4 { padding-top: 16px; padding-bottom: 16px; }

    .custom-paginator { margin-top: 12px; border-top: 1px solid var(--color-border-primary); padding-top: 12px; }

    @media (max-width: 768px) {
      .filter-row { flex-direction: column; align-items: stretch; }
      .search-box { width: 100%; }
      .type-filter { width: 100%; }
    }
  `]
})
export class TransactionListComponent implements OnInit, OnDestroy {
  private transactionService = inject(TransactionService);
  private dialog = inject(MatDialog);
  private destroy$ = new Subject<void>();

  // Signals for reactive state
  transactions = signal<TransactionResponse[]>([]);
  loading = signal(false);
  pageIndex = signal(0);
  pageSize = signal(10);
  totalElements = signal(0);

  selectedTab = signal<'ALL' | 'COMPLETED' | 'PROCESSING' | 'FAILED'>('ALL');
  searchQuery = signal('');
  typeFilter = signal<TransactionType | ''>('');

  ngOnInit(): void {
    this.loadTransactions();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  setTab(tab: 'ALL' | 'COMPLETED' | 'PROCESSING' | 'FAILED'): void {
    this.selectedTab.set(tab);
    this.pageIndex.set(0);
    this.loadTransactions();
  }

  onSearchChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);
    this.pageIndex.set(0);
    this.debouncedSearch();
  }

  onTypeFilterChange(event: any): void {
    this.typeFilter.set(event.value);
    this.pageIndex.set(0);
    this.loadTransactions();
  }

  private debouncedSearch = () => {
    this.searchSubject.next(this.searchQuery());
  };

  private searchSubject = new Subject<string>();

  loadTransactions(): void {
    this.loading.set(true);

    const filters: TransactionFilters = {
      page: this.pageIndex(),
      size: this.pageSize(),
      status: this.selectedTab() === 'ALL' ? undefined : this.selectedTab() as TransactionStatus,
      type: this.typeFilter() || undefined,
      // Note: search query would need backend support for full server-side search
      // For now we apply client-side filtering on the returned page
    };

    this.transactionService.getMyTransactions(filters).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          let transactions = res.data.content;

          // Client-side search filtering (temporary until backend supports it)
          if (this.searchQuery().trim()) {
            const q = this.searchQuery().toLowerCase();
            transactions = transactions.filter(t =>
              t.transactionRef.toLowerCase().includes(q) ||
              (t.description && t.description.toLowerCase().includes(q))
            );
          }

          this.transactions.set(transactions);
          this.totalElements.set(res.data.totalElements);
        }
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.loadTransactions();
  }

  clearFilters(): void {
    this.searchQuery.set('');
    this.typeFilter.set('');
    this.selectedTab.set('ALL');
    this.pageIndex.set(0);
    this.loadTransactions();
  }

  openDetail(ref: string): void {
    this.dialog.open(TransactionDetailComponent, {
      width: '640px',
      data: { ref }
    });
  }

  getTypeVariant(type: string): 'primary' | 'success' | 'warning' | 'error' | 'info' | 'neutral' {
    switch (type) {
      case 'PAYMENT': return 'primary';
      case 'TOPUP': return 'success';
      case 'REFUND': return 'info';
      case 'WITHDRAW': return 'warning';
      default: return 'neutral';
    }
  }

  getStatusVariant(status: string): 'primary' | 'success' | 'warning' | 'error' | 'info' | 'neutral' {
    switch (status.toLowerCase()) {
      case 'completed': return 'success';
      case 'failed': return 'error';
      case 'processing': return 'primary';
      case 'pending': return 'warning';
      default: return 'neutral';
    }
  }
}