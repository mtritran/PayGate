import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MerchantService } from '../../../core/services/merchant.service';
import { LedgerService } from '../../../core/services/ledger.service';
import { WebhookLogService } from '../../../core/services/webhook-log.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="space-y-8">
      <!-- Welcome Header -->
      <div class="bg-gradient-to-r from-indigo-900/60 via-slate-800/80 to-purple-900/60 p-8 rounded-3xl border border-indigo-500/20 shadow-2xl relative overflow-hidden backdrop-blur-xl">
        <div class="absolute -right-10 -bottom-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div class="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <span class="px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-semibold uppercase tracking-wider">
              System Administration
            </span>
            <h1 class="text-3xl font-extrabold text-white mt-3 tracking-tight">PayGate Operational Dashboard</h1>
            <p class="text-slate-300 text-sm mt-2 max-w-xl">
              Monitor real-time transaction processing, system double-entry balance integrity, and webhook delivery status.
            </p>
          </div>

          <div class="flex items-center gap-3">
            <a
              routerLink="/admin/ledger"
              class="px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-500/25 transition-all flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Run Ledger Audit
            </a>
            <a
              routerLink="/admin/merchants"
              class="px-5 py-3 rounded-2xl bg-slate-700/80 hover:bg-slate-600 text-white font-semibold text-sm transition-all flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h6m-6 4h6m-6 4h6" />
              </svg>
              Merchants
            </a>
          </div>
        </div>
      </div>

      <!-- Metric Cards Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <!-- Metric 1: Total Merchants -->
        <div class="bg-slate-800/60 border border-slate-700/60 p-6 rounded-2xl backdrop-blur-xl shadow-lg hover:border-indigo-500/30 transition-all">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Merchants</span>
            <div class="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h6m-6 4h6m-6 4h6" />
              </svg>
            </div>
          </div>
          <div class="text-3xl font-bold text-white mt-3">{{ totalMerchants }}</div>
          <p class="text-xs text-emerald-400 mt-2 font-medium">✓ Provisioned & Active</p>
        </div>

        <!-- Metric 2: Double-Entry Integrity -->
        <div class="bg-slate-800/60 border border-slate-700/60 p-6 rounded-2xl backdrop-blur-xl shadow-lg hover:border-emerald-500/30 transition-all">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Ledger Balance</span>
            <div class="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div class="text-2xl font-bold text-emerald-400 mt-3">{{ ledgerBalanced ? 'BALANCED' : 'UNBALANCED' }}</div>
          <p class="text-xs text-slate-400 mt-2 font-mono">DEBIT == CREDIT</p>
        </div>

        <!-- Metric 3: Webhook Retries -->
        <div class="bg-slate-800/60 border border-slate-700/60 p-6 rounded-2xl backdrop-blur-xl shadow-lg hover:border-amber-500/30 transition-all">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pending Webhooks</span>
            <div class="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
          <div class="text-3xl font-bold text-amber-400 mt-3">{{ pendingWebhooks }}</div>
          <p class="text-xs text-slate-400 mt-2">Scheduled Backoff Retries</p>
        </div>

        <!-- Metric 4: System Health -->
        <div class="bg-slate-800/60 border border-slate-700/60 p-6 rounded-2xl backdrop-blur-xl shadow-lg hover:border-purple-500/30 transition-all">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider">System Health</span>
            <div class="p-2 rounded-xl bg-purple-500/10 text-purple-400">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </div>
          </div>
          <div class="text-2xl font-bold text-purple-300 mt-3">OPERATIONAL</div>
          <p class="text-xs text-slate-400 mt-2">RabbitMQ • Redis • Postgres</p>
        </div>
      </div>

      <!-- Quick Navigation Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <a routerLink="/admin/merchants" class="bg-slate-800/60 hover:bg-slate-700/50 border border-slate-700/60 p-6 rounded-2xl backdrop-blur-xl transition-all group">
          <div class="text-indigo-400 font-semibold flex items-center justify-between text-base">
            Merchant Management
            <svg class="w-5 h-5 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </div>
          <p class="text-xs text-slate-400 mt-2">Register new business partners and configure webhook URLs.</p>
        </a>

        <a routerLink="/admin/ledger" class="bg-slate-800/60 hover:bg-slate-700/50 border border-slate-700/60 p-6 rounded-2xl backdrop-blur-xl transition-all group">
          <div class="text-purple-400 font-semibold flex items-center justify-between text-base">
            Double-Entry Ledger Audit
            <svg class="w-5 h-5 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </div>
          <p class="text-xs text-slate-400 mt-2">Verify double-entry ledger balance integrity and account journals.</p>
        </a>

        <a routerLink="/admin/webhooks" class="bg-slate-800/60 hover:bg-slate-700/50 border border-slate-700/60 p-6 rounded-2xl backdrop-blur-xl transition-all group">
          <div class="text-amber-400 font-semibold flex items-center justify-between text-base">
            Webhook Logs & Retries
            <svg class="w-5 h-5 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </div>
          <p class="text-xs text-slate-400 mt-2">Inspect outbound HTTP webhook status codes and delivery history.</p>
        </a>
      </div>
    </div>
  `
})
export class AdminDashboardComponent implements OnInit {
  totalMerchants = 0;
  ledgerBalanced = true;
  pendingWebhooks = 0;

  constructor(
    private merchantService: MerchantService,
    private ledgerService: LedgerService,
    private webhookLogService: WebhookLogService
  ) {}

  ngOnInit(): void {
    this.loadMetrics();
  }

  loadMetrics(): void {
    this.merchantService.getAll(0, 1).subscribe(res => {
      if (res.success && res.data) {
        this.totalMerchants = res.data.totalElements;
      }
    });

    this.ledgerService.verifyLedger().subscribe(res => {
      if (res.success && res.data) {
        this.ledgerBalanced = res.data.balanced;
      }
    });

    this.webhookLogService.getLogs(0, 1, 'RETRYING').subscribe(res => {
      if (res.success && res.data) {
        this.pendingWebhooks = res.data.totalElements;
      }
    });
  }
}
