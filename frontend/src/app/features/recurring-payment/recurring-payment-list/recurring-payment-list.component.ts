import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import {
  RecurringPaymentService,
  RecurringPaymentResponse,
  RecurringPaymentLogResponse,
  RecurringStatus
} from '../../../core/services/recurring-payment.service';

@Component({
  selector: 'pg-recurring-payment-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="recurring-container fade-in">
      <!-- Header Banner -->
      <div class="header-banner">
        <div class="title-group">
          <div class="title-icon-box">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
          </div>
          <div>
            <h1 class="page-title">Recurring Payments & Auto Bills</h1>
            <p class="subtitle">Manage auto-transfer schedules and auto-pay for electricity/water/internet.</p>
          </div>
        </div>
        <button class="btn-create" (click)="goToCreate()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          <span>Create New</span>
        </button>
      </div>

      <!-- Stats Grid -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-top">
            <span class="stat-label">TOTAL SCHEDULES</span>
            <span class="stat-dot total-dot"></span>
          </div>
          <span class="stat-value">{{ payments().length }}</span>
        </div>
        <div class="stat-card active-card">
          <div class="stat-top">
            <span class="stat-label">ACTIVE</span>
            <span class="stat-dot active-dot"></span>
          </div>
          <span class="stat-value">{{ activeCount() }}</span>
        </div>
        <div class="stat-card paused-card">
          <div class="stat-top">
            <span class="stat-label">PAUSED</span>
            <span class="stat-dot paused-dot"></span>
          </div>
          <span class="stat-value">{{ pausedCount() }}</span>
        </div>
      </div>

      <!-- Loading / Error -->
      <div *ngIf="isLoading()" class="loading-box">
        <div class="spinner"></div>
        <span>Loading recurring payments...</span>
      </div>

      <div *ngIf="errorMsg()" class="error-alert">
        {{ errorMsg() }}
      </div>

      <!-- Minimal Table Card (Clean & Compact: 4 columns only) -->
      <div class="table-card" *ngIf="!isLoading() && payments().length > 0">
        <table class="pg-table">
          <thead>
            <tr>
              <th>Service & Note</th>
              <th>Amount</th>
              <th>Status</th>
              <th class="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let item of payments()" class="clickable-row" (click)="openDetail(item)">
              <td>
                <div class="service-cell">
                  <div class="category-badge" [ngClass]="item.category.toLowerCase()">
                    <span class="cat-icon" [ngSwitch]="item.category">
                      <svg *ngSwitchCase="'TRANSFER'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="22" y1="2" x2="11" y2="13"></line>
                        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                      </svg>
                      <svg *ngSwitchCase="'ELECTRICITY'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                      </svg>
                      <svg *ngSwitchCase="'WATER'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z"></path>
                      </svg>
                      <svg *ngSwitchCase="'INTERNET'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="2" y1="12" x2="22" y2="12"></line>
                      </svg>
                    </span>
                    <span>{{ getCategoryLabel(item.category) }}</span>
                  </div>
                  <span class="sub-detail" *ngIf="item.description || item.billCode || item.destAccountNumber">
                    {{ item.description || item.billCode || ('STK: ' + item.destAccountNumber) }}
                  </span>
                </div>
              </td>
              <td>
                <span class="amount-val">{{ item.amount | currency:'VND':'symbol':'1.0-0' }}</span>
              </td>
              <td>
                <span class="status-badge" [ngClass]="item.status.toLowerCase()">
                  <span class="status-dot"></span>
                  {{ getStatusLabel(item.status) }}
                </span>
              </td>
              <td class="text-right" (click)="$event.stopPropagation()">
                <div class="action-buttons">
                  <button class="btn-action btn-detail" (click)="openDetail(item)" title="View Details">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="16" x2="12" y2="12"></line>
                      <line x1="12" y1="8" x2="12.01" y2="8"></line>
                    </svg>
                    <span>Details</span>
                  </button>
                  <button class="btn-action btn-delete" (click)="deleteItem(item)" title="Delete">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Empty State -->
      <div class="empty-box" *ngIf="!isLoading() && payments().length === 0">
        <div class="empty-icon-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
        </div>
        <h3>No Recurring Payments Yet</h3>
        <p>Automate transfers or Electricity, Water, Internet bill payments with ease.</p>
        <button class="btn-create" (click)="goToCreate()">+ Create New</button>
      </div>

      <!-- Detail Modal -->
      <div class="modal-backdrop" *ngIf="selectedItemForDetail()">
        <div class="modal-content fade-in-up">
          <div class="modal-header">
            <div class="modal-title-group">
              <div class="category-badge" [ngClass]="selectedItemForDetail()?.category?.toLowerCase() || ''">
                <span>{{ getCategoryLabel(selectedItemForDetail()?.category || '') }}</span>
              </div>
              <h3>Schedule Details #{{ selectedItemForDetail()?.id }}</h3>
            </div>
            <button class="btn-close" (click)="selectedItemForDetail.set(null)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <div class="modal-body" *ngIf="selectedItemForDetail() as d">
            <div class="detail-grid">
              <div class="detail-item">
                <span class="detail-label">PAYMENT AMOUNT</span>
                <span class="detail-value amount-highlight">{{ d.amount | currency:'VND':'symbol':'1.0-0' }}</span>
              </div>

              <div class="detail-item">
                <span class="detail-label">STATUS</span>
                <span class="status-badge" [ngClass]="d.status.toLowerCase()">
                  <span class="status-dot"></span>
                  {{ getStatusLabel(d.status) }}
                </span>
              </div>

              <div class="detail-item">
                <span class="detail-label">FREQUENCY</span>
                <span class="detail-value">{{ getFrequencyLabel(d.frequency) }}</span>
              </div>

              <div class="detail-item" *ngIf="d.category === 'TRANSFER'">
                <span class="detail-label">DESTINATION ACCOUNT</span>
                <span class="detail-value font-mono">{{ d.destAccountNumber || ('ID: ' + d.destAccountId) }}</span>
              </div>

              <div class="detail-item" *ngIf="d.category !== 'TRANSFER'">
                <span class="detail-label">BILL CODE</span>
                <span class="detail-value font-mono">{{ d.billCode || 'N/A' }} ({{ d.providerCode || 'Provider' }})</span>
              </div>

              <div class="detail-item">
                <span class="detail-label">NEXT RUN</span>
                <span class="detail-value font-mono">{{ d.nextRunAt | date:'dd/MM/yyyy HH:mm:ss' }}</span>
              </div>

              <div class="detail-item" *ngIf="d.lastRunAt">
                <span class="detail-label">LAST RUN</span>
                <span class="detail-value font-mono">{{ d.lastRunAt | date:'dd/MM/yyyy HH:mm:ss' }}</span>
              </div>

              <div class="detail-item">
                <span class="detail-label">START DATE</span>
                <span class="detail-value font-mono">{{ d.startDate | date:'dd/MM/yyyy HH:mm' }}</span>
              </div>

              <div class="detail-item full-width" *ngIf="d.description">
                <span class="detail-label">TRANSACTION NOTE</span>
                <span class="detail-value text-desc">{{ d.description }}</span>
              </div>
            </div>

            <!-- Modal Action Buttons -->
            <div class="modal-actions">
              <button class="btn-modal btn-run" (click)="executeNow(d)">
                <span>Execute Now</span>
              </button>
              <button
                *ngIf="d.status === 'ACTIVE'"
                class="btn-modal btn-pause"
                (click)="toggleStatus(d, 'PAUSED')"
              >
                <span>Pause Schedule</span>
              </button>
              <button
                *ngIf="d.status === 'PAUSED'"
                class="btn-modal btn-resume"
                (click)="toggleStatus(d, 'ACTIVE')"
              >
                <span>Resume Schedule</span>
              </button>
              <button class="btn-modal btn-log" (click)="openLogs(d)">
                <span>View Execution Logs</span>
              </button>
              <button class="btn-modal btn-delete" (click)="deleteItem(d)">
                <span>Delete Schedule</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Logs Modal -->
      <div class="modal-backdrop" *ngIf="selectedItemForLogs()">
        <div class="modal-content fade-in-up">
          <div class="modal-header">
            <div class="modal-title-group">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
              </svg>
              <h3>Execution Logs #{{ selectedItemForLogs()?.id }}</h3>
            </div>
            <button class="btn-close" (click)="selectedItemForLogs.set(null)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div class="modal-body">
            <div *ngIf="isLogsLoading()" class="loading-box">Loading logs...</div>
            <div *ngIf="!isLogsLoading() && logs().length === 0" class="empty-logs">
              No execution logs recorded yet.
            </div>
            <table *ngIf="!isLogsLoading() && logs().length > 0" class="pg-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Ref</th>
                  <th>Status</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let l of logs()">
                  <td class="font-mono">{{ l.executedAt | date:'dd/MM/yyyy HH:mm:ss' }}</td>
                  <td class="font-mono"><code>{{ l.transactionRef || 'N/A' }}</code></td>
                  <td>
                    <span class="status-badge" [ngClass]="l.status === 'SUCCESS' ? 'active' : 'cancelled'">
                      {{ l.status }}
                    </span>
                  </td>
                  <td>{{ l.message }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .recurring-container {
      padding: 32px 24px;
      max-width: 1100px;
      margin: 0 auto;
    }

    /* Header Banner */
    .header-banner {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 28px;
      gap: 16px;
    }
    .title-group {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .title-icon-box {
      width: 48px;
      height: 48px;
      background: #fff0f6;
      border: 1px solid #f8bbd0;
      color: #c20067;
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .title-icon-box svg { width: 24px; height: 24px; }
    .page-title {
      font-size: 1.5rem;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 4px 0;
      letter-spacing: -0.02em;
    }
    .subtitle {
      color: #64748b;
      font-size: 0.9rem;
      margin: 0;
    }

    .btn-create {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: linear-gradient(135deg, #c20067 0%, #0072ce 100%);
      color: #ffffff;
      border: none;
      padding: 11px 20px;
      border-radius: 12px;
      font-weight: 700;
      font-size: 0.9rem;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(194, 0, 103, 0.2);
      transition: all 0.2s ease;
    }
    .btn-create svg { width: 18px; height: 18px; }
    .btn-create:hover {
      opacity: 0.9;
      transform: translateY(-1px);
    }

    /* Stats Grid */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      margin-bottom: 28px;
    }
    .stat-card {
      background: #ffffff;
      padding: 20px 24px;
      border-radius: 16px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 2px 8px rgba(0,0,0,0.02);
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .stat-top { display: flex; align-items: center; justify-content: space-between; }
    .stat-label { font-size: 0.72rem; color: #64748b; font-weight: 800; letter-spacing: 0.05em; }
    .stat-dot { width: 8px; height: 8px; border-radius: 50%; }
    .total-dot { background: #64748b; }
    .active-dot { background: #c20067; }
    .paused-dot { background: #d97706; }
    .stat-value { font-size: 2rem; font-weight: 800; color: #0f172a; line-height: 1; }
    .active-card .stat-value { color: #c20067; }
    .paused-card .stat-value { color: #d97706; }

    /* Minimalist Table */
    .table-card {
      background: #ffffff;
      border-radius: 16px;
      border: 1px solid #e2e8f0;
      overflow: hidden;
      box-shadow: 0 4px 16px rgba(0,0,0,0.03);
    }
    .pg-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }
    .pg-table th {
      background: #f8fafc;
      padding: 14px 20px;
      font-size: 0.75rem;
      color: #475569;
      font-weight: 800;
      letter-spacing: 0.04em;
      border-bottom: 1px solid #e2e8f0;
      white-space: nowrap;
    }
    .pg-table td {
      padding: 16px 20px;
      border-bottom: 1px solid #f1f5f9;
      font-size: 0.9rem;
      vertical-align: middle;
      color: #334155;
      white-space: nowrap;
    }
    .clickable-row { cursor: pointer; transition: background-color 0.15s ease; }
    .clickable-row:hover { background-color: #f8fafc; }
    .pg-table tbody tr:last-child td { border-bottom: none; }

    .service-cell { display: flex; flex-direction: column; gap: 4px; }
    .sub-detail { font-size: 0.78rem; color: #64748b; font-weight: 500; }

    .category-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 5px 12px;
      border-radius: 8px;
      font-weight: 700;
      font-size: 0.82rem;
      border: 1px solid transparent;
      white-space: nowrap;
    }
    .cat-icon svg { width: 14px; height: 14px; }
    .category-badge.transfer { background: #eff6ff; color: #1d4ed8; border-color: #bfdbfe; }
    .category-badge.electricity { background: #fffbeb; color: #b45309; border-color: #fde68a; }
    .category-badge.water { background: #ecfeff; color: #0e7490; border-color: #a5f3fc; }
    .category-badge.internet { background: #fdf2f8; color: #be185d; border-color: #fbcfe8; }

    .amount-val { font-size: 0.95rem; font-weight: 800; color: #0f172a; font-family: ui-monospace, monospace; }

    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px 12px;
      border-radius: 20px;
      font-weight: 700;
      font-size: 0.78rem;
      white-space: nowrap;
    }
    .status-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
    .status-badge.active { background: #fff0f6; color: #c20067; border: 1px solid #f8bbd0; }
    .status-badge.active .status-dot { background: #c20067; }
    .status-badge.paused { background: #fffbeb; color: #b45309; border: 1px solid #fde68a; }
    .status-badge.paused .status-dot { background: #d97706; }
    .status-badge.completed { background: #f0f9ff; color: #0369a1; border: 1px solid #bae6fd; }
    .status-badge.completed .status-dot { background: #0284c7; }
    .status-badge.cancelled { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
    .status-badge.cancelled .status-dot { background: #dc2626; }

    .text-right { text-align: right; }
    .action-buttons { display: flex; gap: 8px; justify-content: flex-end; align-items: center; }
    .btn-action {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      background: #ffffff;
      color: #334155;
      font-size: 0.8rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .btn-action svg { width: 14px; height: 14px; }
    .btn-detail:hover { background: #fff0f6; color: #c20067; border-color: #f8bbd0; }
    .btn-delete { padding: 6px 10px; }
    .btn-delete:hover { background: #fef2f2; color: #dc2626; border-color: #fecaca; }

    /* Empty Box */
    .empty-box {
      text-align: center;
      padding: 64px 24px;
      background: #ffffff;
      border-radius: 16px;
      border: 1px solid #e2e8f0;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .empty-icon-box {
      width: 64px; height: 64px; background: #f8fafc; border-radius: 50%;
      display: flex; align-items: center; justify-content: center; color: #94a3b8; margin-bottom: 16px; border: 1px solid #e2e8f0;
    }
    .empty-icon-box svg { width: 30px; height: 30px; }
    .empty-box h3 { font-size: 1.2rem; font-weight: 800; color: #0f172a; margin: 0 0 6px 0; }
    .empty-box p { color: #64748b; font-size: 0.9rem; margin: 0 0 20px 0; max-width: 440px; }

    /* Detail & Logs Slide-over Drawer */
    .modal-backdrop {
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(15, 23, 42, 0.35);
      backdrop-filter: blur(4px);
      z-index: 9999;
      display: flex; justify-content: flex-end; align-items: stretch;
    }
    .modal-content {
      background: #ffffff;
      width: 100%; max-width: 540px;
      height: 100vh;
      border-radius: 24px 0 0 24px;
      padding: 32px;
      box-shadow: -10px 0 40px rgba(0,0,0,0.12);
      border-left: 1px solid #e2e8f0;
      display: flex;
      flex-direction: column;
      overflow-y: auto;
      animation: slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    @keyframes slideInRight {
      from { transform: translateX(100%); }
      to { transform: translateX(0); }
    }
    .modal-header {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid #f1f5f9;
    }
    .modal-title-group { display: flex; align-items: center; gap: 12px; }
    .modal-title-group h3 { font-size: 1.15rem; font-weight: 800; color: #0f172a; margin: 0; }
    .btn-close {
      border: none; background: #f1f5f9; width: 32px; height: 32px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center; cursor: pointer; color: #64748b;
    }
    .btn-close svg { width: 16px; height: 16px; }

    .modal-body {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .detail-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 28px;
    }
    .detail-item { display: flex; flex-direction: column; gap: 4px; }
    .detail-item.full-width { grid-column: span 2; }
    .detail-label { font-size: 0.7rem; font-weight: 800; color: #94a3b8; letter-spacing: 0.05em; text-transform: uppercase; }
    .detail-value { font-size: 0.95rem; font-weight: 700; color: #0f172a; }
    .amount-highlight { font-size: 1.3rem; color: #c20067; font-family: ui-monospace, monospace; }
    .font-mono { font-family: ui-monospace, monospace; }
    .text-desc { color: #475569; font-weight: 500; }

    .modal-actions {
      display: flex;
      gap: 10px;
      justify-content: flex-end;
      padding-top: 20px;
      border-top: 1px solid #f1f5f9;
      flex-wrap: wrap;
    }
    .btn-modal {
      padding: 10px 16px;
      border-radius: 10px;
      font-weight: 700;
      font-size: 0.85rem;
      cursor: pointer;
      border: 1px solid #e2e8f0;
      background: #ffffff;
      color: #334155;
    }
    .btn-modal.btn-run { background: linear-gradient(135deg, #c20067 0%, #0072ce 100%); color: #ffffff; border-color: transparent; }
    .btn-modal.btn-run:hover { opacity: 0.9; }
    .btn-modal.btn-pause { background: #fffbeb; color: #b45309; border-color: #fde68a; }
    .btn-modal.btn-resume { background: #fff0f6; color: #c20067; border-color: #f8bbd0; }
    .btn-modal.btn-log { background: #f1f5f9; color: #0f172a; }
    .btn-modal.btn-delete { background: #fef2f2; color: #dc2626; border-color: #fecaca; }

    @media (max-width: 768px) {
      .detail-grid { grid-template-columns: 1fr; }
      .detail-item.full-width { grid-column: span 1; }
    }
  `]
})
export class RecurringPaymentListComponent implements OnInit {
  private service = inject(RecurringPaymentService);
  private router = inject(Router);

  payments = signal<RecurringPaymentResponse[]>([]);
  isLoading = signal<boolean>(true);
  errorMsg = signal<string>('');

  selectedItemForDetail = signal<RecurringPaymentResponse | null>(null);
  selectedItemForLogs = signal<RecurringPaymentResponse | null>(null);
  logs = signal<RecurringPaymentLogResponse[]>([]);
  isLogsLoading = signal<boolean>(false);

  ngOnInit(): void {
    this.loadData();
  }

  executeNow(item: RecurringPaymentResponse): void {
    this.service.executeNow(item.id).subscribe({
      next: (res) => {
        alert('Payment executed successfully!');
        this.loadData();
        if (this.selectedItemForDetail()) {
          this.selectedItemForDetail.set(res.data);
        }
      },
      error: (err) => {
        alert(err?.error?.message || 'Could not execute payment. Please check your wallet balance.');
      }
    });
  }

  loadData(): void {
    this.isLoading.set(true);
    this.service.getMyPayments().subscribe({
      next: (res) => {
        this.isLoading.set(false);
        this.payments.set(res.data || []);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMsg.set('Could not load recurring payment list.');
      }
    });
  }

  activeCount(): number {
    return this.payments().filter(p => p.status === 'ACTIVE').length;
  }

  pausedCount(): number {
    return this.payments().filter(p => p.status === 'PAUSED').length;
  }

  goToCreate(): void {
    this.router.navigate(['/recurring-payments/new']);
  }

  openDetail(item: RecurringPaymentResponse): void {
    this.selectedItemForDetail.set(item);
  }

  toggleStatus(item: RecurringPaymentResponse, newStatus: RecurringStatus): void {
    this.service.updateStatus(item.id, newStatus).subscribe({
      next: () => {
        this.loadData();
        if (this.selectedItemForDetail()) {
          this.selectedItemForDetail.update(curr => curr ? { ...curr, status: newStatus } : null);
        }
      },
      error: () => alert('Could not update schedule status.')
    });
  }

  deleteItem(item: RecurringPaymentResponse): void {
    if (confirm('Are you sure you want to delete this recurring payment?')) {
      this.service.delete(item.id).subscribe({
        next: () => {
          this.selectedItemForDetail.set(null);
          this.loadData();
        },
        error: () => alert('Could not delete schedule.')
      });
    }
  }

  openLogs(item: RecurringPaymentResponse): void {
    this.selectedItemForDetail.set(null);
    this.selectedItemForLogs.set(item);
    this.isLogsLoading.set(true);
    this.service.getLogs(item.id).subscribe({
      next: (res) => {
        this.isLogsLoading.set(false);
        this.logs.set(res.data || []);
      },
      error: () => {
        this.isLogsLoading.set(false);
      }
    });
  }

  getCategoryLabel(cat: string): string {
    switch (cat) {
      case 'TRANSFER': return 'Chuyển Tiền';
      case 'ELECTRICITY': return 'Electricity Bill';
      case 'WATER': return 'Water Bill';
      case 'INTERNET': return 'Internet Bill';
      default: return cat;
    }
  }

  getFrequencyLabel(freq: string): string {
    switch (freq) {
      case 'ONCE': return '1 Lần';
      case 'MINUTELY': return 'Every Minute (Test)';
      case 'DAILY': return 'Daily';
      case 'WEEKLY': return 'Weekly';
      case 'MONTHLY': return 'Monthly';
      default: return freq;
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'ACTIVE': return 'Active';
      case 'PAUSED': return 'Paused';
      case 'COMPLETED': return 'Completed';
      case 'CANCELLED': return 'Cancelled';
      default: return status;
    }
  }
}
