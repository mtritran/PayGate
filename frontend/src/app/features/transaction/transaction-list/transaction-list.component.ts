import { Component, OnInit, OnDestroy, signal, computed, inject } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import { TransactionService, TransactionFilters } from '../../../core/services/transaction.service';
import { TransactionResponse, TransactionType, TransactionStatus } from '../../../core/models/transaction.model';
import { TransactionDetailComponent } from '../transaction-detail/transaction-detail.component';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';

export interface BankBadge {
  name: string;
  bg: string;
  color: string;
  border: string;
}

@Component({
  selector: 'app-transaction-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    CurrencyPipe,
    DatePipe,
    MatDialogModule,
    SkeletonComponent,
    EmptyStateComponent,
    BadgeComponent
  ],
  template: `
    <div class="transactions-page fade-in-up">
      <!-- Header Group -->
      <div class="page-header flex-between">
        <div>
          <div class="header-tag">PAYGATE LEDGER & TRANSACTIONS</div>
          <h2>Transactions</h2>
          <p class="subtitle">All payments, refunds, and top-ups processed on your PayGate wallet with explicit bank transparency.</p>
        </div>
        <a class="btn-new-payment pulse-glow" routerLink="/transactions/pay">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <polyline points="19 12 12 19 5 12" />
          </svg>
          <span>New payment ↗</span>
        </a>
      </div>

      <!-- Main Content Glass Card -->
      <div class="table-card hover-lift">
        <!-- Filter Tabs & Controls Header Row -->
        <div class="filter-row flex-between">
          <!-- Status Filter Tabs -->
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

          <!-- Search Box & Custom Type Filter Select -->
          <div class="filter-controls">
            <div class="search-box">
              <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                class="search-input"
                placeholder="Search by reference, bank name, or note..."
                [value]="searchQuery()"
                (input)="onSearchChange($event)"
              >
            </div>

            <div class="select-wrapper">
              <select class="custom-select" [value]="typeFilter()" (change)="onTypeSelectChange($event)">
                <option value="">All Types</option>
                <option value="PAYMENT">Payment</option>
                <option value="TOPUP">Top Up</option>
                <option value="REFUND">Refund</option>
                <option value="WITHDRAW">Withdraw</option>
              </select>
              <svg class="select-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
          </div>
        </div>

        <!-- Skeleton Loader -->
        <div *ngIf="loading()" class="skeleton-table">
          <pg-skeleton variant="rectangular" width="100%" height="48px" *ngFor="let _ of [1,2,3,4,5]"></pg-skeleton>
        </div>

        <!-- Transactions Table -->
        <div *ngIf="!loading()" class="custom-table-wrapper">
          <table class="paygate-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Type</th>
                <th>Bank Source</th>
                <th>Accounts</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let tx of transactions()" class="transaction-row" (click)="openDetail(tx.transactionRef)">
                <td class="font-mono">
                  <div class="ref-cell">
                    <svg class="dir-icon" [class.inbound]="tx.type === 'TOPUP'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                      <line x1="7" y1="17" x2="17" y2="7" *ngIf="tx.type !== 'TOPUP'" />
                      <polyline points="7 7 17 7 17 17" *ngIf="tx.type !== 'TOPUP'" />
                      <line x1="17" y1="7" x2="7" y2="17" *ngIf="tx.type === 'TOPUP'" />
                      <polyline points="17 17 7 17 7 7" *ngIf="tx.type === 'TOPUP'" />
                    </svg>
                    <span class="ref-link">{{ tx.transactionRef }}</span>
                  </div>
                </td>
                <td class="font-medium">
                  <span class="type-badge">{{ tx.type }}</span>
                </td>

                <!-- Transparent Bank Brand Badge Column -->
                <td>
                  <span
                    class="bank-brand-badge"
                    [style.backgroundColor]="getBankBadge(tx.description, tx.type).bg"
                    [style.color]="getBankBadge(tx.description, tx.type).color"
                    [style.borderColor]="getBankBadge(tx.description, tx.type).border">
                    🏦 {{ getBankBadge(tx.description, tx.type).name }}
                  </span>
                </td>

                <td class="font-mono text-muted">
                  PAY000000000{{ tx.sourceAccountId }} ➔ PAY000000000{{ tx.destAccountId }}
                </td>
                <td class="font-bold" [ngClass]="tx.type === 'TOPUP' ? 'text-green' : 'text-dark'">
                  {{ tx.type === 'TOPUP' ? '+' : '-' }}{{ tx.amount | currency:'VND':'symbol':'1.0-0' }}
                </td>
                <td>
                  <span class="status-pill" [ngClass]="tx.status.toLowerCase()">
                    <span class="pill-dot"></span>
                    {{ tx.status }}
                  </span>
                </td>
                <td class="text-muted">{{ tx.createdAt | date:'dd MMM YYYY, HH:mm' }}</td>
              </tr>
              <tr *ngIf="transactions().length === 0">
                <td colspan="7" class="text-center py-6 text-muted">
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

        <!-- Custom Paginator -->
        <div class="paginator-bar">
          <div class="page-size-selector">
            <span class="paginator-label">Items per page:</span>
            <div class="mini-select-wrapper">
              <select class="mini-select" [value]="pageSize()" (change)="onPageSizeChange($event)">
                <option [value]="5">5</option>
                <option [value]="10">10</option>
                <option [value]="20">20</option>
                <option [value]="50">50</option>
              </select>
              <svg class="mini-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
          </div>

          <div class="pagination-info">
            {{ getPaginationRangeText() }}
          </div>

          <div class="paginator-controls">
            <button class="page-btn" [disabled]="pageIndex() === 0" (click)="goToPage(0)" title="First Page">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 19 4 12 11 5 11 19" /><line x1="18" y1="19" x2="18" y2="5" /></svg>
            </button>
            <button class="page-btn" [disabled]="pageIndex() === 0" (click)="goToPage(pageIndex() - 1)" title="Previous Page">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6" /></svg>
            </button>
            <button class="page-btn" [disabled]="isLastPage()" (click)="goToPage(pageIndex() + 1)" title="Next Page">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6" /></svg>
            </button>
            <button class="page-btn" [disabled]="isLastPage()" (click)="goToPage(getTotalPages() - 1)" title="Last Page">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 19 20 12 13 5 13 19" /><line x1="6" y1="19" x2="6" y2="5" /></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(14px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .fade-in-up { animation: fadeInUp 0.4s ease-out forwards; }

    .transactions-page { display: flex; flex-direction: column; gap: 24px; color: #0f172a; font-family: 'Inter', system-ui, sans-serif; }
    .flex-between { display: flex; justify-content: space-between; align-items: center; }

    .header-tag { font-size: 0.7rem; font-weight: 800; color: #059669; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
    .page-header h2 { font-size: 1.65rem; font-weight: 800; margin: 0 0 4px 0; color: #0f172a; letter-spacing: -0.02em; }
    .subtitle { font-size: 0.875rem; color: #64748b; margin: 0; }

    .btn-new-payment {
      background: linear-gradient(135deg, #059669 0%, #047857 100%);
      color: #ffffff !important;
      border-radius: 10px;
      font-weight: 600;
      font-size: 0.875rem;
      padding: 0 20px;
      height: 42px;
      display: flex;
      align-items: center;
      gap: 8px;
      text-decoration: none;
      box-shadow: 0 4px 12px rgba(5, 150, 105, 0.25);
      transition: all 0.2s;
    }
    .btn-new-payment:hover { transform: translateY(-1.5px); box-shadow: 0 6px 16px rgba(5, 150, 105, 0.35); }

    .table-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 24px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.03);
    }

    .filter-row { margin-bottom: 20px; flex-wrap: wrap; gap: 16px; }

    /* Filter Tabs */
    .filter-tabs { display: flex; background-color: #f1f5f9; padding: 4px; border-radius: 10px; gap: 2px; }
    .tab-btn { background: transparent; border: none; padding: 7px 16px; border-radius: 8px; font-size: 0.825rem; font-weight: 600; color: #64748b; cursor: pointer; transition: all 0.15s; }
    .tab-btn:hover { color: #0f172a; }
    .tab-btn.active { background-color: #ffffff; color: #059669; font-weight: 700; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }

    .filter-controls { display: flex; align-items: center; gap: 12px; }

    /* Search Box */
    .search-box { display: flex; align-items: center; gap: 8px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 0 14px; width: 280px; height: 38px; transition: all 0.15s; }
    .search-box:focus-within { border-color: #059669; background-color: #ffffff; box-shadow: 0 0 0 3px rgba(5, 150, 105, 0.1); }
    .search-icon { width: 16px; height: 16px; color: #94a3b8; flex-shrink: 0; }
    .search-input { border: none; outline: none; width: 100%; font-size: 0.825rem; color: #0f172a; background: transparent; }
    .search-input::placeholder { color: #94a3b8; }

    /* Custom Type Select */
    .select-wrapper { position: relative; width: 140px; }
    .custom-select {
      width: 100%;
      height: 38px;
      padding: 0 32px 0 12px;
      font-size: 0.825rem;
      font-weight: 600;
      color: #334155;
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      outline: none;
      appearance: none;
      cursor: pointer;
      transition: all 0.15s;
    }
    .custom-select:hover { border-color: #cbd5e1; }
    .custom-select:focus { border-color: #059669; background-color: #ffffff; box-shadow: 0 0 0 3px rgba(5, 150, 105, 0.1); }
    .select-chevron { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); width: 16px; height: 16px; color: #94a3b8; pointer-events: none; }

    .skeleton-table { padding: 12px 0; display: flex; flex-direction: column; gap: 8px; }
    .custom-table-wrapper { overflow-x: auto; }
    
    /* Table */
    .paygate-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 0.875rem; }
    .paygate-table th { padding: 12px 16px; font-size: 0.72rem; font-weight: 700; color: #64748b; border-bottom: 1px solid #e2e8f0; text-transform: uppercase; letter-spacing: 0.04em; }
    .paygate-table td { padding: 14px 16px; border-bottom: 1px solid #f1f5f9; color: #1e293b; }
    
    .transaction-row { cursor: pointer; transition: background-color 0.15s; }
    .transaction-row:hover td { background-color: #f8fafc; }

    .ref-cell { display: flex; align-items: center; gap: 8px; }
    .dir-icon { width: 18px; height: 18px; color: #dc2626; }
    .dir-icon.inbound { color: #16a34a; }
    .ref-link { font-family: monospace; font-size: 0.825rem; font-weight: 700; color: #059669; }

    .type-badge { font-weight: 600; font-size: 0.825rem; background-color: #f1f5f9; padding: 2px 8px; border-radius: 6px; color: #334155; }

    /* Bank Brand Badge */
    .bank-brand-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 0.75rem;
      font-weight: 800;
      padding: 3px 10px;
      border-radius: 12px;
      border: 1px solid transparent;
      white-space: nowrap;
    }

    .font-mono { font-family: monospace; font-size: 0.825rem; font-weight: 600; }
    .font-medium { font-weight: 600; }
    .font-bold { font-weight: 700; }
    .text-green { color: #16a34a; }
    .text-dark { color: #0f172a; }
    .text-muted { color: #64748b; }
    .text-center { text-align: center; }
    .py-6 { padding-top: 24px; padding-bottom: 24px; }

    .status-pill { display: inline-flex; align-items: center; gap: 6px; padding: 3px 10px; border-radius: 14px; font-size: 0.72rem; font-weight: 700; text-transform: uppercase; }
    .pill-dot { width: 6px; height: 6px; border-radius: 50%; }
    
    .status-pill.completed { background-color: #dcfce7; color: #15803d; }
    .status-pill.completed .pill-dot { background-color: #16a34a; }
    
    .status-pill.failed { background-color: #fee2e2; color: #b91c1c; }
    .status-pill.failed .pill-dot { background-color: #dc2626; }
    
    .status-pill.processing { background-color: #e0f2fe; color: #0369a1; }
    .status-pill.processing .pill-dot { background-color: #0284c7; }

    /* Custom Paginator Bar */
    .paginator-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid #f1f5f9;
      font-size: 0.825rem;
      color: #64748b;
    }

    .page-size-selector { display: flex; align-items: center; gap: 8px; }
    .paginator-label { font-weight: 500; }
    .mini-select-wrapper { position: relative; width: 64px; }
    .mini-select { width: 100%; height: 32px; padding: 0 20px 0 8px; font-size: 0.825rem; font-weight: 600; color: #334155; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; outline: none; appearance: none; cursor: pointer; }
    .mini-chevron { position: absolute; right: 6px; top: 50%; transform: translateY(-50%); width: 14px; height: 14px; color: #94a3b8; pointer-events: none; }

    .pagination-info { font-weight: 600; color: #334155; }
    .paginator-controls { display: flex; align-items: center; gap: 4px; }
    .page-btn { width: 32px; height: 32px; border: 1px solid #e2e8f0; background: #ffffff; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: #475569; cursor: pointer; transition: all 0.15s; }
    .page-btn:hover:not(:disabled) { background-color: #f8fafc; color: #059669; border-color: #cbd5e1; }
    .page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .page-btn svg { width: 16px; height: 16px; }

    @media (max-width: 768px) {
      .filter-row { flex-direction: column; align-items: stretch; }
      .search-box { width: 100%; }
      .select-wrapper { width: 100%; }
      .paginator-bar { flex-direction: column; gap: 12px; }
    }
  `]
})
export class TransactionListComponent implements OnInit, OnDestroy {
  private transactionService = inject(TransactionService);
  private dialog = inject(MatDialog);
  private destroy$ = new Subject<void>();

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

