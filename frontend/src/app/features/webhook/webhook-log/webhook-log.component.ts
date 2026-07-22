import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WebhookLogService } from '../../../core/services/webhook-log.service';
import { WebhookLog } from '../../../core/models/webhook-log.model';

@Component({
  selector: 'app-webhook-log',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      <!-- Title & Filter Bar -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-800/60 p-6 rounded-2xl border border-slate-700/60 backdrop-blur-xl">
        <div>
          <h1 class="text-2xl font-bold text-white flex items-center gap-2">
            <span class="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </span>
            Webhook Execution Logs
          </h1>
          <p class="text-slate-400 text-sm mt-1">Audit outbound webhook dispatches, HTTP delivery statuses, and automatic exponential backoff retries.</p>
        </div>

        <div class="flex items-center gap-3">
          <label class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Status Filter:</label>
          <select
            [(ngModel)]="selectedStatus"
            (change)="onStatusChange()"
            class="bg-slate-900/80 border border-slate-700 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
          >
            <option value="ALL">ALL STATUSES</option>
            <option value="SUCCESS">SUCCESS</option>
            <option value="FAILED">FAILED</option>
            <option value="RETRYING">RETRYING</option>
            <option value="PENDING">PENDING</option>
          </select>
        </div>
      </div>

      <!-- Logs Table -->
      <div class="bg-slate-800/60 border border-slate-700/60 rounded-2xl overflow-hidden backdrop-blur-xl shadow-xl">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="border-b border-slate-700/60 bg-slate-800/80 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <th class="px-6 py-4">ID</th>
                <th class="px-6 py-4">Target Webhook URL</th>
                <th class="px-6 py-4">Status</th>
                <th class="px-6 py-4">Attempt</th>
                <th class="px-6 py-4">HTTP Status</th>
                <th class="px-6 py-4">Next Retry At</th>
                <th class="px-6 py-4">Timestamp</th>
                <th class="px-6 py-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-700/40 text-sm">
              <tr *ngFor="let log of logs" class="hover:bg-slate-700/30 transition-colors">
                <td class="px-6 py-4 font-mono text-slate-400 text-xs">#{{ log.id }}</td>
                <td class="px-6 py-4 font-mono text-slate-300 text-xs max-w-xs truncate" [title]="log.url">
                  {{ log.url }}
                </td>
                <td class="px-6 py-4">
                  <span
                    [ngClass]="{
                      'bg-emerald-500/10 text-emerald-400 border-emerald-500/20': log.status === 'SUCCESS',
                      'bg-rose-500/10 text-rose-400 border-rose-500/20': log.status === 'FAILED',
                      'bg-amber-500/10 text-amber-400 border-amber-500/20': log.status === 'RETRYING',
                      'bg-blue-500/10 text-blue-400 border-blue-500/20': log.status === 'PENDING'
                    }"
                    class="inline-flex items-center px-2.5 py-0.5 rounded-md border text-xs font-bold"
                  >
                    {{ log.status }}
                  </span>
                </td>
                <td class="px-6 py-4 font-semibold text-slate-300">
                  {{ log.attempt }}/5
                </td>
                <td class="px-6 py-4 font-mono text-xs">
                  <span *ngIf="log.responseStatus" [ngClass]="log.responseStatus >= 200 && log.responseStatus < 300 ? 'text-emerald-400' : 'text-rose-400'">
                    {{ log.responseStatus }}
                  </span>
                  <span *ngIf="!log.responseStatus" class="text-slate-500">N/A</span>
                </td>
                <td class="px-6 py-4 text-xs text-slate-400">
                  <span *ngIf="log.nextRetryAt" class="text-amber-300 font-mono">{{ log.nextRetryAt | date:'short' }}</span>
                  <span *ngIf="!log.nextRetryAt" class="text-slate-600">-</span>
                </td>
                <td class="px-6 py-4 text-xs text-slate-400">
                  {{ log.createdAt | date:'medium' }}
                </td>
                <td class="px-6 py-4 text-right">
                  <button
                    (click)="selectedLog = log"
                    class="px-3 py-1 rounded-lg bg-slate-700/50 hover:bg-amber-500/20 hover:text-amber-300 text-slate-300 text-xs font-medium transition-all"
                  >
                    Inspect
                  </button>
                </td>
              </tr>

              <!-- Empty State -->
              <tr *ngIf="!loading && logs.length === 0">
                <td colspan="8" class="px-6 py-12 text-center text-slate-400">
                  No webhook execution logs found.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination Bar -->
        <div class="px-6 py-4 border-t border-slate-700/60 flex items-center justify-between bg-slate-800/40">
          <div class="text-xs text-slate-400">
            Page {{ currentPage + 1 }} of {{ totalPages || 1 }} ({{ totalElements }} items)
          </div>
          <div class="flex items-center gap-2">
            <button
              [disabled]="currentPage === 0 || loading"
              (click)="changePage(currentPage - 1)"
              class="px-3 py-1.5 rounded-lg border border-slate-700 text-xs text-slate-300 hover:bg-slate-700/50 disabled:opacity-40 transition-all"
            >
              Previous
            </button>
            <button
              [disabled]="currentPage >= totalPages - 1 || loading"
              (click)="changePage(currentPage + 1)"
              class="px-3 py-1.5 rounded-lg border border-slate-700 text-xs text-slate-300 hover:bg-slate-700/50 disabled:opacity-40 transition-all"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <!-- Inspect Drawer / Modal -->
      <div *ngIf="selectedLog" class="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div class="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
          <div class="px-6 py-4 border-b border-slate-700/60 flex items-center justify-between bg-slate-800/80">
            <h3 class="text-lg font-bold text-white flex items-center gap-2">
              Webhook Log Details #{{ selectedLog.id }}
            </h3>
            <button (click)="selectedLog = null" class="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700/50">
              ✕
            </button>
          </div>

          <div class="p-6 space-y-4 text-sm">
            <div>
              <span class="text-xs font-semibold text-slate-400 uppercase">Target URL:</span>
              <div class="font-mono text-xs text-amber-300 mt-1 break-all bg-slate-900 p-3 rounded-xl border border-slate-700/80">
                {{ selectedLog.url }}
              </div>
            </div>

            <div>
              <span class="text-xs font-semibold text-slate-400 uppercase">Payload JSON:</span>
              <pre class="font-mono text-xs text-emerald-300 mt-1 bg-slate-900 p-3 rounded-xl border border-slate-700/80 overflow-x-auto">{{ selectedLog.payload }}</pre>
            </div>

            <div>
              <span class="text-xs font-semibold text-slate-400 uppercase">Response Body:</span>
              <pre class="font-mono text-xs text-slate-300 mt-1 bg-slate-900 p-3 rounded-xl border border-slate-700/80 overflow-x-auto max-h-40">{{ selectedLog.responseBody || 'No response body' }}</pre>
            </div>
          </div>

          <div class="px-6 py-4 border-t border-slate-700/60 bg-slate-800/40 flex justify-end">
            <button (click)="selectedLog = null" class="px-4 py-2 rounded-xl bg-slate-700 text-white text-xs font-medium hover:bg-slate-600">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class WebhookLogComponent implements OnInit {
  logs: WebhookLog[] = [];
  selectedStatus: string = 'ALL';
  selectedLog: WebhookLog | null = null;
  loading = false;

  currentPage = 0;
  pageSize = 10;
  totalPages = 0;
  totalElements = 0;

  constructor(private webhookLogService: WebhookLogService) {}

  ngOnInit(): void {
    this.loadLogs();
  }

  loadLogs(): void {
    this.loading = true;
    this.webhookLogService.getLogs(this.currentPage, this.pageSize, this.selectedStatus).subscribe({
      next: (res) => {
        this.loading = false;
        if (res.success && res.data) {
          this.logs = res.data.content;
          this.totalPages = res.data.totalPages;
          this.totalElements = res.data.totalElements;
        }
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  onStatusChange(): void {
    this.currentPage = 0;
    this.loadLogs();
  }

  changePage(page: number): void {
    this.currentPage = page;
    this.loadLogs();
  }
}
