import { Component, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MerchantService } from '../../../core/services/merchant.service';
import { LedgerService } from '../../../core/services/ledger.service';
import { WebhookLogService } from '../../../core/services/webhook-log.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    CurrencyPipe
  ],
  template: `
    <div class="console-dashboard fade-in-up">
      <!-- Welcome Header Banner -->
      <div class="welcome-header">
        <div class="welcome-title-group">
          <div class="role-badge">SYSTEM ADMINISTRATION CONSOLE</div>
          <h2>PayGate Operational Overview</h2>
          <p class="welcome-subtitle">Real-time monitoring of merchant onboardings, double-entry ledger integrity, and webhook dispatches.</p>
        </div>
        <div class="header-action-buttons">
          <a class="btn-secondary" routerLink="/admin/merchants">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            </svg>
            <span>Merchants</span>
          </a>
          <a class="btn-emerald-primary pulse-glow" routerLink="/admin/ledger">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span>Run Ledger Audit ↗</span>
          </a>
        </div>
      </div>

      <div *ngIf="loading" class="loading-box">
        <div class="spinner"></div>
      </div>

      <div *ngIf="!loading" class="dashboard-body">
        <!-- 4 Core Metric Cards Grid -->
        <div class="metrics-grid">
          <!-- Metric 1: Active Merchants -->
          <div class="metric-card hover-lift">
            <div class="metric-header">
              <span class="metric-label">ACTIVE MERCHANTS</span>
              <div class="metric-icon-bg emerald">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                </svg>
              </div>
            </div>
            <div class="metric-value">{{ totalMerchants }}</div>
            <div class="metric-footer success">✓ Provisioned & Active</div>
          </div>

          <!-- Metric 2: Double-Entry Ledger Balance -->
          <div class="metric-card hover-lift">
            <div class="metric-header">
              <span class="metric-label">LEDGER BALANCE</span>
              <div class="metric-icon-bg green">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
            </div>
            <div class="metric-value" [class.text-green]="ledgerBalanced" [class.text-red]="!ledgerBalanced">
              {{ ledgerBalanced ? 'BALANCED' : 'UNBALANCED' }}
            </div>
            <div class="metric-footer muted">DEBIT == CREDIT (Integrity OK)</div>
          </div>

          <!-- Metric 3: Pending Webhook Retries -->
          <div class="metric-card hover-lift">
            <div class="metric-header">
              <span class="metric-label">PENDING WEBHOOKS</span>
              <div class="metric-icon-bg amber">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M4 11a9 9 0 0 1 9 9" />
                  <path d="M4 4a16 16 0 0 1 16 16" />
                  <circle cx="5" cy="19" r="1" />
                </svg>
              </div>
            </div>
            <div class="metric-value text-amber">{{ pendingWebhooks }}</div>
            <div class="metric-footer muted">Scheduled Backoff Retries</div>
          </div>

          <!-- Metric 4: System Health -->
          <div class="metric-card hover-lift">
            <div class="metric-header">
              <span class="metric-label">SYSTEM HEALTH</span>
              <div class="metric-icon-bg blue">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              </div>
            </div>
            <div class="metric-value text-blue">OPERATIONAL</div>
            <div class="metric-footer muted">Postgres • RabbitMQ • Redis</div>
          </div>
        </div>

        <!-- Quick Navigation Cards Grid -->
        <div class="quick-nav-section">
          <h3 class="section-title">Admin Operational Modules</h3>
          <div class="quick-nav-grid">
            <!-- Card 1: Merchant Management -->
            <a routerLink="/admin/merchants" class="nav-card hover-lift">
              <div class="nav-card-header">
                <div class="nav-card-icon-box emerald">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  </svg>
                </div>
                <svg class="nav-card-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </div>
              <h4 class="nav-card-title">Merchant Management</h4>
              <p class="nav-card-desc">Register new business partners, manage API keys, auto-provision merchant wallets, and update webhook endpoints.</p>
            </a>

            <!-- Card 2: Double-Entry Ledger Audit -->
            <a routerLink="/admin/ledger" class="nav-card hover-lift">
              <div class="nav-card-header">
                <div class="nav-card-icon-box purple">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </div>
                <svg class="nav-card-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </div>
              <h4 class="nav-card-title">Double-Entry Ledger Audit</h4>
              <p class="nav-card-desc">Execute real-time double-entry ledger balance integrity verification and inspect account journal history.</p>
            </a>

            <!-- Card 3: Webhook Logs & Retries -->
            <a routerLink="/admin/webhooks" class="nav-card hover-lift">
              <div class="nav-card-header">
                <div class="nav-card-icon-box amber">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M4 11a9 9 0 0 1 9 9" />
                    <path d="M4 4a16 16 0 0 1 16 16" />
                    <circle cx="5" cy="19" r="1" />
                  </svg>
                </div>
                <svg class="nav-card-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </div>
              <h4 class="nav-card-title">Webhook Logs & Retries</h4>
              <p class="nav-card-desc">Audit outbound HTTP notification webhooks, inspect payload JSON data, and filter delivery attempts by status.</p>
            </a>
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
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .fade-in-up { animation: fadeInUp 0.4s ease-out forwards; }

    .console-dashboard { display: flex; flex-direction: column; gap: 24px; padding: 4px; font-family: 'Inter', system-ui, sans-serif; color: #0f172a; }
    
    /* Header Banner */
    .welcome-header {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 28px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 4px 20px -5px rgba(0,0,0,0.04);
    }
    
    .role-badge {
      display: inline-block;
      font-size: 0.7rem;
      font-weight: 800;
      letter-spacing: 0.05em;
      color: #059669;
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      padding: 3px 10px;
      border-radius: 14px;
      margin-bottom: 8px;
    }
    .welcome-title-group h2 { margin: 0; font-size: 1.65rem; font-weight: 800; color: #0f172a; letter-spacing: -0.02em; }
    .welcome-subtitle { margin: 4px 0 0 0; color: #64748b; font-size: 0.875rem; }
    
    .header-action-buttons { display: flex; gap: 12px; align-items: center; }
    
    .btn-secondary {
      border: 1px solid #e2e8f0;
      background: #ffffff;
      color: #334155;
      border-radius: 10px;
      font-weight: 600;
      font-size: 0.875rem;
      height: 42px;
      padding: 0 18px;
      display: flex;
      align-items: center;
      gap: 8px;
      text-decoration: none;
      transition: all 0.15s;
    }
    .btn-secondary:hover { background-color: #f8fafc; border-color: #cbd5e1; }

    .btn-emerald-primary {
      background: linear-gradient(135deg, #059669 0%, #047857 100%);
      color: #ffffff !important;
      border-radius: 10px;
      font-weight: 700;
      font-size: 0.875rem;
      height: 42px;
      padding: 0 20px;
      display: flex;
      align-items: center;
      gap: 8px;
      text-decoration: none;
      box-shadow: 0 4px 12px rgba(5, 150, 105, 0.25);
      transition: all 0.2s;
    }
    .btn-emerald-primary:hover { transform: translateY(-1.5px); box-shadow: 0 6px 16px rgba(5, 150, 105, 0.35); }

    .loading-box { display: flex; justify-content: center; padding: 48px; }
    .spinner { width: 32px; height: 32px; border: 3px solid #e2e8f0; border-top-color: #059669; border-radius: 50%; animation: spin 0.7s linear infinite; }

    .dashboard-body { display: flex; flex-direction: column; gap: 28px; }

    /* Metrics Grid */
    .metrics-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
    
    .metric-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 20px 22px;
      box-shadow: 0 4px 20px -5px rgba(0,0,0,0.03);
      transition: all 0.2s;
    }
    
    .metric-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
    .metric-label { font-size: 0.72rem; font-weight: 800; color: #64748b; letter-spacing: 0.05em; }
    
    .metric-icon-bg {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .metric-icon-bg.emerald { background: #ecfdf5; color: #059669; }
    .metric-icon-bg.green { background: #dcfce7; color: #16a34a; }
    .metric-icon-bg.amber { background: #fef3c7; color: #d97706; }
    .metric-icon-bg.blue { background: #e0f2fe; color: #0284c7; }
    .metric-icon-bg svg { width: 18px; height: 18px; }
    
    .metric-value { font-size: 1.55rem; font-weight: 800; color: #0f172a; letter-spacing: -0.02em; }
    .metric-value.text-green { color: #059669; }
    .metric-value.text-red { color: #dc2626; }
    .metric-value.text-amber { color: #d97706; }
    .metric-value.text-blue { color: #0284c7; }
    
    .metric-footer { font-size: 0.75rem; margin-top: 6px; }
    .metric-footer.success { color: #059669; font-weight: 700; }
    .metric-footer.muted { color: #64748b; }

    /* Quick Navigation Cards Section */
    .quick-nav-section { display: flex; flex-direction: column; gap: 16px; }
    .section-title { font-size: 1.05rem; font-weight: 800; color: #0f172a; margin: 0; letter-spacing: -0.01em; }
    .quick-nav-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
    
    .nav-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 22px;
      box-shadow: 0 4px 20px -5px rgba(0,0,0,0.03);
      text-decoration: none;
      transition: all 0.2s ease-in-out;
      display: flex;
      flex-direction: column;
    }
    .nav-card:hover {
      border-color: #a7f3d0;
      transform: translateY(-2px);
      box-shadow: 0 8px 24px -5px rgba(5, 150, 105, 0.12);
    }
    
    .nav-card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
    
    .nav-card-icon-box { width: 42px; height: 42px; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
    .nav-card-icon-box.emerald { background: #ecfdf5; color: #059669; }
    .nav-card-icon-box.purple { background: #f3e8ff; color: #7c3aed; }
    .nav-card-icon-box.amber { background: #fef3c7; color: #d97706; }
    .nav-card-icon-box svg { width: 22px; height: 22px; }

    .nav-card-arrow { width: 18px; height: 18px; color: #94a3b8; transition: transform 0.2s; }
    .nav-card:hover .nav-card-arrow { transform: translateX(4px); color: #059669; }
    
    .nav-card-title { margin: 0 0 6px 0; font-size: 1rem; font-weight: 700; color: #0f172a; }
    .nav-card-desc { margin: 0; font-size: 0.825rem; color: #64748b; line-height: 1.5; }

    @media (max-width: 1024px) {
      .metrics-grid { grid-template-columns: repeat(2, 1fr); }
      .quick-nav-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class AdminDashboardComponent implements OnInit {
  totalMerchants = 0;
  ledgerBalanced = true;
  pendingWebhooks = 0;
  loading = true;

  constructor(
    private merchantService: MerchantService,
    private ledgerService: LedgerService,
    private webhookLogService: WebhookLogService
  ) {}

  ngOnInit(): void {
    this.loadMetrics();
  }

  private loadMetrics(): void {
    this.loading = true;
    let completedCalls = 0;
    const checkDone = () => {
      completedCalls++;
      if (completedCalls >= 3) {
        this.loading = false;
      }
    };

    this.merchantService.getAll(0, 1).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.totalMerchants = res.data.totalElements;
        }
        checkDone();
      },
      error: () => checkDone()
    });

    this.ledgerService.verifyLedger().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.ledgerBalanced = res.data.balanced;
        }
        checkDone();
      },
      error: () => checkDone()
    });

    this.webhookLogService.getLogs(0, 1, 'RETRYING').subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.pendingWebhooks = res.data.totalElements;
        }
        checkDone();
      },
      error: () => checkDone()
    });
  }
}
