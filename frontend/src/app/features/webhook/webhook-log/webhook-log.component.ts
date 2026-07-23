import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { WebhookLogService } from '../../../core/services/webhook-log.service';
import { WebhookLog } from '../../../core/models/webhook-log.model';

@Component({
  selector: 'app-webhook-log',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DatePipe,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="console-page">
      <!-- Page Header -->
      <div class="page-header">
        <div class="header-title-group">
          <h2>Webhook Execution Logs</h2>
          <p class="header-subtitle">Audit outbound HTTP webhook dispatches, status codes, and exponential backoff retries.</p>
        </div>

        <div class="filter-group">
          <label class="filter-label">Filter Status:</label>
          <select [(ngModel)]="selectedStatus" (change)="onStatusChange()" class="filter-select">
            <option value="ALL">ALL STATUSES</option>
            <option value="SUCCESS">SUCCESS</option>
            <option value="FAILED">FAILED</option>
            <option value="RETRYING">RETRYING</option>
            <option value="PENDING">PENDING</option>
          </select>
        </div>
      </div>

      <!-- Logs Table Card -->
      <div class="table-card">
        <div *ngIf="loading" class="loading-box">
          <mat-spinner diameter="40"></mat-spinner>
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
                <th class="text-right">DETAILS</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let log of logs">
                <td class="font-mono">#{{ log.id }}</td>
                <td class="max-w-url font-mono" [title]="log.url">{{ log.url }}</td>
                <td>
                  <span
                    [class.success]="log.status === 'SUCCESS'"
                    [class.failed]="log.status === 'FAILED'"
                    [class.retrying]="log.status === 'RETRYING'"
                    [class.pending]="log.status === 'PENDING'"
                    class="status-pill"
                  >
                    {{ log.status }}
                  </span>
                </td>
                <td class="font-bold">{{ log.attempt }}/5</td>
                <td>
                  <span *ngIf="log.responseStatus" [class.text-green]="log.responseStatus >= 200 && log.responseStatus < 300" [class.text-red]="log.responseStatus >= 400" class="font-mono font-bold">
                    {{ log.responseStatus }}
                  </span>
                  <span *ngIf="!log.responseStatus" class="text-muted">N/A</span>
                </td>
                <td class="text-xs text-muted">
                  <span *ngIf="log.nextRetryAt" class="font-mono text-amber">{{ log.nextRetryAt | date:'short' }}</span>
                  <span *ngIf="!log.nextRetryAt">-</span>
                </td>
                <td class="text-xs text-muted">{{ log.createdAt | date:'medium' }}</td>
                <td class="text-right">
                  <button mat-button class="btn-inspect" (click)="selectedLog = log">Inspect</button>
                </td>
              </tr>

              <tr *ngIf="logs.length === 0">
                <td colspan="8" class="text-center py-6 text-muted">
                  No webhook execution logs found.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination Bar -->
        <div class="pagination-bar">
          <span class="page-info">Showing page {{ currentPage + 1 }} of {{ totalPages || 1 }} ({{ totalElements }} items)</span>
          <div class="page-buttons">
            <button mat-button class="btn-page" [disabled]="currentPage === 0 || loading" (click)="changePage(currentPage - 1)">Previous</button>
            <button mat-button class="btn-page" [disabled]="currentPage >= totalPages - 1 || loading" (click)="changePage(currentPage + 1)">Next</button>
          </div>
        </div>
      </div>

      <!-- Inspect Log Detail Modal -->
      <div *ngIf="selectedLog" class="modal-backdrop">
        <div class="modal-card">
          <div class="modal-header">
            <h3>Webhook Log Details #{{ selectedLog.id }}</h3>
            <button mat-icon-button (click)="selectedLog = null"><mat-icon>close</mat-icon></button>
          </div>

          <div class="modal-body">
            <div class="detail-group">
              <span class="detail-label">TARGET WEBHOOK URL:</span>
              <div class="detail-code text-amber">{{ selectedLog.url }}</div>
            </div>

            <div class="detail-group">
              <span class="detail-label">PAYLOAD JSON:</span>
              <pre class="detail-code text-green">{{ selectedLog.payload }}</pre>
            </div>

            <div class="detail-group">
              <span class="detail-label">RESPONSE BODY:</span>
              <pre class="detail-code">{{ selectedLog.responseBody || 'No response body' }}</pre>
            </div>
          </div>

          <div class="modal-footer">
            <button mat-button class="btn-close" (click)="selectedLog = null">Close</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .console-page { display: flex; flex-direction: column; gap: 20px; padding: 4px; }
    
    .page-header {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 20px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
    }
    .header-title-group h2 { margin: 0; font-size: 1.4rem; font-weight: 800; color: #0f172a; }
    .header-subtitle { margin: 4px 0 0 0; color: #64748b; font-size: 0.85rem; }

    .filter-group { display: flex; align-items: center; gap: 8px; }
    .filter-label { font-size: 0.75rem; font-weight: 700; color: #64748b; }
    .filter-select { border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 12px; font-size: 0.825rem; font-weight: 600; color: #1e293b; outline: none; background: #ffffff; }

    .table-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.03); overflow: hidden; }
    .loading-box { display: flex; justify-content: center; padding: 40px; }

    .custom-table-wrapper { overflow-x: auto; }
    .paygate-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 0.875rem; }
    .paygate-table th { padding: 14px 18px; font-size: 0.72rem; font-weight: 700; color: #64748b; border-bottom: 1px solid #e2e8f0; background: #f8fafc; letter-spacing: 0.04em; }
    .paygate-table td { padding: 16px 18px; border-bottom: 1px solid #f1f5f9; color: #1e293b; }
    
    .max-w-url { max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    
    .status-pill { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 0.72rem; font-weight: 700; text-transform: uppercase; }
    .status-pill.success { background-color: #dcfce7; color: #15803d; }
    .status-pill.failed { background-color: #fee2e2; color: #b91c1c; }
    .status-pill.retrying { background-color: #fef3c7; color: #b45309; }
    .status-pill.pending { background-color: #e0f2fe; color: #0369a1; }

    .btn-inspect { background: #f1f5f9; border: 1px solid #cbd5e1; color: #334155; font-size: 0.78rem; font-weight: 600; border-radius: 6px; height: 30px; }
    .btn-inspect:hover { background: #e2e8f0; }

    .pagination-bar { padding: 14px 20px; background: #f8fafc; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; }
    .page-info { font-size: 0.8rem; color: #64748b; }
    .page-buttons { display: flex; gap: 8px; }
    .btn-page { border: 1px solid #cbd5e1; border-radius: 6px; font-size: 0.8rem; height: 32px; color: #334155; }
    
    /* Modal Backdrop */
    .modal-backdrop { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.5); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 16px; }
    .modal-card { background: #ffffff; border-radius: 12px; border: 1px solid #cbd5e1; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); width: 100%; max-width: 600px; overflow: hidden; display: flex; flex-direction: column; }
    .modal-header { padding: 16px 20px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; }
    .modal-header h3 { margin: 0; font-size: 1.1rem; font-weight: 700; color: #0f172a; }
    .modal-body { padding: 20px; display: flex; flex-direction: column; gap: 16px; }
    .detail-group { display: flex; flex-direction: column; gap: 4px; }
    .detail-label { font-size: 0.72rem; font-weight: 700; color: #64748b; letter-spacing: 0.04em; }
    .detail-code { background: #0f172a; color: #f8fafc; padding: 12px; border-radius: 8px; font-family: monospace; font-size: 0.8rem; max-height: 160px; overflow-y: auto; white-space: pre-wrap; word-break: break-all; margin: 0; }
    .modal-footer { padding: 12px 20px; background: #f8fafc; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; }
    .btn-close { background: #334155; color: #ffffff; font-weight: 600; font-size: 0.825rem; border-radius: 6px; }

    .font-mono { font-family: monospace; font-size: 0.825rem; }
    .font-bold { font-weight: 700; color: #0f172a; }
    .text-green { color: #16a34a; }
    .text-amber { color: #d97706; }
    .text-red { color: #dc2626; }
    .text-muted { color: #64748b; }
    .text-xs { font-size: 0.75rem; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .py-6 { padding-top: 24px; padding-bottom: 24px; }
  `]
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