  getBankBadge(desc: string, type: string): BankBadge {
    const text = (desc || '').toLowerCase();
    if (text.includes('mb bank') || text.includes('quân đội')) {
      return { name: 'MB Bank', bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' };
    }
    if (text.includes('vietcombank') || text.includes('vcb')) {
      return { name: 'Vietcombank', bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' };
    }
    if (text.includes('techcombank') || text.includes('tcb')) {
      return { name: 'Techcombank', bg: '#fef2f2', color: '#dc2626', border: '#fecaca' };
    }
    if (text.includes('vpbank')) {
      return { name: 'VPBank', bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' };
    }
    if (text.includes('momo')) {
      return { name: 'Ví MoMo', bg: '#fdf2f8', color: '#db2777', border: '#fbcfe8' };
    }
    if (text.includes('zalopay') || text.includes('zalo')) {
      return { name: 'ZaloPay', bg: '#f0f9ff', color: '#0284c7', border: '#bae6fd' };
    }
    if (text.includes('bidv')) {
      return { name: 'BIDV', bg: '#f0f9ff', color: '#0369a1', border: '#bae6fd' };
    }
    if (text.includes('agribank')) {
      return { name: 'Agribank', bg: '#fff1f2', color: '#be123c', border: '#fecdd3' };
    }
    if (text.includes('acb')) {
      return { name: 'ACB Bank', bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' };
    }
    if (text.includes('napas')) {
      return { name: 'Napas ATM', bg: '#f8fafc', color: '#475569', border: '#cbd5e1' };
    }
    if (type === 'TOPUP') {
      return { name: 'Vietcombank', bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' };
    }
    return { name: 'PayGate Wallet', bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' };
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
    this.loadTransactions();
  }

  onTypeSelectChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as TransactionType | '';
    this.typeFilter.set(value);
    this.pageIndex.set(0);
    this.loadTransactions();
  }

  onPageSizeChange(event: Event): void {
    const value = Number((event.target as HTMLSelectElement).value);
    this.pageSize.set(value);
    this.pageIndex.set(0);
    this.loadTransactions();
  }

  goToPage(page: number): void {
    if (page >= 0 && page < this.getTotalPages()) {
      this.pageIndex.set(page);
      this.loadTransactions();
    }
  }

  getTotalPages(): number {
    return Math.ceil(this.totalElements() / this.pageSize()) || 1;
  }

  isLastPage(): boolean {
    return this.pageIndex() >= this.getTotalPages() - 1;
  }

  getPaginationRangeText(): string {
    const total = this.totalElements();
    if (total === 0) return '0 - 0 of 0';
    const start = this.pageIndex() * this.pageSize() + 1;
    const end = Math.min((this.pageIndex() + 1) * this.pageSize(), total);
    return `${start} – ${end} of ${total}`;
  }

  loadTransactions(): void {
    this.loading.set(true);

    const filters: TransactionFilters = {
      page: this.pageIndex(),
      size: this.pageSize(),
      status: this.selectedTab() === 'ALL' ? undefined : this.selectedTab() as TransactionStatus,
      type: this.typeFilter() || undefined,
    };

    this.transactionService.getMyTransactions(filters).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          let list = res.data.content;

          const status = this.selectedTab();
          if (status !== 'ALL') {
            list = list.filter(t => t.status.toUpperCase() === status.toUpperCase());
          }

          const type = this.typeFilter();
          if (type) {
            list = list.filter(t => t.type.toUpperCase() === type.toUpperCase());
          }

          const q = this.searchQuery().trim().toLowerCase();
          if (q) {
            list = list.filter(t =>
              t.transactionRef.toLowerCase().includes(q) ||
              (t.description && t.description.toLowerCase().includes(q)) ||
              t.sourceAccountId.toString().includes(q) ||
              t.destAccountId.toString().includes(q) ||
              t.amount.toString().includes(q)
            );
          }

          this.transactions.set(list);
          this.totalElements.set(list.length);
        }
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
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
}