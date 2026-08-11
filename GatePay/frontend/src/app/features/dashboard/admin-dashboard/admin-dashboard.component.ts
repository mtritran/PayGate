import { Component, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MerchantService } from '../../../core/services/merchant.service';
import { Merchant } from '../../../core/models/merchant.model';
import { LedgerService } from '../../../core/services/ledger.service';
import { WebhookLogService } from '../../../core/services/webhook-log.service';
import { LoanService, LoanResponse } from '../../../core/services/loan.service';
import { TransactionService } from '../../../core/services/transaction.service';
import { TransactionResponse } from '../../../core/models/transaction.model';
import { NotificationService } from '../../../core/services/notification.service';
import { User, UserService } from '../../users/user.service';

type AdminTab = 'overview' | 'users' | 'merchants' | 'loans' | 'transactions' | 'ledger' | 'vouchers' | 'webhooks';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, CurrencyPipe, DatePipe],
  template: `
    <div class="admin-console fade-in-up">
      <section class="admin-header">
        <div>
          <div class="admin-badge"><span class="live-pulse"></span> SYSTEM OPERATIONS</div>
          <h1 class="console-title">PayGate Admin Console</h1>
          <p class="console-subtitle">Monitor platform health, review risk queues, manage users, merchants, vouchers, ledger integrity, and webhook delivery.</p>
        </div>
        <div class="header-actions">
          <button class="btn-secondary" (click)="loadMetrics()">Refresh</button>
          <a routerLink="/admin/ledger" class="btn-primary">Open Ledger Audit</a>
        </div>
      </section>

      <section class="kpi-grid">
        <button class="kpi-card users" (click)="activeTab = 'users'">
          <span class="kpi-label">USERS</span>
          <strong>{{ totalUsers }}</strong>
          <small>{{ adminUsersCount }} admin accounts</small>
        </button>
        <button class="kpi-card merchants" (click)="activeTab = 'merchants'">
          <span class="kpi-label">MERCHANTS</span>
          <strong>{{ totalMerchants }}</strong>
          <small>{{ pendingMerchantsCount }} pending review</small>
        </button>
        <button class="kpi-card loans" (click)="activeTab = 'loans'">
          <span class="kpi-label">DEBT & LOAN QUEUE</span>
          <strong>{{ pendingLoansCount }}</strong>
          <small>{{ pendingLoansAmount | currency:'VND':'symbol':'1.0-0' }} awaiting decision</small>
        </button>
        <button class="kpi-card ledger" (click)="activeTab = 'ledger'">
          <span class="kpi-label">LEDGER</span>
          <strong [class.danger]="!ledgerBalanced">{{ ledgerBalanced ? 'BALANCED' : 'ISSUE' }}</strong>
          <small>Double-entry integrity</small>
        </button>
        <button class="kpi-card transactions" (click)="activeTab = 'transactions'">
          <span class="kpi-label">TRANSACTIONS</span>
          <strong>{{ totalTransactions }}</strong>
          <small>{{ failedTransactionsCount }} failed events</small>
        </button>
        <button class="kpi-card webhooks" (click)="activeTab = 'webhooks'">
          <span class="kpi-label">WEBHOOKS</span>
          <strong>{{ pendingWebhooks }}</strong>
          <small>retrying callbacks</small>
        </button>
      </section>

      <nav class="admin-nav-tabs">
        <button [class.active]="activeTab === 'overview'" (click)="activeTab = 'overview'">Overview</button>
        <button [class.active]="activeTab === 'users'" (click)="activeTab = 'users'">Users</button>
        <button [class.active]="activeTab === 'merchants'" (click)="activeTab = 'merchants'">Merchants</button>
        <button [class.active]="activeTab === 'loans'" (click)="activeTab = 'loans'">Debt & Loans</button>
        <button [class.active]="activeTab === 'transactions'" (click)="activeTab = 'transactions'">Transactions</button>
        <button [class.active]="activeTab === 'ledger'" (click)="activeTab = 'ledger'">Ledger</button>
        <button [class.active]="activeTab === 'vouchers'" (click)="activeTab = 'vouchers'">Vouchers</button>
        <button [class.active]="activeTab === 'webhooks'" (click)="activeTab = 'webhooks'">Webhooks</button>
      </nav>

      <section class="tab-pane" *ngIf="activeTab === 'overview'">
        <div class="overview-grid">
          <div class="admin-card">
            <div class="card-hdr">
              <h3>Review Queue</h3>
              <span class="badge-count">{{ pendingLoansCount + pendingMerchantsCount }} open</span>
            </div>
            <div class="action-items-list">
              <div class="action-item" *ngFor="let loan of pendingLoansList.slice(0, 3)">
                <div class="ai-icon loan">LN</div>
                <div class="ai-info">
                  <strong>Loan {{ loan.loanRef }}</strong>
                  <span>{{ loan.amount | currency:'VND':'symbol':'1.0-0' }} · {{ loan.termMonths }} months · {{ loan.interestRate }}% annual</span>
                </div>
                <button class="btn-quick-act approve" (click)="approveLoan(loan.id)">Approve</button>
              </div>
              <div class="action-item" *ngFor="let m of pendingMerchantsList.slice(0, 3)">
                <div class="ai-icon merchant">MR</div>
                <div class="ai-info">
                  <strong>{{ m.merchantName || m.name }}</strong>
                  <span>{{ m.merchantCode }} · {{ m.contactEmail }}</span>
                </div>
                <button class="btn-quick-act approve" (click)="approveMerchant(m.id)">Approve</button>
              </div>
              <div class="empty-action-msg" *ngIf="pendingLoansCount === 0 && pendingMerchantsCount === 0">
                No pending merchant or loan approvals.
              </div>
            </div>
          </div>

          <div class="admin-card">
            <div class="card-hdr"><h3>System Modules</h3></div>
            <div class="modules-quick-grid">
              <button class="module-tile" (click)="activeTab = 'users'"><span>US</span><strong>User Directory</strong><small>Create, edit, disable, and audit platform accounts.</small></button>
              <button class="module-tile" (click)="activeTab = 'merchants'"><span>MR</span><strong>Merchant Review</strong><small>Approve partners and control merchant activation.</small></button>
              <button class="module-tile" (click)="activeTab = 'loans'"><span>DB</span><strong>Debt & Loan Control</strong><small>Review applications, overdue exposure, and credit status.</small></button>
              <button class="module-tile" (click)="activeTab = 'transactions'"><span>TX</span><strong>Transaction Monitor</strong><small>Inspect platform payments and issue refunds.</small></button>
              <button class="module-tile" (click)="activeTab = 'ledger'"><span>LG</span><strong>Ledger Audit</strong><small>Verify debit and credit consistency.</small></button>
              <button class="module-tile" (click)="activeTab = 'vouchers'"><span>VC</span><strong>Voucher Operations</strong><small>Manage rewards and promotional inventory.</small></button>
              <button class="module-tile" (click)="activeTab = 'webhooks'"><span>WH</span><strong>Webhook Delivery</strong><small>Track callback retry status.</small></button>
            </div>
          </div>
        </div>
      </section>

      <section class="tab-pane" *ngIf="activeTab === 'users'">
        <div class="admin-card">
          <div class="card-hdr">
            <h3>User Directory ({{ totalUsers }})</h3>
            <a routerLink="/users" class="link-more">Open full user management</a>
          </div>
          <div class="table-responsive">
            <table class="admin-table">
              <thead><tr><th>User</th><th>Email</th><th>Role</th><th>Status</th><th>Created</th></tr></thead>
              <tbody>
                <tr *ngFor="let u of usersList">
                  <td><strong>{{ u.fullName || u.username }}</strong><small>#{{ u.id }} · {{ u.username }}</small></td>
                  <td>{{ u.email }}</td>
                  <td><span class="status-chip admin-role">{{ u.role }}</span></td>
                  <td><span class="status-chip" [class.active]="u.active" [class.rejected]="!u.active">{{ u.active ? 'ACTIVE' : 'INACTIVE' }}</span></td>
                  <td>{{ u.createdAt | date:'MMM d, y HH:mm' }}</td>
                </tr>
                <tr *ngIf="usersList.length === 0"><td colspan="5" class="empty-cell">No users found.</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section class="tab-pane" *ngIf="activeTab === 'merchants'">
        <div class="admin-card">
          <div class="card-hdr">
            <h3>Merchant Applications ({{ merchantsList.length }})</h3>
            <a routerLink="/admin/merchants" class="link-more">Open merchant management</a>
          </div>
          <div class="table-responsive">
            <table class="admin-table">
              <thead><tr><th>Business</th><th>Merchant Code</th><th>Contact</th><th>Wallet</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                <tr *ngFor="let m of merchantsList">
                  <td><strong>{{ m.merchantName || m.name }}</strong><small>Tax code: {{ m.taxCode || 'N/A' }}</small></td>
                  <td><code class="code-pill">{{ m.merchantCode }}</code></td>
                  <td>{{ m.contactEmail }}</td>
                  <td><span class="badge-wallet">{{ m.accountNumber || ('PAYGATE-MERCHANT-' + m.id) }}</span></td>
                  <td><span class="status-chip" [class.active]="m.status === 'ACTIVE'" [class.pending]="m.status === 'PENDING'" [class.rejected]="m.status === 'REJECTED'">{{ m.status }}</span></td>
                  <td>
                    <div class="act-btns">
                      <button *ngIf="m.status === 'PENDING'" class="btn-sm approve" (click)="approveMerchant(m.id)">Approve</button>
                      <button *ngIf="m.status === 'PENDING'" class="btn-sm reject" (click)="rejectMerchant(m.id)">Reject</button>
                    </div>
                  </td>
                </tr>
                <tr *ngIf="merchantsList.length === 0"><td colspan="6" class="empty-cell">No merchant applications found.</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section class="tab-pane" *ngIf="activeTab === 'loans'">
        <div class="admin-card">
            <div class="card-hdr"><h3>Debt & Loan Approval Queue ({{ loansList.length }})</h3></div>
          <div class="table-responsive">
            <table class="admin-table">
              <thead><tr><th>Reference</th><th>Amount</th><th>Term</th><th>Rate</th><th>Monthly Due</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                <tr *ngFor="let loan of loansList">
                  <td><strong>{{ loan.loanRef }}</strong><small>{{ loan.createdAt | date:'MMM d, y HH:mm' }}</small></td>
                  <td class="font-bold text-pink">{{ loan.amount | currency:'VND':'symbol':'1.0-0' }}</td>
                  <td>{{ loan.termMonths }} months</td>
                  <td>{{ loan.interestRate }}% annual</td>
                  <td>{{ loan.monthlyAmount | currency:'VND':'symbol':'1.0-0' }}</td>
                  <td><span class="status-chip" [class.active]="loan.status === 'ACTIVE' || loan.status === 'PAID_OFF'" [class.pending]="loan.status === 'PENDING_APPROVAL'" [class.rejected]="loan.status === 'REJECTED'">{{ loan.status }}</span></td>
                  <td>
                    <div class="act-btns" *ngIf="loan.status === 'PENDING_APPROVAL'">
                      <button class="btn-sm approve" (click)="approveLoan(loan.id)">Approve</button>
                      <button class="btn-sm reject" (click)="rejectLoan(loan.id)">Reject</button>
                    </div>
                    <span *ngIf="loan.status !== 'PENDING_APPROVAL'" class="text-muted text-xs">Reviewed</span>
                  </td>
                </tr>
                <tr *ngIf="loansList.length === 0"><td colspan="7" class="empty-cell">No loan records found.</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section class="tab-pane" *ngIf="activeTab === 'transactions'">
        <div class="admin-card">
          <div class="card-hdr"><h3>Transaction Monitor ({{ totalTransactions }})</h3></div>
          <div class="table-responsive">
            <table class="admin-table">
              <thead><tr><th>Reference</th><th>Type</th><th>Amount</th><th>Source</th><th>Destination</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead>
              <tbody>
                <tr *ngFor="let tx of transactionsList">
                  <td><code class="code-pill">{{ tx.transactionRef }}</code></td>
                  <td>{{ tx.type }}</td>
                  <td class="font-bold">{{ tx.amount | currency:'VND':'symbol':'1.0-0' }}</td>
                  <td>#{{ tx.sourceAccountId }}</td>
                  <td>#{{ tx.destAccountId }}</td>
                  <td><span class="status-chip" [class.active]="tx.status === 'COMPLETED'" [class.pending]="tx.status === 'PENDING' || tx.status === 'PROCESSING'" [class.rejected]="tx.status === 'FAILED' || tx.status === 'EXPIRED'">{{ tx.status }}</span></td>
                  <td>{{ tx.createdAt | date:'MMM d, y HH:mm' }}</td>
                  <td><button *ngIf="tx.status === 'COMPLETED'" class="btn-sm reject" (click)="refund(tx.transactionRef)">Refund</button></td>
                </tr>
                <tr *ngIf="transactionsList.length === 0"><td colspan="8" class="empty-cell">No transactions found.</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section class="tab-pane" *ngIf="activeTab === 'ledger'">
        <div class="admin-card">
          <div class="card-hdr">
            <h3>Double-Entry Ledger Integrity</h3>
            <a routerLink="/admin/ledger" class="btn-primary-sm">Open detailed ledger console</a>
          </div>
          <div class="ledger-summary-box">
            <span>Balance status</span>
            <strong [class.text-emerald]="ledgerBalanced" [class.text-rose]="!ledgerBalanced">
              {{ ledgerBalanced ? 'Debit equals credit' : 'Ledger mismatch detected' }}
            </strong>
            <p>Use this module to verify bookkeeping consistency across PayGate settlement, wallet, top-up, refund, and merchant payment flows.</p>
          </div>
        </div>
      </section>

      <section class="tab-pane" *ngIf="activeTab === 'vouchers'">
        <div class="admin-card">
          <div class="card-hdr">
            <h3>Voucher Operations</h3>
            <a routerLink="/admin/vouchers" class="btn-primary-sm">Open voucher catalog</a>
          </div>
          <p class="ls-desc">Create and maintain reward vouchers available to PayGate users. This is an admin catalog, not the user redemption shop.</p>
        </div>
      </section>

      <section class="tab-pane" *ngIf="activeTab === 'webhooks'">
        <div class="admin-card">
          <div class="card-hdr">
            <h3>Webhook Delivery Logs</h3>
            <a routerLink="/admin/webhooks" class="btn-primary-sm">Open webhook logs</a>
          </div>
          <p class="ls-desc">Inspect merchant callback delivery, retrying jobs, and failed outbound HTTP notifications.</p>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .fade-in-up { animation: fadeInUp 0.32s ease-out both; }
    .admin-console { display:flex; flex-direction:column; gap:24px; color:#0f172a; font-family:'Inter', system-ui, sans-serif; }
    .admin-header {
      display:flex; justify-content:space-between; align-items:center; gap:24px; padding:28px;
      background:linear-gradient(135deg,#ffffff 0%,#f8fafc 100%); border:1px solid #e2e8f0; border-radius:16px;
      box-shadow:0 10px 30px rgba(15,23,42,.05);
    }
    .admin-badge { display:inline-flex; align-items:center; gap:8px; padding:5px 12px; border-radius:999px; background:#eef6ff; color:#0072ce; font-size:.72rem; font-weight:900; letter-spacing:.06em; }
    .live-pulse { width:8px; height:8px; border-radius:50%; background:#10b981; box-shadow:0 0 8px #10b981; }
    .console-title { margin:10px 0 4px; color:#0d2b5c; font-size:1.8rem; font-weight:900; letter-spacing:-.02em; }
    .console-subtitle { margin:0; color:#64748b; font-size:.9rem; max-width:760px; line-height:1.5; }
    .header-actions { display:flex; gap:10px; flex-wrap:wrap; }
    .btn-secondary, .btn-primary, .btn-primary-sm {
      min-height:38px; display:inline-flex; align-items:center; justify-content:center; padding:0 16px; border-radius:10px;
      font-weight:800; font-size:.84rem; text-decoration:none; cursor:pointer;
    }
    .btn-secondary { background:#fff; color:#334155; border:1px solid #cbd5e1; }
    .btn-primary, .btn-primary-sm { background:#0d2b5c; color:#fff; border:0; }
    .kpi-grid { display:grid; grid-template-columns:repeat(6,minmax(0,1fr)); gap:14px; }
    .kpi-card {
      text-align:left; padding:18px; min-height:126px; border:1px solid #e2e8f0; border-radius:14px; background:#fff; cursor:pointer;
      display:flex; flex-direction:column; justify-content:space-between; transition:transform .18s, box-shadow .18s, border-color .18s;
    }
    .kpi-card:hover { transform:translateY(-3px); box-shadow:0 16px 32px rgba(15,23,42,.08); border-color:#f48fb1; }
    .kpi-card strong { font-size:1.35rem; color:#0d2b5c; font-weight:900; }
    .kpi-card small { color:#64748b; font-size:.75rem; font-weight:700; }
    .kpi-label { color:#94a3b8; font-size:.68rem; font-weight:900; letter-spacing:.08em; }
    .kpi-card.users { border-top:4px solid #0072ce; }
    .kpi-card.merchants { border-top:4px solid #c20067; }
    .kpi-card.loans { border-top:4px solid #d97706; }
    .kpi-card.ledger { border-top:4px solid #10b981; }
    .kpi-card.transactions { border-top:4px solid #6366f1; }
    .kpi-card.webhooks { border-top:4px solid #7c3aed; }
    .admin-nav-tabs { display:flex; gap:8px; flex-wrap:wrap; border-bottom:1px solid #e2e8f0; padding-bottom:8px; }
    .admin-nav-tabs button {
      min-height:38px; padding:0 14px; border:1px solid transparent; border-radius:10px; background:transparent; color:#64748b;
      font-size:.84rem; font-weight:800; cursor:pointer;
    }
    .admin-nav-tabs button.active { background:#fff0f6; border-color:#f8bbd0; color:#c20067; }
    .overview-grid { display:grid; grid-template-columns:1fr 1fr; gap:18px; }
    .admin-card { background:#fff; border:1px solid #e2e8f0; border-radius:16px; padding:22px; box-shadow:0 8px 24px rgba(15,23,42,.04); }
    .card-hdr { display:flex; justify-content:space-between; align-items:center; gap:14px; margin-bottom:16px; }
    .card-hdr h3 { margin:0; color:#0d2b5c; font-size:1.08rem; font-weight:900; }
    .badge-count { background:#fff0f6; color:#c20067; border:1px solid #f8bbd0; padding:4px 10px; border-radius:999px; font-size:.72rem; font-weight:900; }
    .action-items-list { display:flex; flex-direction:column; gap:10px; }
    .action-item { display:flex; align-items:center; gap:12px; padding:13px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; }
    .ai-icon { width:36px; height:36px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:.7rem; font-weight:900; flex-shrink:0; }
    .ai-icon.loan { background:#fff7ed; color:#d97706; }
    .ai-icon.merchant { background:#fff0f6; color:#c20067; }
    .ai-info { flex:1; min-width:0; display:flex; flex-direction:column; gap:2px; }
    .ai-info strong, .module-tile strong { color:#0d2b5c; font-size:.88rem; }
    .ai-info span, .module-tile small { color:#64748b; font-size:.76rem; line-height:1.4; }
    .modules-quick-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; }
    .module-tile {
      text-align:left; border:1px solid #e2e8f0; border-radius:12px; background:#f8fafc; padding:14px; cursor:pointer;
      display:grid; grid-template-columns:38px 1fr; gap:10px; align-items:start;
    }
    .module-tile span { grid-row:span 2; width:36px; height:36px; border-radius:10px; display:flex; align-items:center; justify-content:center; background:#eef6ff; color:#0072ce; font-weight:900; font-size:.72rem; }
    .module-tile:hover { border-color:#f48fb1; background:#fff; }
    .table-responsive { overflow-x:auto; border:1px solid #e2e8f0; border-radius:12px; }
    .admin-table { width:100%; border-collapse:collapse; text-align:left; font-size:.84rem; }
    .admin-table th { padding:12px 14px; background:#f8fafc; color:#64748b; font-size:.68rem; font-weight:900; letter-spacing:.06em; text-transform:uppercase; border-bottom:1px solid #e2e8f0; }
    .admin-table td { padding:13px 14px; border-bottom:1px solid #f1f5f9; color:#334155; vertical-align:middle; }
    .admin-table td small { display:block; color:#94a3b8; font-size:.72rem; margin-top:3px; }
    .code-pill { background:#f1f5f9; color:#0d2b5c; border-radius:7px; padding:3px 7px; font-family:monospace; font-weight:800; }
    .badge-wallet { background:#eef6ff; color:#0072ce; border-radius:7px; padding:3px 7px; font-size:.72rem; font-weight:800; }
    .status-chip { display:inline-flex; align-items:center; border-radius:999px; padding:4px 9px; background:#f1f5f9; color:#475569; font-size:.7rem; font-weight:900; white-space:nowrap; }
    .status-chip.active { background:#dcfce7; color:#047857; }
    .status-chip.pending { background:#fef3c7; color:#b45309; }
    .status-chip.rejected { background:#fee2e2; color:#b91c1c; }
    .status-chip.admin-role { background:#eef6ff; color:#0072ce; }
    .act-btns { display:flex; gap:6px; flex-wrap:wrap; }
    .btn-sm, .btn-quick-act { border:0; border-radius:8px; padding:6px 10px; font-size:.74rem; font-weight:900; cursor:pointer; }
    .approve { background:#c20067; color:#fff; }
    .reject { background:#ef4444; color:#fff; }
    .ledger-summary-box { background:#f8fafc; border:1px solid #e2e8f0; border-radius:14px; padding:18px; display:flex; flex-direction:column; gap:6px; }
    .ledger-summary-box span, .ls-desc { color:#64748b; font-size:.86rem; line-height:1.5; }
    .ledger-summary-box strong { font-size:1.2rem; color:#0d2b5c; }
    .link-more { color:#c20067; font-weight:900; text-decoration:none; font-size:.82rem; }
    .empty-action-msg, .empty-cell { color:#64748b; text-align:center; padding:22px !important; font-weight:700; }
    .font-bold { font-weight:900; }
    .text-pink { color:#c20067; }
    .text-emerald { color:#047857 !important; }
    .text-rose, .danger { color:#b91c1c !important; }
    .text-muted { color:#94a3b8; }
    .text-xs { font-size:.74rem; }
    @media(max-width:1200px) { .kpi-grid { grid-template-columns:repeat(3,1fr); } .overview-grid { grid-template-columns:1fr; } }
    @media(max-width:760px) { .admin-header { flex-direction:column; align-items:flex-start; } .kpi-grid, .modules-quick-grid { grid-template-columns:1fr; } }
  `]
})
export class AdminDashboardComponent implements OnInit {
  activeTab: AdminTab = 'overview';

