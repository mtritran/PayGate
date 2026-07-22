import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LedgerService } from '../../../core/services/ledger.service';
import { LedgerEntry, LedgerVerificationResponse } from '../../../core/models/ledger.model';

@Component({
  selector: 'app-admin-ledger',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      <!-- Title & Audit Action Bar -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-800/60 p-6 rounded-2xl border border-slate-700/60 backdrop-blur-xl">
        <div>
          <h1 class="text-2xl font-bold text-white flex items-center gap-2">
            <span class="p-2 rounded-xl bg-purple-500/10 text-purple-400">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </span>
            Double-Entry Ledger Audit
          </h1>
          <p class="text-slate-400 text-sm mt-1">Audit system-wide financial integrity by verifying total DEBIT balance equals total CREDIT balance.</p>
        </div>

        <button
          (click)="runAudit()"
          [disabled]="loadingAudit"
          class="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold text-sm shadow-lg shadow-emerald-500/25 transition-all transform active:scale-95 disabled:opacity-50"
        >
          <svg *ngIf="loadingAudit" class="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <svg *ngIf="!loadingAudit" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {{ loadingAudit ? 'Auditing...' : 'Run Ledger Verification' }}
        </button>
      </div>

      <!-- Audit Results Cards Grid -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6" *ngIf="auditResult">
        <!-- Status Card -->
        <div
          [ngClass]="auditResult.balanced ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-rose-500/30 bg-rose-500/5'"
          class="p-6 rounded-2xl border backdrop-blur-xl flex flex-col justify-between shadow-lg"
        >
          <div class="flex items-center justify-between">
            <span class="text-slate-400 text-xs font-semibold uppercase tracking-wider">Ledger Integrity Status</span>
            <span
              [ngClass]="auditResult.balanced ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'"
              class="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
            >
              {{ auditResult.balanced ? 'BALANCED' : 'INTEGRITY VIOLATION' }}
            </span>
          </div>
          <div class="mt-4">
            <div class="text-xl font-bold text-white">{{ auditResult.message }}</div>
            <div class="text-xs text-slate-400 mt-1">Verified at: {{ auditResult.verifiedAt | date:'medium' }}</div>
          </div>
        </div>

        <!-- Total Debit Card -->
        <div class="bg-slate-800/60 border border-slate-700/60 p-6 rounded-2xl backdrop-blur-xl shadow-lg">
          <span class="text-slate-400 text-xs font-semibold uppercase tracking-wider">Total Debit Volume</span>
          <div class="text-2xl font-bold text-indigo-400 mt-2">
            {{ auditResult.totalDebit | number:'1.2-2' }} <span class="text-sm font-normal text-slate-400">VND</span>
          </div>
          <p class="text-xs text-slate-500 mt-1">Sum of all DEBIT entries recorded in system.</p>
        </div>

        <!-- Total Credit Card -->
        <div class="bg-slate-800/60 border border-slate-700/60 p-6 rounded-2xl backdrop-blur-xl shadow-lg">
          <span class="text-slate-400 text-xs font-semibold uppercase tracking-wider">Total Credit Volume</span>
          <div class="text-2xl font-bold text-purple-400 mt-2">
            {{ auditResult.totalCredit | number:'1.2-2' }} <span class="text-sm font-normal text-slate-400">VND</span>
          </div>
          <p class="text-xs text-slate-500 mt-1">Sum of all CREDIT entries recorded in system.</p>
        </div>
      </div>

      <!-- Account Lookup Section -->
      <div class="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-6 backdrop-blur-xl shadow-xl space-y-6">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h2 class="text-lg font-bold text-white flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Account Journal Entry History
          </h2>

          <div class="flex items-center gap-3">
            <input
              type="number"
              [(ngModel)]="searchAccountId"
              placeholder="Enter Account ID (e.g. 1)"
              class="bg-slate-900/80 border border-slate-700 rounded-xl px-4 py-2 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              (click)="lookupAccountEntries()"
              [disabled]="!searchAccountId || loadingEntries"
              class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-all disabled:opacity-40"
            >
              Lookup
            </button>
          </div>
        </div>

        <!-- Entries Table -->
        <div class="overflow-x-auto border border-slate-700/60 rounded-xl">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="border-b border-slate-700/60 bg-slate-800/80 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <th class="px-6 py-3">ID</th>
                <th class="px-6 py-3">Transaction ID</th>
                <th class="px-6 py-3">Type</th>
                <th class="px-6 py-3">Amount</th>
                <th class="px-6 py-3">Balance After</th>
                <th class="px-6 py-3">Timestamp</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-700/40 text-sm">
              <tr *ngFor="let entry of entries" class="hover:bg-slate-700/30 transition-colors">
                <td class="px-6 py-4 font-mono text-slate-400 text-xs">#{{ entry.id }}</td>
                <td class="px-6 py-4 font-mono text-indigo-300 text-xs">TXN-{{ entry.transactionId }}</td>
                <td class="px-6 py-4">
                  <span
                    [ngClass]="entry.entryType === 'DEBIT' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'"
                    class="inline-flex items-center px-2.5 py-0.5 rounded-md border text-xs font-bold"
                  >
                    {{ entry.entryType }}
                  </span>
                </td>
                <td class="px-6 py-4 font-semibold text-white">
                  {{ entry.amount | number:'1.2-2' }} VND
                </td>
                <td class="px-6 py-4 text-slate-300">
                  {{ entry.balanceAfter | number:'1.2-2' }} VND
                </td>
                <td class="px-6 py-4 text-slate-400 text-xs">
                  {{ entry.createdAt | date:'medium' }}
                </td>
              </tr>

              <!-- Empty State -->
              <tr *ngIf="!loadingEntries && entries.length === 0">
                <td colspan="6" class="px-6 py-8 text-center text-slate-400 text-sm">
                  Enter an Account ID above and click Lookup to view journal entries.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `
})
export class AdminLedgerComponent implements OnInit {
  auditResult: LedgerVerificationResponse | null = null;
  loadingAudit = false;

  searchAccountId: number | null = null;
  entries: LedgerEntry[] = [];
  loadingEntries = false;

  constructor(private ledgerService: LedgerService) {}

  ngOnInit(): void {
    this.runAudit();
  }

  runAudit(): void {
    this.loadingAudit = true;
    this.ledgerService.verifyLedger().subscribe({
      next: (res) => {
        this.loadingAudit = false;
        if (res.success && res.data) {
          this.auditResult = res.data;
        }
      },
      error: () => {
        this.loadingAudit = false;
      }
    });
  }

  lookupAccountEntries(): void {
    if (!this.searchAccountId) return;
    this.loadingEntries = true;
    this.ledgerService.getEntriesByAccount(this.searchAccountId).subscribe({
      next: (res) => {
        this.loadingEntries = false;
        if (res.success && res.data) {
          this.entries = res.data;
        }
      },
      error: () => {
        this.loadingEntries = false;
      }
    });
  }
}
