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
      <div class="header-banner">
        <div>
          <h1 class="page-title">📅 Lịch Định Kỳ & Hóa Đơn Tự Động</h1>
          <p class="subtitle">Quản lý các lịch chuyển tiền định kỳ và thanh toán hóa đơn điện/nước/internet tự động.</p>
        </div>
        <button class="btn-create" (click)="goToCreate()">
          <span>+ Tạo Lịch Mới</span>
        </button>
      </div>

      <!-- Stats Cards -->
      <div class="stats-grid">
        <div class="stat-card">
          <span class="stat-label">Tổng Lịch Hẹn</span>
          <span class="stat-value">{{ payments().length }}</span>
        </div>
        <div class="stat-card active-card">
          <span class="stat-label">Đang Hoạt Động</span>
          <span class="stat-value">{{ activeCount() }}</span>
        </div>
        <div class="stat-card paused-card">
          <span class="stat-label">Đang Tạm Dừng</span>
          <span class="stat-value">{{ pausedCount() }}</span>
        </div>
      </div>

      <!-- Loading / Error -->
      <div *ngIf="isLoading()" class="loading-box">
        <div class="spinner"></div>
        <span>Đang tải dữ liệu...</span>
      </div>

      <div *ngIf="errorMsg()" class="error-alert">
        {{ errorMsg() }}
      </div>

      <!-- Payments Table -->
      <div class="table-card" *ngIf="!isLoading() && payments().length > 0">
        <div class="table-responsive">
          <table class="pg-table">
            <thead>
              <tr>
                <th>Loại & Danh Mục</th>
                <th>Thông tin / Số Tài Khoản</th>
                <th>Số Tiền</th>
                <th>Chu Kỳ</th>
                <th>Lần Chạy Kế Tiếp</th>
                <th>Trạng Thái</th>
                <th>Hành Động</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let item of payments()">
                <td>
                  <div class="category-badge" [ngClass]="item.category.toLowerCase()">
                    <span class="cat-icon">{{ getCategoryIcon(item.category) }}</span>
                    <span>{{ getCategoryLabel(item.category) }}</span>
                  </div>
                  <span class="desc-sub" *ngIf="item.description">{{ item.description }}</span>
                </td>
                <td>
                  <div *ngIf="item.category === 'TRANSFER'">
                    <strong>STK: {{ item.destAccountNumber || ('ID: ' + item.destAccountId) }}</strong>
                  </div>
                  <div *ngIf="item.category !== 'TRANSFER'">
                    <span>Nhà cung cấp: <strong>{{ item.providerCode || 'EVN / VNPT' }}</strong></span>
                    <br />
                    <small>Mã HĐ: <strong>{{ item.billCode || 'N/A' }}</strong></small>
                  </div>
                </td>
                <td class="amount-col">
                  <strong>{{ item.amount | currency:'VND':'symbol':'1.0-0' }}</strong>
                </td>
                <td>
                  <span class="freq-tag">{{ getFrequencyLabel(item.frequency) }}</span>
                </td>
                <td>
                  <span>{{ item.nextRunAt | date:'dd/MM/yyyy HH:mm' }}</span>
                  <br />
                  <small class="text-muted" *ngIf="item.lastRunAt">Chạy gần nhất: {{ item.lastRunAt | date:'dd/MM HH:mm' }}</small>
                </td>
                <td>
                  <span class="status-badge" [ngClass]="item.status.toLowerCase()">
                    {{ getStatusLabel(item.status) }}
                  </span>
                </td>
                <td>
                  <div class="action-buttons">
                    <button
                      *ngIf="item.status === 'ACTIVE'"
                      class="btn-sm btn-warning"
                      (click)="toggleStatus(item, 'PAUSED')"
                      title="Tạm dừng"
                    >
                      ⏸ Tạm Dừng
                    </button>
                    <button
                      *ngIf="item.status === 'PAUSED'"
                      class="btn-sm btn-success"
                      (click)="toggleStatus(item, 'ACTIVE')"
                      title="Bật lại"
                    >
                      ▶ Kích Hoạt
                    </button>
                    <button class="btn-sm btn-info" (click)="openLogs(item)" title="Xem nhật ký">
                      📋 Nhật Ký
                    </button>
                    <button class="btn-sm btn-danger" (click)="deleteItem(item)" title="Xóa lịch">
                      🗑 Xóa
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
        <div class="empty-icon">📅</div>
        <h3>Chưa có lịch hẹn thanh toán nào</h3>
        <p>Bạn có thể đặt lịch chuyển tiền tự động hoặc cài đặt thanh toán hóa đơn Điện, Nước, Internet hàng tháng.</p>
        <button class="btn-create" (click)="goToCreate()">+ Đặt Lịch Ngay</button>
      </div>

      <!-- Logs Modal -->
      <div class="modal-backdrop" *ngIf="selectedItemForLogs()">
        <div class="modal-content fade-in-up">
          <div class="modal-header">
            <h3>📋 Nhật Ký Thực Hiện Lịch #{{ selectedItemForLogs()?.id }}</h3>
            <button class="btn-close" (click)="selectedItemForLogs.set(null)">✕</button>
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
                  <th>Chi Tiết Message</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let l of logs()">
                  <td>{{ l.executedAt | date:'dd/MM/yyyy HH:mm:ss' }}</td>
                  <td><code>{{ l.transactionRef || 'N/A' }}</code></td>
                  <td>
                    <span class="status-badge" [ngClass]="l.status === 'SUCCESS' ? 'completed' : 'failed'">
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
      padding: 24px;
      max-width: 1200px;
      margin: 0 auto;
    }
    .header-banner {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }
    .page-title {
      font-size: 1.6rem;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 4px;
    }
    .subtitle {
      color: #64748b;
      font-size: 0.95rem;
    }
    .btn-create {
      background: linear-gradient(135deg, #059669 0%, #047857 100%);
      color: #fff;
      border: none;
      padding: 12px 22px;
      border-radius: 12px;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(5, 150, 105, 0.3);
      transition: all 0.2s ease;
    }
    .btn-create:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(5, 150, 105, 0.4);
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      margin-bottom: 24px;
    }
    .stat-card {
      background: #ffffff;
      padding: 20px;
      border-radius: 16px;
      border: 1px solid #e2e8f0;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .stat-label { font-size: 0.85rem; color: #64748b; font-weight: 600; }
    .stat-value { font-size: 1.8rem; font-weight: 800; color: #0f172a; }
    .active-card .stat-value { color: #059669; }
    .paused-card .stat-value { color: #d97706; }

    .table-card {
      background: #ffffff;
      border-radius: 16px;
      border: 1px solid #e2e8f0;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0,0,0,0.03);
    }
    .table-responsive { overflow-x: auto; }
    .pg-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }
    .pg-table th {
      background: #f8fafc;
      padding: 14px 18px;
      font-size: 0.82rem;
      color: #475569;
      font-weight: 700;
      text-transform: uppercase;
      border-bottom: 1px solid #e2e8f0;
    }
    .pg-table td {
      padding: 16px 18px;
      border-bottom: 1px solid #f1f5f9;
      font-size: 0.92rem;
      vertical-align: middle;
    }
    .category-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: 20px;
      font-weight: 700;
      font-size: 0.85rem;
    }
    .category-badge.transfer { background: #e0f2fe; color: #0369a1; }
    .category-badge.electricity { background: #fef3c7; color: #b45309; }
    .category-badge.water { background: #e0e7ff; color: #4338ca; }
    .category-badge.internet { background: #fce7f3; color: #be185d; }
    .desc-sub { display: block; font-size: 0.8rem; color: #64748b; margin-top: 4px; }
    .freq-tag {
      background: #f1f5f9;
      padding: 4px 10px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 0.82rem;
      color: #334155;
    }
    .status-badge {
      padding: 4px 10px;
      border-radius: 12px;
      font-weight: 700;
      font-size: 0.8rem;
    }
    .status-badge.active { background: #dcfce7; color: #15803d; }
    .status-badge.paused { background: #fef3c7; color: #b45309; }
    .status-badge.completed { background: #e0f2fe; color: #0369a1; }
    .status-badge.cancelled { background: #fee2e2; color: #b91c1c; }
    .status-badge.failed { background: #fee2e2; color: #b91c1c; }

    .action-buttons { display: flex; gap: 6px; flex-wrap: wrap; }
    .btn-sm {
      padding: 6px 12px;
      border-radius: 8px;
      border: none;
      font-size: 0.8rem;
      font-weight: 700;
      cursor: pointer;
    }
    .btn-warning { background: #fef3c7; color: #b45309; }
    .btn-success { background: #dcfce7; color: #15803d; }
    .btn-info { background: #f1f5f9; color: #475569; }
    .btn-danger { background: #fee2e2; color: #b91c1c; }

    .empty-box {
      text-align: center;
      padding: 60px 20px;
      background: #fff;
      border-radius: 16px;
      border: 1px solid #e2e8f0;
    }
    .empty-icon { font-size: 3rem; margin-bottom: 12px; }

    .modal-backdrop {
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.4);
      z-index: 9999;
      display: flex; align-items: center; justify-content: center;
    }
    .modal-content {
      background: #fff;
      width: 90%; max-width: 700px;
      border-radius: 16px;
      padding: 24px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.2);
    }
    .modal-header {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 16px;
    }
    .btn-close { border: none; background: none; font-size: 1.2rem; cursor: pointer; }
    .loading-box { padding: 20px; text-align: center; color: #64748b; }
    .error-alert { padding: 14px; background: #fee2e2; color: #b91c1c; border-radius: 12px; margin-bottom: 16px; }
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

  getCategoryIcon(cat: string): string {
    switch (cat) {
      case 'TRANSFER': return '💸';
      case 'ELECTRICITY': return '⚡';
      case 'WATER': return '💧';
      case 'INTERNET': return '🌐';
      default: return '📅';
    }
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
