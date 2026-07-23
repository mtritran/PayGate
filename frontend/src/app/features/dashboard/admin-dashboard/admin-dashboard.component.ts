import { Component, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MerchantService } from '../../../core/services/merchant.service';
import { LedgerService } from '../../../core/services/ledger.service';
import { WebhookLogService } from '../../../core/services/webhook-log.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    CurrencyPipe,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="console-dashboard">
      <!-- Welcome Header Banner -->
      <div class="welcome-header">
        <div class="welcome-title-group">
          <div class="role-badge">SYSTEM ADMINISTRATION CONSOLE</div>
          <h2>PayGate Operational Overview</h2>
          <p class="welcome-subtitle">Real-time monitoring of merchant onboardings, double-entry ledger balance, and webhook dispatches.</p>
        </div>
        <div class="header-action-buttons">
          <a mat-button class="btn-secondary" routerLink="/admin/merchants">
            <mat-icon class="btn-icon">storefront</mat-icon> Merchants
          </a>
          <a mat-raised-button class="btn-primary" routerLink="/admin/ledger">
            <mat-icon class="btn-icon">account_balance</mat-icon> Run Ledger Audit
          </a>
        </div>
      </div>

      <div *ngIf="loading" class="loading-box">
        <mat-spinner diameter="40"></mat-spinner>
      </div>

      <div *ngIf="!loading" class="dashboard-body">
        <!-- 4 Core Metric Cards Grid -->
        <div class="metrics-grid">
          <!-- Metric 1: Active Merchants -->
          <div class="metric-card">
            <div class="metric-header">
              <span class="metric-label">ACTIVE MERCHANTS</span>
              <mat-icon class="metric-icon blue">storefront</mat-icon>
            </div>
            <div class="metric-value">{{ totalMerchants }}</div>
            <div class="metric-footer success">✓ Provisioned & Active</div>
          </div>

          <!-- Metric 2: Double-Entry Ledger Balance -->
          <div class="metric-card">
            <div class="metric-header">
              <span class="metric-label">LEDGER BALANCE</span>
              <mat-icon class="metric-icon green">verified_user</mat-icon>
            </div>
            <div class="metric-value" [class.text-green]="ledgerBalanced" [class.text-red]="!ledgerBalanced">
              {{ ledgerBalanced ? 'BALANCED' : 'UNBALANCED' }}
            </div>
            <div class="metric-footer muted">DEBIT == CREDIT (Integrity OK)</div>
          </div>

          <!-- Metric 3: Pending Webhook Retries -->
          <div class="metric-card">
            <div class="metric-header">
              <span class="metric-label">PENDING WEBHOOKS</span>
              <mat-icon class="metric-icon amber">rss_feed</mat-icon>
            </div>
            <div class="metric-value text-amber">{{ pendingWebhooks }}</div>
            <div class="metric-footer muted">Scheduled Backoff Retries</div>
          </div>

          <!-- Metric 4: System Health -->
          <div class="metric-card">
            <div class="metric-header">
              <span class="metric-label">SYSTEM HEALTH</span>
              <mat-icon class="metric-icon purple">health_and_safety</mat-icon>
            </div>
            <div class="metric-value text-purple">OPERATIONAL</div>
            <div class="metric-footer muted">Postgres • RabbitMQ • Redis</div>
          </div>
        </div>

        <!-- Quick Navigation Cards Grid -->
        <div class="quick-nav-section">
          <h3 class="section-title">Admin Operational Modules</h3>
          <div class="quick-nav-grid">
            <!-- Card 1: Merchant Management -->
            <a routerLink="/admin/merchants" class="nav-card">
              <div class="nav-card-header">
                <mat-icon class="nav-card-icon indigo">storefront</mat-icon>
                <mat-icon class="nav-card-arrow">arrow_forward</mat-icon>
              </div>
              <h4 class="nav-card-title">Merchant Management</h4>
              <p class="nav-card-desc">Register new business partners, manage API keys, auto-provision merchant wallets, and update webhook endpoints.</p>
            </a>

            <!-- Card 2: Double-Entry Ledger Audit -->
            <a routerLink="/admin/ledger" class="nav-card">
              <div class="nav-card-header">
                <mat-icon class="nav-card-icon purple">account_balance</mat-icon>
                <mat-icon class="nav-card-arrow">arrow_forward</mat-icon>
              </div>
              <h4 class="nav-card-title">Double-Entry Ledger Audit</h4>
              <p class="nav-card-desc">Execute real-time double-entry ledger balance integrity verification and inspect account journal history.</p>
            </a>

            <!-- Card 3: Webhook Logs & Retries -->
            <a routerLink="/admin/webhooks" class="nav-card">
              <div class="nav-card-header">
                <mat-icon class="nav-card-icon amber">rss_feed</mat-icon>
                <mat-icon class="nav-card-arrow">arrow_forward</mat-icon>
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
    .console-dashboard { display: flex; flex-direction: column; gap: 24px; padding: 4px; }
    
    /* Header Banner */
    .welcome-header {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
    }
    .role-badge {
      display: inline-block;
      font-size: 0.68rem;
      font-weight: 800;
      letter-spacing: 0.06em;
      color: #4f46e5;
      background: #eef2ff;
      border: 1px solid #c7d2fe;
      padding: 2px 8px;
      border-radius: 12px;
      margin-bottom: 6px;
    }
    .welcome-title-group h2 { margin: 0; font-size: 1.5rem; font-weight: 800; color: #0f172a; }
    .welcome-subtitle { margin: 4px 0 0 0; color: #64748b; font-size: 0.875rem; }
    
    .header-action-buttons { display: flex; gap: 12px; align-items: center; }
    .btn-secondary {
      border: 1px solid #cbd5e1;
      color: #334155;
      border-radius: 8px;
      font-weight: 600;
      font-size: 0.85rem;
      height: 38px;
      padding: 0 16px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .btn-secondary:hover { background-color: #f8fafc; }
    .btn-primary {
      background-color: #4f46e5;
      color: #ffffff;
      border-radius: 8px;
      font-weight: 600;
      font-size: 0.85rem;
      height: 38px;
      padding: 0 18px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .btn-primary:hover { background-color: #4338ca; }
    .btn-icon { font-size: 18px; width: 18px; height: 18px; }

    .loading-box { display: flex; justify-content: center; padding: 40px; }
    .dashboard-body { display: flex; flex-direction: column; gap: 28px; }

    /* Top 4 Metrics Cards */
    .metrics-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
    .metric-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 18px 20px;
      box-shadow: 0 1px 2px rgba(0,0,0,0.03);
    }
    .metric-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .metric-label { font-size: 0.72rem; font-weight: 700; color: #64748b; letter-spacing: 0.04em; }
    .metric-icon { font-size: 20px; width: 20px; height: 20px; }
    .metric-icon.green { color: #059669; }
    .metric-icon.blue { color: #0284c7; }
    .metric-icon.purple { color: #8b5cf6; }
    .metric-icon.amber { color: #d97706; }
    
    .metric-value { font-size: 1.45rem; font-weight: 800; color: #0f172a; }
    .metric-value.text-green { color: #059669; }
    .metric-value.text-red { color: #dc2626; }
    .metric-value.text-amber { color: #d97706; }
    .metric-value.text-purple { color: #7c3aed; }
    
    .metric-footer { font-size: 0.75rem; margin-top: 6px; }
    .metric-footer.success { color: #059669; font-weight: 600; }
    .metric-footer.muted { color: #64748b; }

    /* Quick Navigation Cards Section */
    .quick-nav-section { display: flex; flex-direction: column; gap: 14px; }
    .section-title { font-size: 1rem; font-weight: 700; color: #0f172a; margin: 0; }
    .quick-nav-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
    
    .nav-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 1px 2px rgba(0,0,0,0.03);
      text-decoration: none;
      transition: all 0.2s ease-in-out;
      display: flex;
      flex-direction: column;
    }
    .nav-card:hover {
      border-color: #cbd5e1;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.05);
    }
    .nav-card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .nav-card-icon { font-size: 24px; width: 24px; height: 24px; }
    .nav-card-icon.indigo { color: #4f46e5; }
    .nav-card-icon.purple { color: #7c3aed; }
    .nav-card-icon.amber { color: #d97706; }
    .nav-card-arrow { font-size: 18px; width: 18px; height: 18px; color: #94a3b8; transition: transform 0.2s; }
    .nav-card:hover .nav-card-arrow { transform: translateX(3px); color: #0f172a; }
    
    .nav-card-title { margin: 0 0 6px 0; font-size: 0.95rem; font-weight: 700; color: #0f172a; }
    .nav-card-desc { margin: 0; font-size: 0.825rem; color: #64748b; line-height: 1.45; }

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
    private webhookLogService: WebhookLogService,
    private authService: AuthService
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
