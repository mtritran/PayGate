import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WebhookLogService } from '../../../core/services/webhook-log.service';
import { WebhookLog } from '../../../core/models/webhook-log.model';

@Component({
  selector: 'app-webhook-log',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DatePipe
  ],
  template: `
    <div class="console-page fade-in-up">
      <!-- Page Header -->
      <div class="page-header flex-between">
        <div>
          <div class="header-tag">OUTBOUND NOTIFICATION AUDIT</div>
          <h2>Webhook Execution Logs</h2>
          <p class="header-subtitle">Audit outbound HTTP webhook dispatches, response status codes, and exponential backoff retries.</p>
        </div>

        <div class="header-controls">
          <div class="search-box">
            <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              class="search-input"
              placeholder="Search by URL or ID..."
              [(ngModel)]="searchQuery"
              (input)="onSearchChange()"
            />
          </div>

          <div class="filter-select-wrapper">
            <select [(ngModel)]="selectedStatus" (change)="onStatusChange()" class="custom-select">
              <option value="ALL">ALL STATUSES</option>
              <option value="SUCCESS">SUCCESS</option>
              <option value="FAILED">FAILED</option>
              <option value="RETRYING">RETRYING</option>
              <option value="PENDING">PENDING</option>
            </select>
            <svg class="select-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        </div>
      </div>

      <!-- Logs Table Card -->
      <div class="table-card">
        <div *ngIf="loading" class="loading-box">
          <div class="spinner"></div>
        </div>

        <div *ngIf="!loading" class="custom-table-wrapper">
          <table class="paygate-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>TARGET WEBHOOK URL</th>
                <th>STATUS</th>
                <th>ATTEMPT</th>
                <th>HTTP STATUS</th>
                <th>NEXT RETRY AT</th>
                <th>TIMESTAMP</th>
                <th class="text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let log of filteredLogs()" class="log-row">
                <td class="font-mono">
                  <span class="log-id-badge">#{{ log.id }}</span>
                </td>
                <td>
                  <div class="url-cell">
                    <svg class="url-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                    </svg>
                    <span class="url-text font-mono" [title]="log.url">{{ log.url }}</span>
                  </div>
                </td>
                <td>
                  <span
                    [class.success]="log.status === 'SUCCESS'"
                    [class.failed]="log.status === 'FAILED'"
                    [class.retrying]="log.status === 'RETRYING'"
                    [class.pending]="log.status === 'PENDING'"
                    class="status-pill"
                  >
                    <span class="pill-dot"></span>
                    {{ log.status }}
                  </span>
                </td>
                <td class="font-mono font-bold">
                  <span class="attempt-badge">{{ log.attempt || 1 }}/5</span>
                </td>
                <td>
                  <span *ngIf="log.responseStatus" [class.status-200]="log.responseStatus >= 200 && log.responseStatus < 300" [class.status-500]="log.responseStatus >= 400" class="http-badge font-mono">
                    {{ log.responseStatus }} {{ log.responseStatus === 200 ? 'OK' : 'ERR' }}
                  </span>
                  <span *ngIf="!log.responseStatus" class="text-muted text-xs">N/A</span>
                </td>
                <td class="text-xs text-muted">
                  <span *ngIf="log.nextRetryAt" class="font-mono text-amber-glow">{{ log.nextRetryAt | date:'short' }}</span>
                  <span *ngIf="!log.nextRetryAt" class="text-muted">-</span>
                </td>
                <td class="text-xs text-muted">{{ log.createdAt | date:'medium' }}</td>
                <td class="text-right">
                  <button class="btn-inspect" (click)="selectedLog = log">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                    Inspect
                  </button>
                </td>
              </tr>

              <tr *ngIf="filteredLogs().length === 0">
                <td colspan="8" class="text-center py-8 text-muted">
                  No webhook execution logs found matching criteria.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination Bar -->
        <div class="pagination-bar">
          <span class="page-info">Showing {{ filteredLogs().length }} of {{ totalElements }} items</span>
          <div class="page-buttons">
            <button class="btn-page" [disabled]="currentPage === 0 || loading" (click)="changePage(currentPage - 1)">Previous</button>
            <button class="btn-page" [disabled]="currentPage >= totalPages - 1 || loading" (click)="changePage(currentPage + 1)">Next</button>
          </div>
        </div>
      </div>

      <!-- Inspect Log Detail Modal -->
      <div *ngIf="selectedLog" class="modal-backdrop fade-in">
        <div class="modal-card">
          <div class="modal-header">
            <div class="modal-title-box">
              <span class="modal-tag">DISPATCH AUDIT DETAILS</span>
              <h3>Webhook Payload #{{ selectedLog.id }}</h3>
            </div>
            <button class="btn-close-icon" (click)="selectedLog = null">✕</button>
          </div>

          <div class="modal-body">
            <div class="detail-group">
              <span class="detail-label">TARGET WEBHOOK URL:</span>
              <div class="detail-code font-mono text-emerald">{{ selectedLog.url }}</div>
            </div>

            <div class="detail-group">
              <span class="detail-label">PAYLOAD JSON:</span>
              <pre class="detail-json font-mono">{{ selectedLog.payload }}</pre>
            </div>

            <div class="detail-group">
              <span class="detail-label">RESPONSE BODY:</span>
              <pre class="detail-json font-mono">{{ selectedLog.responseBody || 'No response body' }}</pre>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn-emerald-modal" (click)="selectedLog = null">Close Details</button>
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
    .fade-in { animation: fadeInUp 0.25s ease-out forwards; }

    .console-page { display: flex; flex-direction: column; gap: 20px; color: #0f172a; font-family: 'Inter', system-ui, sans-serif; }
    .flex-between { display: flex; justify-content: space-between; align-items: center; }

    .header-tag { font-size: 0.7rem; font-weight: 800; color: #059669; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
    .page-header h2 { margin: 0; font-size: 1.65rem; font-weight: 800; color: #0f172a; letter-spacing: -0.02em; }
    .header-subtitle { margin: 4px 0 0 0; color: #64748b; font-size: 0.875rem; }

    .header-controls { display: flex; align-items: center; gap: 12px; }

    /* Search Box */
    .search-box { display: flex; align-items: center; gap: 8px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 0 12px; width: 220px; height: 38px; }
    .search-icon { width: 16px; height: 16px; color: #94a3b8; flex-shrink: 0; }
    .search-input { border: none; outline: none; width: 100%; font-size: 0.825rem; color: #0f172a; background: transparent; }

    /* Filter Select */
    .filter-select-wrapper { position: relative; width: 150px; }
    .custom-select { width: 100%; height: 38px; padding: 0 30px 0 12px; font-size: 0.8rem; font-weight: 700; color: #334155; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; outline: none; appearance: none; cursor: pointer; }
    .select-chevron { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); width: 14px; height: 14px; color: #94a3b8; pointer-events: none; }

    .table-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; box-shadow: 0 4px 20px -5px rgba(0,0,0,0.04); overflow: hidden; }
    .loading-box { display: flex; justify-content: center; padding: 48px; }
    .spinner { width: 32px; height: 32px; border: 3px solid #e2e8f0; border-top-color: #059669; border-radius: 50%; animation: spin 0.7s linear infinite; }

    .custom-table-wrapper { overflow-x: auto; }
    .paygate-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 0.875rem; }
    .paygate-table th { padding: 14px 18px; font-size: 0.72rem; font-weight: 700; color: #64748b; border-bottom: 1px solid #e2e8f0; background: #f8fafc; letter-spacing: 0.04em; text-transform: uppercase; }
    .paygate-table td { padding: 16px 18px; border-bottom: 1px solid #f1f5f9; color: #1e293b; }
    
    .log-row { transition: background-color 0.15s; }
    .log-row:hover td { background-color: #f8fafc; }

    .log-id-badge { font-weight: 700; color: #059669; background: #ecfdf5; padding: 2px 8px; border-radius: 6px; border: 1px solid #a7f3d0; }
    
    .url-cell { display: flex; align-items: center; gap: 8px; max-width: 280px; }
    .url-icon { width: 14px; height: 14px; color: #94a3b8; flex-shrink: 0; }
    .url-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.8rem; color: #334155; font-weight: 600; }

    .status-pill { display: inline-flex; align-items: center; gap: 6px; padding: 3px 10px; border-radius: 14px; font-size: 0.72rem; font-weight: 700; text-transform: uppercase; }
    .pill-dot { width: 6px; height: 6px; border-radius: 50%; }

    .status-pill.success { background-color: #dcfce7; color: #15803d; }
    .status-pill.success .pill-dot { background-color: #16a34a; }

    .status-pill.failed { background-color: #fee2e2; color: #b91c1c; }
    .status-pill.failed .pill-dot { background-color: #dc2626; }

    .status-pill.retrying { background-color: #fef3c7; color: #b45309; }
    .status-pill.retrying .pill-dot { background-color: #d97706; }

    .status-pill.pending { background-color: #e0f2fe; color: #0369a1; }
    .status-pill.pending .pill-dot { background-color: #0284c7; }

    .attempt-badge { background: #f1f5f9; padding: 2px 8px; border-radius: 6px; font-size: 0.8rem; }

    .http-badge { padding: 2px 8px; border-radius: 6px; font-weight: 700; font-size: 0.8rem; }
    .status-200 { background-color: #dcfce7; color: #15803d; }
    .status-500 { background-color: #fee2e2; color: #b91c1c; }

    .text-amber-glow { color: #d97706; font-weight: 600; }

    .btn-inspect {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border: 1px solid #e2e8f0;
      background: #ffffff;
      color: #334155;
      font-size: 0.8rem;
      font-weight: 600;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.15s;
    }
    .btn-inspect:hover { border-color: #059669; color: #059669; background: #ecfdf5; }
    .btn-inspect svg { width: 14px; height: 14px; }

    .pagination-bar { padding: 14px 20px; background: #f8fafc; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; }
    .page-info { font-size: 0.825rem; color: #64748b; font-weight: 500; }
    .page-buttons { display: flex; gap: 8px; }
    .btn-page { border: 1px solid #e2e8f0; background: #ffffff; border-radius: 8px; padding: 0 14px; height: 34px; font-size: 0.825rem; font-weight: 600; color: #475569; cursor: pointer; transition: all 0.15s; }
    .btn-page:hover:not(:disabled) { border-color: #059669; color: #059669; background: #ecfdf5; }
    .btn-page:disabled { opacity: 0.4; cursor: not-allowed; }

    /* Modal Backdrop */
    .modal-backdrop { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.65); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
    .modal-card { background: #ffffff; border-radius: 20px; border: 1px solid #e2e8f0; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); width: 100%; max-width: 600px; overflow: hidden; display: flex; flex-direction: column; }
    
    .modal-header { padding: 20px 24px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: flex-start; }
    .modal-tag { font-size: 0.68rem; font-weight: 800; color: #059669; letter-spacing: 0.05em; display: block; margin-bottom: 2px; }
    .modal-header h3 { margin: 0; font-size: 1.2rem; font-weight: 800; color: #0f172a; }
    .btn-close-icon { background: transparent; border: none; font-size: 1.1rem; color: #94a3b8; cursor: pointer; padding: 4px; }
    .btn-close-icon:hover { color: #0f172a; }

    .modal-body { padding: 24px; display: flex; flex-direction: column; gap: 16px; }
    .detail-group { display: flex; flex-direction: column; gap: 6px; }
    .detail-label { font-size: 0.72rem; font-weight: 800; color: #64748b; letter-spacing: 0.04em; }
    .detail-code { background: #ecfdf5; color: #059669; padding: 10px 14px; border-radius: 8px; border: 1px solid #a7f3d0; font-weight: 700; word-break: break-all; }
    .detail-json { background: #0f172a; color: #38bdf8; padding: 14px; border-radius: 10px; font-size: 0.8rem; max-height: 180px; overflow-y: auto; white-space: pre-wrap; word-break: break-all; margin: 0; }

    .modal-footer { padding: 16px 24px; background: #f8fafc; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; }
    .btn-emerald-modal { height: 42px; padding: 0 20px; border: none; border-radius: 10px; background: linear-gradient(135deg, #059669 0%, #047857 100%); color: #ffffff; font-weight: 700; font-size: 0.875rem; cursor: pointer; }

    .font-mono { font-family: monospace; }
    .font-bold { font-weight: 700; }
    .text-emerald { color: #059669; }
    .text-muted { color: #64748b; }
    .text-xs { font-size: 0.75rem; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .py-8 { padding-top: 32px; padding-bottom: 32px; }
  `]
})
export class WebhookLogComponent implements OnInit {
  logs: WebhookLog[] = [];
  selectedStatus: string = 'ALL';
  searchQuery: string = '';
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

  filteredLogs(): WebhookLog[] {
    if (!this.searchQuery.trim()) return this.logs;
    const q = this.searchQuery.toLowerCase();
    return this.logs.filter(l =>
      l.id.toString().includes(q) ||
      (l.url && l.url.toLowerCase().includes(q))
    );
  }

  onSearchChange(): void {
    // client filter
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
