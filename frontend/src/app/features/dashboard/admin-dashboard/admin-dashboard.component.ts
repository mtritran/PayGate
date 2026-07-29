import { Component, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MerchantService } from '../../../core/services/merchant.service';
import { Merchant } from '../../../core/models/merchant.model';
import { LedgerService } from '../../../core/services/ledger.service';
import { WebhookLogService } from '../../../core/services/webhook-log.service';
import { LoanService, LoanResponse } from '../../../core/services/loan.service';
import { NotificationService } from '../../../core/services/notification.service';

type AdminTab = 'overview' | 'merchants' | 'loans' | 'ledger' | 'webhooks';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    CurrencyPipe,
    DatePipe
  ],
  template: `
    <div class="admin-console fade-in-up">
      <!-- Top Operational Header -->
      <div class="admin-header">
        <div class="header-info">
          <div class="admin-badge">
            <span class="live-pulse"></span> SYSTEM ADMINISTRATION CONSOLE
          </div>
          <h1 class="console-title">Trung Tâm Quản Trị & Thống Kê PayGate</h1>
          <p class="console-subtitle">Giám sát dòng tiền hệ thống, quản lý tài khoản người dùng, duyệt Merchant & phê duyệt hồ sơ tín dụng.</p>
        </div>
        <div class="header-actions">
          <button class="btn-refresh" (click)="loadMetrics()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M23 4v6h-6M1 20v-6h6"/>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
            <span>Cập Nhật Realtime</span>
          </button>
          <a routerLink="/admin/ledger" class="btn-ledger-audit pulse-glow">
            ⚖️ Kiểm Toán Sổ Cái ↗
          </a>
        </div>
      </div>

      <!-- 4 Visual KPI Stat Cards -->
      <div class="kpi-grid stagger-children">
        <div class="kpi-card hover-lift pink">
          <div class="kpi-top">
            <span class="kpi-label">MERCHANT DOANH NGHIỆP</span>
            <div class="kpi-icon">🏢</div>
          </div>
          <div class="kpi-val">{{ totalMerchants }}</div>
          <div class="kpi-sub success">
            <span>{{ pendingMerchantsCount }} doanh nghiệp chờ duyệt</span>
          </div>
        </div>

        <div class="kpi-card hover-lift blue">
          <div class="kpi-top">
            <span class="kpi-label">HỒ SƠ VAY CẦN DUYỆT</span>
            <div class="kpi-icon">💵</div>
          </div>
          <div class="kpi-val text-amber">{{ pendingLoansCount }}</div>
          <div class="kpi-sub warning">
            <span>{{ pendingLoansAmount | currency:'VND':'symbol':'1.0-0' }} chờ giải ngân</span>
          </div>
        </div>

        <div class="kpi-card hover-lift emerald">
          <div class="kpi-top">
            <span class="kpi-label">ĐỐI SOÁT SỔ CÁI KÉP</span>
            <div class="kpi-icon">⚖️</div>
          </div>
          <div class="kpi-val" [class.text-emerald]="ledgerBalanced" [class.text-rose]="!ledgerBalanced">
            {{ ledgerBalanced ? 'BALANCED' : 'UNBALANCED' }}
          </div>
          <div class="kpi-sub success">
            <span>Debit == Credit (Toàn vẹn 100%)</span>
          </div>
        </div>

        <div class="kpi-card hover-lift purple">
          <div class="kpi-top">
            <span class="kpi-label">TRẠNG THÁI WEBHOOKS</span>
            <div class="kpi-icon">⚡</div>
          </div>
          <div class="kpi-val text-purple">{{ pendingWebhooks }}</div>
          <div class="kpi-sub muted">
            <span>Outbound HTTP Callbacks</span>
          </div>
        </div>
      </div>

      <!-- Management Navigation Tabs -->
      <div class="admin-nav-tabs">
        <button class="nav-tab-btn" [class.active]="activeTab === 'overview'" (click)="activeTab = 'overview'">
          📊 Thống Kê Tổng Quan
        </button>
        <button class="nav-tab-btn" [class.active]="activeTab === 'merchants'" (click)="activeTab = 'merchants'">
          🏢 Quản Lý Merchant ({{ pendingMerchantsCount }})
        </button>
        <button class="nav-tab-btn" [class.active]="activeTab === 'loans'" (click)="activeTab = 'loans'">
          💵 Duyệt Vay Tiêu Dùng ({{ pendingLoansCount }})
        </button>
        <button class="nav-tab-btn" [class.active]="activeTab === 'ledger'" (click)="activeTab = 'ledger'">
          ⚖️ Kiểm Toán Sổ Cái
        </button>
      </div>

      <!-- TAB 1: OVERVIEW & SYSTEM MONITORING -->
      <div class="tab-pane" *ngIf="activeTab === 'overview'">
        <div class="overview-grid">
          <!-- Pending Approvals Quick Panel -->
          <div class="admin-card">
            <div class="card-hdr">
              <h3>⚠️ Cần Xử Lý Ngay (Action Items)</h3>
              <span class="badge-count">{{ pendingLoansCount + pendingMerchantsCount }} mục</span>
            </div>
            <div class="action-items-list">
              <div class="action-item" *ngFor="let loan of pendingLoansList.slice(0, 3)">
                <div class="ai-icon loan">💵</div>
                <div class="ai-info">
                  <strong>Duyệt khoản vay #{{ loan.loanRef }}</strong>
                  <span>Số tiền: {{ loan.amount | currency:'VND':'symbol':'1.0-0' }} • Kỳ hạn {{ loan.termMonths }} tháng</span>
                </div>
                <button class="btn-quick-act approve" (click)="approveLoan(loan.id)">Duyệt Vay</button>
              </div>

              <div class="action-item" *ngFor="let m of pendingMerchantsList.slice(0, 3)">
                <div class="ai-icon merchant">🏢</div>
                <div class="ai-info">
                  <strong>Merchant: {{ m.merchantName }}</strong>
                  <span>Mã: {{ m.merchantCode }} • Email: {{ m.contactEmail }}</span>
                </div>
                <button class="btn-quick-act approve" (click)="approveMerchant(m.id)">Duyệt Merchant</button>
              </div>

              <div class="empty-action-msg" *ngIf="pendingLoansCount === 0 && pendingMerchantsCount === 0">
                🎉 Tất cả hồ sơ và Merchant đã được phê duyệt xử lý hoàn tất!
              </div>
            </div>
          </div>

          <!-- Direct Operational Modules Grid -->
          <div class="admin-card">
            <div class="card-hdr">
              <h3>🛠️ Module Quản Trị Hệ Thống</h3>
            </div>
            <div class="modules-quick-grid">
              <a routerLink="/admin/merchants" class="module-tile">
                <div class="mod-ico pink">🏢</div>
                <div class="mod-info">
                  <strong>Merchant Management</strong>
                  <span>Phê duyệt đối tác, cấp API Key & Cấu hình Webhook</span>
                </div>
              </a>

              <a routerLink="/admin/ledger" class="module-tile">
                <div class="mod-ico blue">⚖️</div>
                <div class="mod-info">
                  <strong>Double-Entry Ledger Audit</strong>
                  <span>Đối soát dòng tiền giao dịch, kiểm tra số dư bút toán</span>
                </div>
              </a>

              <a routerLink="/admin/vouchers" class="module-tile">
                <div class="mod-ico yellow">🎁</div>
                <div class="mod-info">
                  <strong>Voucher & Ưu Đãi</strong>
                  <span>Tạo mã giảm giá, khuyến mãi cho toàn bộ người dùng</span>
                </div>
              </a>

              <a routerLink="/admin/webhooks" class="module-tile">
                <div class="mod-ico purple">⚡</div>
                <div class="mod-info">
                  <strong>Webhook Logs & Retry</strong>
                  <span>Nhật ký gọi callback, retry giao dịch tự động</span>
                </div>
              </a>
            </div>
          </div>
        </div>
      </div>

      <!-- TAB 2: MERCHANTS MANAGEMENT -->
      <div class="tab-pane" *ngIf="activeTab === 'merchants'">
        <div class="admin-card">
          <div class="card-hdr">
            <h3>🏢 Danh Sách Merchant Doanh Nghiệp ({{ merchantsList.length }})</h3>
            <a routerLink="/admin/merchants" class="link-more">Xem Quản Lý Chi Tiết ↗</a>
          </div>
          <div class="table-responsive">
            <table class="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Doanh Nghiệp</th>
                  <th>Mã Merchant</th>
                  <th>Contact Email</th>
                  <th>Ví Merchant</th>
                  <th>Trạng Thái</th>
                  <th>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let m of merchantsList">
                  <td class="font-mono">#{{ m.id }}</td>
                  <td><strong>{{ m.merchantName }}</strong></td>
                  <td><code class="code-pill">{{ m.merchantCode }}</code></td>
                  <td>{{ m.contactEmail }}</td>
                  <td><span class="badge-wallet">PAYGATE-MERCHANT-{{ m.id }}</span></td>
                  <td>
                    <span class="status-chip" [class.active]="m.status === 'ACTIVE'" [class.pending]="m.status === 'PENDING'">
                      {{ m.status }}
                    </span>
                  </td>
                  <td>
                    <div class="act-btns">
                      <button *ngIf="m.status === 'PENDING'" class="btn-sm approve" (click)="approveMerchant(m.id)">Phê Duyệt</button>
                      <button *ngIf="m.status === 'ACTIVE'" class="btn-sm reject" (click)="rejectMerchant(m.id)">Khóa</button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- TAB 3: LOANS APPROVAL WORKSPACE -->
      <div class="tab-pane" *ngIf="activeTab === 'loans'">
        <div class="admin-card">
          <div class="card-hdr">
            <h3>💵 Phê Duyệt Vay Tiêu Dùng ({{ loansList.length }})</h3>
          </div>
          <div class="table-responsive">
            <table class="admin-table">
              <thead>
                <tr>
                  <th>Mã Hồ Sơ</th>
                  <th>Số Tiền Vay</th>
                  <th>Kỳ Hạn</th>
                  <th>Lãi Suất</th>
                  <th>Trả Mỗi Kỳ</th>
                  <th>Trạng Thái</th>
                  <th>Hành Động</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let loan of loansList">
                  <td class="font-mono"><strong>{{ loan.loanRef }}</strong></td>
                  <td class="font-bold text-pink">{{ loan.amount | currency:'VND':'symbol':'1.0-0' }}</td>
                  <td>{{ loan.termMonths }} tháng</td>
                  <td>{{ loan.interestRate }}%/năm</td>
                  <td>{{ loan.monthlyAmount | currency:'VND':'symbol':'1.0-0' }}</td>
                  <td>
                    <span class="status-chip" [class.active]="loan.status === 'ACTIVE' || loan.status === 'PAID_OFF'" [class.pending]="loan.status === 'PENDING_APPROVAL'" [class.rejected]="loan.status === 'REJECTED'">
                      {{ loan.status }}
                    </span>
                  </td>
                  <td>
                    <div class="act-btns" *ngIf="loan.status === 'PENDING_APPROVAL'">
                      <button class="btn-sm approve" (click)="approveLoan(loan.id)">Duyệt Giải Ngân</button>
                      <button class="btn-sm reject" (click)="rejectLoan(loan.id)">Từ Chối</button>
                    </div>
                    <span *ngIf="loan.status !== 'PENDING_APPROVAL'" class="text-muted text-xs">Đã xử lý</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- TAB 4: LEDGER & AUDIT -->
      <div class="tab-pane" *ngIf="activeTab === 'ledger'">
        <div class="admin-card">
          <div class="card-hdr">
            <h3>⚖️ Kiểm Toán Sổ Cái Kép (Double-Entry Ledger Integrity)</h3>
            <a routerLink="/admin/ledger" class="btn-primary-sm">Truy Cập Console Sổ Cái ↗</a>
          </div>
          <div class="ledger-summary-box">
            <div class="ls-item">
              <span>Trạng Thái Cân Bằng:</span>
              <strong [class.text-emerald]="ledgerBalanced" [class.text-rose]="!ledgerBalanced">
                {{ ledgerBalanced ? '✓ DEBIT == CREDIT (CÂN BẰNG TỐT)' : '❌ LỖI BÚT TOÁN' }}
              </strong>
            </div>
            <p class="ls-desc">Hệ thống tự động thực hiện kiểm toán đối soát giữa tài khoản tổng và các khoản nợ/có của toàn bộ ví người dùng theo thời gian thực.</p>
          </div>
        </div>
      </div>

    </div>
  `,
  styles: [`
    .fade-in-up { animation: fadeInUp 0.4s ease-out both; }

    .admin-console { display: flex; flex-direction: column; gap: 24px; font-family: 'Inter', system-ui, sans-serif; color: #0d2b5c; }

    /* Top Operational Header */
    .admin-header {
      background: #ffffff; border: 1.5px solid #f3d6e5; border-radius: 24px;
      padding: 32px; display: flex; justify-content: space-between; align-items: center;
      box-shadow: 0 10px 30px rgba(194, 0, 103, 0.05);
    }
    .admin-badge {
      display: inline-flex; align-items: center; gap: 8px; font-size: 0.72rem; font-weight: 900;
      color: #c20067; background: #fff0f6; border: 1px solid #f8bbd0; padding: 4px 12px; border-radius: 20px;
      letter-spacing: 0.06em; margin-bottom: 8px;
    }
    .live-pulse { width: 8px; height: 8px; border-radius: 50%; background: #10b981; box-shadow: 0 0 8px #10b981; }
    .console-title { font-size: 1.85rem; font-weight: 900; margin: 0 0 4px; color: #0d2b5c; letter-spacing: -0.02em; }
    .console-subtitle { font-size: 0.9rem; color: #64748b; margin: 0; }

    .header-actions { display: flex; gap: 12px; align-items: center; }
    .btn-refresh {
      background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 10px 18px;
      font-weight: 800; font-size: 0.88rem; color: #475569; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: all 0.15s;
    }
    .btn-refresh:hover { background: #f8fafc; border-color: #cbd5e1; color: #0f172a; }
    .btn-ledger-audit {
      background: linear-gradient(135deg, #c20067 0%, #0072ce 100%); color: #ffffff;
      padding: 12px 22px; border-radius: 12px; font-weight: 800; font-size: 0.92rem; text-decoration: none;
      box-shadow: 0 6px 20px rgba(194,0,103,0.25); transition: all 0.2s;
    }
    .btn-ledger-audit:hover { transform: translateY(-2px); box-shadow: 0 10px 26px rgba(194,0,103,0.35); }

    /* 4 Visual KPI Stat Cards */
    .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px; }
    .kpi-card {
      background: #ffffff; border: 1.5px solid #f3d6e5; border-radius: 20px; padding: 22px;
      box-shadow: 0 4px 20px rgba(194,0,103,0.04); display: flex; flex-direction: column; gap: 8px; transition: all 0.2s;
    }
    .kpi-top { display: flex; justify-content: space-between; align-items: center; }
    .kpi-label { font-size: 0.72rem; font-weight: 900; color: #64748b; letter-spacing: 0.04em; }
    .kpi-icon { font-size: 24px; width: 42px; height: 42px; border-radius: 12px; background: #fff0f6; display: flex; align-items: center; justify-content: center; }
    .kpi-val { font-size: 1.8rem; font-weight: 900; color: #0d2b5c; letter-spacing: -0.02em; }
    .kpi-sub { font-size: 0.78rem; font-weight: 700; color: #64748b; }

    /* Navigation Tabs */
    .admin-nav-tabs { display: flex; gap: 10px; border-bottom: 2px solid #f3d6e5; padding-bottom: 2px; }
    .nav-tab-btn {
      padding: 12px 22px; background: transparent; border: none; font-size: 0.92rem; font-weight: 800;
      color: #64748b; cursor: pointer; border-bottom: 3px solid transparent; transition: all 0.2s; border-radius: 10px 10px 0 0;
    }
    .nav-tab-btn.active { color: #c20067; border-bottom-color: #c20067; background: #ffffff; }
    .nav-tab-btn:hover:not(.active) { color: #0d2b5c; background: rgba(255,255,255,0.6); }

    /* Admin Cards & Panes */
    .admin-card { background: #ffffff; border: 1.5px solid #f3d6e5; border-radius: 20px; padding: 24px; box-shadow: 0 4px 20px rgba(194,0,103,0.04); }
    .card-hdr { display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; }
    .card-hdr h3 { margin: 0; font-size: 1.15rem; font-weight: 900; color: #0d2b5c; }
    .badge-count { background: #fff0f6; color: #c20067; font-size: 0.75rem; font-weight: 900; padding: 4px 10px; border-radius: 12px; border: 1px solid #f8bbd0; }

    .overview-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    .action-items-list { display: flex; flex-direction: column; gap: 12px; }
    .action-item { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px; background: #fffafc; border: 1px solid #f3d6e5; border-radius: 14px; }
    .ai-icon { width: 38px; height: 38px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0; }
    .ai-icon.loan { background: #fff0f6; }
    .ai-icon.merchant { background: #eef6ff; }
    .ai-info { display: flex; flex-direction: column; gap: 2px; flex: 1; }
    .ai-info strong { font-size: 0.88rem; color: #0d2b5c; }
    .ai-info span { font-size: 0.78rem; color: #64748b; }
    .btn-quick-act { padding: 6px 14px; border-radius: 8px; font-size: 0.78rem; font-weight: 800; border: none; cursor: pointer; }
    .btn-quick-act.approve { background: #c20067; color: #ffffff; }
    .btn-quick-act.approve:hover { background: #a00055; }

    .modules-quick-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
    .module-tile { display: flex; gap: 12px; align-items: flex-start; padding: 16px; background: #fffafc; border: 1px solid #f3d6e5; border-radius: 14px; text-decoration: none; transition: all 0.2s; }
    .module-tile:hover { border-color: #f8bbd0; transform: translateY(-2px); box-shadow: 0 6px 16px rgba(194,0,103,0.08); }
    .mod-ico { width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0; }
    .mod-ico.pink { background: #fff0f6; }
    .mod-ico.blue { background: #eef6ff; }
    .mod-ico.yellow { background: #fffbeb; }
    .mod-ico.purple { background: #f3e8ff; }
    .mod-info strong { font-size: 0.9rem; color: #0d2b5c; display: block; margin-bottom: 2px; }
    .mod-info span { font-size: 0.78rem; color: #64748b; line-height: 1.4; }

    /* Tables */
    .table-responsive { overflow-x: auto; border: 1px solid #f3d6e5; border-radius: 14px; }
    .admin-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 0.88rem; }
    .admin-table th { background: #fff0f6; padding: 12px 16px; font-weight: 800; color: #0d2b5c; border-bottom: 1.5px solid #f3d6e5; }
    .admin-table td { padding: 14px 16px; border-bottom: 1px solid #fce4ec; color: #334155; }
    .code-pill { background: #fff0f6; color: #c20067; padding: 2px 6px; border-radius: 6px; font-family: monospace; font-weight: 700; }
    .badge-wallet { background: #eef6ff; color: #0072ce; font-size: 0.75rem; font-weight: 800; padding: 2px 8px; border-radius: 6px; }
    .status-chip { font-size: 0.72rem; font-weight: 900; padding: 3px 10px; border-radius: 12px; text-transform: uppercase; }
    .status-chip.active { background: #dcfce7; color: #047857; }
    .status-chip.pending { background: #fef3c7; color: #b45309; }
    .status-chip.rejected { background: #fee2e2; color: #b91c1c; }

    .act-btns { display: flex; gap: 6px; }
    .btn-sm { padding: 5px 10px; border-radius: 6px; font-size: 0.75rem; font-weight: 800; border: none; cursor: pointer; }
    .btn-sm.approve { background: #c20067; color: #fff; }
    .btn-sm.reject { background: #ef4444; color: #fff; }

    .ledger-summary-box { background: #fffafc; border: 1.5px solid #f3d6e5; border-radius: 16px; padding: 24px; }
    .ls-item { font-size: 1.1rem; display: flex; gap: 10px; align-items: center; }
    .ls-desc { font-size: 0.88rem; color: #64748b; margin: 10px 0 0; line-height: 1.5; }

    .text-emerald { color: #10b981 !important; }
    .text-amber { color: #d97706 !important; }
    .text-rose { color: #e11d48 !important; }
    .text-pink { color: #c20067 !important; }
    .text-purple { color: #7c3aed !important; }
    .font-mono { font-family: monospace; }
    .font-bold { font-weight: 800; }
    .link-more { color: #c20067; font-weight: 800; text-decoration: none; font-size: 0.88rem; }
    .empty-action-msg { font-size: 0.88rem; color: #10b981; font-weight: 800; text-align: center; padding: 20px; }

    @media (max-width: 1080px) {
      .kpi-grid { grid-template-columns: repeat(2, 1fr); }
      .overview-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class AdminDashboardComponent implements OnInit {
  activeTab: AdminTab = 'overview';

  totalMerchants = 0;
  pendingMerchantsCount = 0;
  pendingLoansCount = 0;
  pendingLoansAmount = 0;
  ledgerBalanced = true;
  pendingWebhooks = 0;
  loading = true;

  merchantsList: Merchant[] = [];
  pendingMerchantsList: Merchant[] = [];
  loansList: LoanResponse[] = [];
  pendingLoansList: LoanResponse[] = [];

  constructor(
    private merchantService: MerchantService,
    private ledgerService: LedgerService,
    private webhookLogService: WebhookLogService,
    private loanService: LoanService,
    private notification: NotificationService
  ) {}

  ngOnInit(): void {
    this.loadMetrics();
  }

  loadMetrics(): void {
    this.loading = true;

    // 1. Fetch Merchants
    this.merchantService.getAll(0, 50).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.merchantsList = res.data.content;
          this.totalMerchants = res.data.totalElements;
          this.pendingMerchantsList = this.merchantsList.filter(m => m.status === 'PENDING');
          this.pendingMerchantsCount = this.pendingMerchantsList.length;
        }
      }
    });

    // 2. Fetch Loans for Admin
    this.loanService.getAllLoansForAdmin(0, 50).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.loansList = res.data.content;
          this.pendingLoansList = this.loansList.filter(l => l.status === 'PENDING_APPROVAL');
          this.pendingLoansCount = this.pendingLoansList.length;
          this.pendingLoansAmount = this.pendingLoansList.reduce((sum, l) => sum + (l.amount || 0), 0);
        }
      }
    });

    // 3. Ledger Audit Status
    this.ledgerService.verifyLedger().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.ledgerBalanced = res.data.balanced;
        }
      }
    });

    // 4. Webhooks
    this.webhookLogService.getLogs(0, 1, 'RETRYING').subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.pendingWebhooks = res.data.totalElements;
        }
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  approveMerchant(id: number): void {
    this.merchantService.approveMerchant(id).subscribe({
      next: (res) => {
        if (res.success) {
          this.notification.success('Đã phê duyệt Merchant thành công!');
          this.loadMetrics();
        }
      }
    });
  }

  rejectMerchant(id: number): void {
    this.merchantService.rejectMerchant(id).subscribe({
      next: (res) => {
        if (res.success) {
          this.notification.success('Đã vô hiệu hóa Merchant!');
          this.loadMetrics();
        }
      }
    });
  }

  approveLoan(id: number): void {
    this.loanService.approveLoan(id, 'Đã phê duyệt qua Admin Console').subscribe({
      next: (res) => {
        if (res.success) {
          this.notification.success('Đã duyệt giải ngân khoản vay thành công!');
          this.loadMetrics();
        }
      }
    });
  }

  rejectLoan(id: number): void {
    this.loanService.rejectLoan(id, 'Hồ sơ vay chưa đủ điều kiện').subscribe({
      next: (res) => {
        if (res.success) {
          this.notification.success('Đã từ chối khoản vay.');
          this.loadMetrics();
        }
      }
    });
  }
}