  totalUsers = 0;
  adminUsersCount = 0;
  totalMerchants = 0;
  pendingMerchantsCount = 0;
  pendingLoansCount = 0;
  pendingLoansAmount = 0;
  totalTransactions = 0;
  failedTransactionsCount = 0;
  ledgerBalanced = true;
  pendingWebhooks = 0;
  loading = true;

  usersList: User[] = [];
  merchantsList: Merchant[] = [];
  pendingMerchantsList: Merchant[] = [];
  loansList: LoanResponse[] = [];
  pendingLoansList: LoanResponse[] = [];
  transactionsList: TransactionResponse[] = [];

  constructor(
    private userService: UserService,
    private merchantService: MerchantService,
    private ledgerService: LedgerService,
    private webhookLogService: WebhookLogService,
    private loanService: LoanService,
    private transactionService: TransactionService,
    private notification: NotificationService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    const requestedTab = this.route.snapshot.queryParamMap.get('tab') as AdminTab | null;
    if (requestedTab && ['overview', 'users', 'merchants', 'loans', 'transactions', 'ledger', 'vouchers', 'webhooks'].includes(requestedTab)) {
      this.activeTab = requestedTab;
    }
    this.loadMetrics();
  }

  loadMetrics(): void {
    this.loading = true;

    this.userService.getAll(0, 50).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.usersList = res.data.content;
          this.totalUsers = res.data.totalElements;
          this.adminUsersCount = this.usersList.filter(u => u.role === 'ADMIN' || u.role === 'ROLE_ADMIN').length;
        }
      }
    });

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

    this.transactionService.getMyTransactions({ page: 0, size: 50, sortBy: 'createdAt', sortDir: 'DESC' }).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.transactionsList = res.data.content;
          this.totalTransactions = res.data.totalElements;
          this.failedTransactionsCount = this.transactionsList.filter(tx => tx.status === 'FAILED' || tx.status === 'EXPIRED').length;
        }
      }
    });

    this.ledgerService.verifyLedger().subscribe({
      next: (res) => {
        if (res.success && res.data) this.ledgerBalanced = res.data.balanced;
      }
    });

    this.webhookLogService.getLogs(0, 1, 'RETRYING').subscribe({
      next: (res) => {
        if (res.success && res.data) this.pendingWebhooks = res.data.totalElements;
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  approveMerchant(id: number): void {
    this.merchantService.approveMerchant(id).subscribe({
      next: (res) => {
        if (res.success) {
          this.notification.success('Merchant approved successfully.');
          this.loadMetrics();
        }
      }
    });
  }

  rejectMerchant(id: number): void {
    this.merchantService.rejectMerchant(id, 'Rejected from Admin Console').subscribe({
      next: (res) => {
        if (res.success) {
          this.notification.success('Merchant rejected.');
          this.loadMetrics();
        }
      }
    });
  }

  approveLoan(id: number): void {
    this.loanService.approveLoan(id, 'Approved from Admin Console').subscribe({
      next: (res) => {
        if (res.success) {
          this.notification.success('Loan approved successfully.');
          this.loadMetrics();
        }
      }
    });
  }

  rejectLoan(id: number): void {
    this.loanService.rejectLoan(id, 'Loan application rejected by Admin Console').subscribe({
      next: (res) => {
        if (res.success) {
          this.notification.success('Loan rejected.');
          this.loadMetrics();
        }
      }
    });
  }

  refund(ref: string): void {
    this.transactionService.refund(ref).subscribe({
      next: (res) => {
        if (res.success) {
          this.notification.success('Transaction refund created.');
          this.loadMetrics();
        }
      }
    });
  }
}
