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
            <h1 class="page-title">Lịch Định Kỳ & Hóa Đơn Tự Động</h1>
            <p class="subtitle">Quản lý tự động chuyển tiền và thanh toán hóa đơn tiện ích định kỳ.</p>
          </div>
        </div>
        <button class="btn-create" (click)="goToCreate()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          <span>Tạo Lịch Mới</span>
        </button>
      </div>

      <!-- Stats Grid -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-top">
            <span class="stat-label">TỔNG LỊCH HẸN</span>
            <span class="stat-dot total-dot"></span>
          </div>
          <span class="stat-value">{{ payments().length }}</span>
        </div>
        <div class="stat-card active-card">
          <div class="stat-top">
            <span class="stat-label">ĐANG HOẠT ĐỘNG</span>
            <span class="stat-dot active-dot"></span>
          </div>
          <span class="stat-value">{{ activeCount() }}</span>
        </div>
        <div class="stat-card paused-card">
          <div class="stat-top">
            <span class="stat-label">ĐANG TẠM DỪNG</span>
            <span class="stat-dot paused-dot"></span>
          </div>
          <span class="stat-value">{{ pausedCount() }}</span>
        </div>
      </div>

      <!-- Loading / Error -->
      <div *ngIf="isLoading()" class="loading-box">
        <div class="spinner"></div>
        <span>Đang tải danh sách lịch định kỳ...</span>
      </div>

      <div *ngIf="errorMsg()" class="error-alert">
        {{ errorMsg() }}
      </div>

      <!-- Payments Table Card -->
      <div class="table-card" *ngIf="!isLoading() && payments().length > 0">
        <div class="table-responsive">
          <table class="pg-table">
            <thead>
              <tr>
                <th>Danh Mục</th>
                <th>Thông Tin Thanh Toán</th>
                <th>Số Tiền</th>
                <th>Chu Kỳ</th>
                <th>Lần Chạy Kế Tiếp</th>
                <th>Trạng Thái</th>
                <th class="text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let item of payments()">
                <td>
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
                        <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"></path>
                      </svg>
                    </span>
                    <span>{{ getCategoryLabel(item.category) }}</span>
                  </div>
                  <span class="desc-sub" *ngIf="item.description">{{ item.description }}</span>
                </td>
                <td>
                  <div *ngIf="item.category === 'TRANSFER'" class="account-info">
                    <span class="info-label">STK ĐÍCH</span>
                    <span class="info-val font-mono">{{ item.destAccountNumber || ('ID: ' + item.destAccountId) }}</span>
                  </div>
                  <div *ngIf="item.category !== 'TRANSFER'" class="bill-info">
                    <span class="info-label">{{ item.providerCode || 'NHÀ CUNG CẤP' }}</span>
                    <span class="info-val font-mono">Mã HĐ: {{ item.billCode || 'N/A' }}</span>
                  </div>
                </td>
                <td class="amount-col">
                  <span class="amount-val">{{ item.amount | currency:'VND':'symbol':'1.0-0' }}</span>
                </td>
                <td>
                  <span class="freq-tag">{{ getFrequencyLabel(item.frequency) }}</span>
                </td>
                <td>
                  <div class="time-col">
                    <span class="next-time font-mono">{{ item.nextRunAt | date:'dd/MM/yyyy HH:mm' }}</span>
                    <span class="last-time" *ngIf="item.lastRunAt">Đã chạy: {{ item.lastRunAt | date:'dd/MM HH:mm' }}</span>
                  </div>
                </td>
                <td>
                  <span class="status-badge" [ngClass]="item.status.toLowerCase()">
                    <span class="status-dot"></span>
                    {{ getStatusLabel(item.status) }}
                  </span>
                </td>
                <td class="text-right">
                  <div class="action-buttons">
                    <button
                      *ngIf="item.status === 'ACTIVE'"
                      class="btn-action btn-pause"
                      (click)="toggleStatus(item, 'PAUSED')"
                      title="Tạm dừng lịch"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="6" y="4" width="4" height="16"></rect>
                        <rect x="14" y="4" width="4" height="16"></rect>
                      </svg>
                      <span>Tạm Dừng</span>
                    </button>
                    <button
                      *ngIf="item.status === 'PAUSED'"
                      class="btn-action btn-resume"
                      (click)="toggleStatus(item, 'ACTIVE')"
                      title="Kích hoạt lại"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polygon points="5 3 19 12 5 21 5 3"></polygon>
                      </svg>
                      <span>Kích Hoạt</span>
                    </button>
                    <button class="btn-action btn-log" (click)="openLogs(item)" title="Xem nhật ký">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                      </svg>
                      <span>Nhật Ký</span>
                    </button>
                    <button class="btn-action btn-delete" (click)="deleteItem(item)" title="Xóa lịch">
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
        <h3>Chưa Có Lịch Định Kỳ Nào</h3>
        <p>Tự động hóa chuyển tiền hoặc thanh toán hóa đơn Điện, Nước, Internet dễ dàng.</p>
        <button class="btn-create" (click)="goToCreate()">+ Tạo Lịch Mới</button>
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
              <h3>Nhật Ký Thực Hiện #{{ selectedItemForLogs()?.id }}</h3>
            </div>
            <button class="btn-close" (click)="selectedItemForLogs.set(null)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div class="modal-body">
            <div *ngIf="isLogsLoading()" class="loading-box">Đang tải nhật ký...</div>
            <div *ngIf="!isLogsLoading() && logs().length === 0" class="empty-logs">
              Chưa có lượt chạy ngầm nào được thực hiện.
            </div>
            <table *ngIf="!isLogsLoading() && logs().length > 0" class="pg-table">
              <thead>
                <tr>
                  <th>Thời Gian</th>
                  <th>Mã GD</th>
                  <th>Trạng Thái</th>
                  <th>Chi Tiết</th>
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
      max-width: 1240px;
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
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      color: #059669;
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
      background: #059669;
      color: #ffffff;
      border: none;
      padding: 11px 20px;
      border-radius: 12px;
      font-weight: 700;
      font-size: 0.9rem;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(5, 150, 105, 0.2);
      transition: all 0.2s ease;
    }
    .btn-create svg { width: 18px; height: 18px; }
    .btn-create:hover {
      background: #047857;
      transform: translateY(-1px);
      box-shadow: 0 6px 16px rgba(5, 150, 105, 0.3);
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
    .stat-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .stat-label {
      font-size: 0.72rem;
      color: #64748b;
      font-weight: 800;
      letter-spacing: 0.05em;
    }
    .stat-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }
    .total-dot { background: #64748b; }
    .active-dot { background: #059669; }
    .paused-dot { background: #d97706; }
    .stat-value {
      font-size: 2rem;
      font-weight: 800;
      color: #0f172a;
      line-height: 1;
    }
    .active-card .stat-value { color: #059669; }
    .paused-card .stat-value { color: #d97706; }

    /* Table Card */
    .table-card {
      background: #ffffff;
      border-radius: 16px;
      border: 1px solid #e2e8f0;
      overflow: hidden;
      box-shadow: 0 4px 16px rgba(0,0,0,0.03);
    }
    .table-responsive { overflow-x: auto; }
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
    .pg-table tbody tr:last-child td { border-bottom: none; }
    .pg-table tbody tr:hover { background-color: #fafafa; }

    /* Category Badge */
    .category-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 14px;
      border-radius: 8px;
      font-weight: 700;
      font-size: 0.82rem;
      border: 1px solid transparent;
      white-space: nowrap;
    }
    .cat-icon { display: flex; align-items: center; justify-content: center; }
    .cat-icon svg { width: 14px; height: 14px; }
    .category-badge.transfer { background: #eff6ff; color: #1d4ed8; border-color: #bfdbfe; }
    .category-badge.electricity { background: #fffbeb; color: #b45309; border-color: #fde68a; }
    .category-badge.water { background: #ecfeff; color: #0e7490; border-color: #a5f3fc; }
    .category-badge.internet { background: #fdf2f8; color: #be185d; border-color: #fbcfe8; }
    .desc-sub { display: block; font-size: 0.78rem; color: #64748b; margin-top: 4px; white-space: normal; max-width: 200px; }

    /* Account / Bill Info */
    .account-info, .bill-info { display: flex; flex-direction: column; gap: 2px; }
    .info-label { font-size: 0.68rem; font-weight: 800; color: #94a3b8; text-transform: uppercase; white-space: nowrap; }
    .info-val { font-size: 0.85rem; font-weight: 700; color: #0f172a; white-space: nowrap; }
    .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }

    /* Amount */
    .amount-val { font-size: 0.95rem; font-weight: 800; color: #0f172a; font-family: ui-monospace, monospace; white-space: nowrap; }

    /* Frequency Tag */
    .freq-tag {
      display: inline-flex;
      align-items: center;
      white-space: nowrap;
      background: #f1f5f9;
      padding: 5px 12px;
      border-radius: 6px;
      font-weight: 600;
      font-size: 0.78rem;
      color: #475569;
      border: 1px solid #e2e8f0;
    }

    /* Time Col */
    .time-col { display: flex; flex-direction: column; gap: 2px; }
    .next-time { font-size: 0.85rem; font-weight: 700; color: #1e293b; white-space: nowrap; }
    .last-time { font-size: 0.75rem; color: #94a3b8; white-space: nowrap; }

    /* Status Badge */
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      border-radius: 20px;
      font-weight: 700;
      font-size: 0.78rem;
      white-space: nowrap;
    }
    .status-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
    .status-badge.active { background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; }
    .status-badge.active .status-dot { background: #059669; }
    .status-badge.paused { background: #fffbeb; color: #b45309; border: 1px solid #fde68a; }
    .status-badge.paused .status-dot { background: #d97706; }
    .status-badge.completed { background: #f0f9ff; color: #0369a1; border: 1px solid #bae6fd; }
    .status-badge.completed .status-dot { background: #0284c7; }
    .status-badge.cancelled { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
    .status-badge.cancelled .status-dot { background: #dc2626; }

    /* Action Buttons */
    .text-right { text-align: right; }
    .action-buttons { display: flex; gap: 8px; justify-content: flex-end; align-items: center; flex-wrap: nowrap; }
    .btn-action {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 7px 14px;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      background: #ffffff;
      color: #334155;
      font-size: 0.8rem;
      font-weight: 700;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.15s ease;
    }
    .btn-action svg { width: 14px; height: 14px; flex-shrink: 0; }
    .btn-pause:hover { background: #fffbeb; color: #b45309; border-color: #fde68a; }
    .btn-resume:hover { background: #ecfdf5; color: #047857; border-color: #a7f3d0; }
    .btn-log:hover { background: #f1f5f9; color: #0f172a; border-color: #cbd5e1; }
    .btn-delete { padding: 7px 10px; }
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
      width: 64px;
      height: 64px;
      background: #f8fafc;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #94a3b8;
      margin-bottom: 16px;
      border: 1px solid #e2e8f0;
    }
    .empty-icon-box svg { width: 30px; height: 30px; }
    .empty-box h3 { font-size: 1.2rem; font-weight: 800; color: #0f172a; margin: 0 0 6px 0; }
    .empty-box p { color: #64748b; font-size: 0.9rem; margin: 0 0 20px 0; max-width: 440px; }

    /* Modal */
    .modal-backdrop {
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(15, 23, 42, 0.4);
      backdrop-filter: blur(4px);
      z-index: 9999;
      display: flex; align-items: center; justify-content: center;
    }
    .modal-content {
      background: #ffffff;
      width: 90%; max-width: 720px;
      border-radius: 20px;
      padding: 24px;
      box-shadow: 0 25px 50px -12px rgba(0,0,0,0.15);
      border: 1px solid #e2e8f0;
    }
    .modal-header {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 20px;
      padding-bottom: 14px;
      border-bottom: 1px solid #f1f5f9;
    }
    .modal-title-group { display: flex; align-items: center; gap: 10px; }
    .modal-title-group svg { width: 20px; height: 20px; color: #059669; }
    .modal-title-group h3 { font-size: 1.1rem; font-weight: 800; color: #0f172a; margin: 0; }
    .btn-close {
      border: none; background: #f1f5f9; width: 32px; height: 32px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center; cursor: pointer; color: #64748b;
    }
    .btn-close svg { width: 16px; height: 16px; }
    .btn-close:hover { background: #e2e8f0; color: #0f172a; }
    .empty-logs { text-align: center; padding: 30px; color: #94a3b8; font-size: 0.9rem; }

    @media (max-width: 768px) {
      .header-banner { flex-direction: column; align-items: flex-start; }
      .stats-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class RecurringPaymentListComponent implements OnInit {
  private service = inject(RecurringPaymentService);
  private router = inject(Router);

  payments = signal<RecurringPaymentResponse[]>([]);
  isLoading = signal<boolean>(true);
  errorMsg = signal<string>('');

  selectedItemForLogs = signal<RecurringPaymentResponse | null>(null);
  logs = signal<RecurringPaymentLogResponse[]>([]);
  isLogsLoading = signal<boolean>(false);

  ngOnInit(): void {
    this.loadData();
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
        this.errorMsg.set('Không thể tải danh sách lịch định kỳ.');
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

  toggleStatus(item: RecurringPaymentResponse, newStatus: RecurringStatus): void {
    this.service.updateStatus(item.id, newStatus).subscribe({
      next: () => this.loadData(),
      error: () => alert('Lỗi khi đổi trạng thái lịch hẹn.')
    });
  }

  deleteItem(item: RecurringPaymentResponse): void {
    if (confirm('Bạn có chắc chắn muốn xóa lịch thanh toán định kỳ này?')) {
      this.service.delete(item.id).subscribe({
        next: () => this.loadData(),
        error: () => alert('Lỗi khi xóa lịch hẹn.')
      });
    }
  }

  openLogs(item: RecurringPaymentResponse): void {
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
      case 'ELECTRICITY': return 'Hóa Đơn Điện';
      case 'WATER': return 'Hóa Đơn Nước';
      case 'INTERNET': return 'Hóa Đơn Internet';
      default: return cat;
    }
  }

  getFrequencyLabel(freq: string): string {
    switch (freq) {
      case 'ONCE': return '1 Lần';
      case 'MINUTELY': return 'Mỗi Phút (Test)';
      case 'DAILY': return 'Hàng Ngày';
      case 'WEEKLY': return 'Hàng Tuần';
      case 'MONTHLY': return 'Hàng Tháng';
      default: return freq;
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'ACTIVE': return 'Đang Hoạt Động';
      case 'PAUSED': return 'Tạm Dừng';
      case 'COMPLETED': return 'Đã Hoàn Thành';
      case 'CANCELLED': return 'Đã Hủy';
      default: return status;
    }
  }
}
