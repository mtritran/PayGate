import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import {
  BillService,
  SavedBillResponse
} from '../../../core/services/bill.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-saved-bills',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MatIconModule],
  template: `
    <div class="saved-page">
      <div class="page-header">
        <div>
          <div class="header-tag">PAYGATE BILLS</div>
          <h2>Saved Bills</h2>
          <p class="subtitle">Quick lookup of frequently used bills — max 10 bills/user.</p>
        </div>
        <a routerLink="/bills/pay" class="btn btn-primary">+ Pay New Bill</a>
      </div>

      <div class="content-card">
        <div *ngIf="loading()" class="empty-note">Loading…</div>
        <div *ngIf="!loading() && saved().length === 0" class="empty-state">
          <mat-icon class="empty-icon">description</mat-icon>
          <h4>No saved bills yet</h4>
          <p>Save frequently used bills for quick lookup in future months.</p>
          <a routerLink="/bills/pay" class="btn btn-primary">Go to Bill Payment</a>
        </div>

        <div class="saved-list" *ngIf="!loading() && saved().length > 0">
          <div class="saved-item" *ngFor="let s of saved()">
            <div class="left-cell">
              <div class="type-badge" [attr.data-type]="s.providerType">
                <mat-icon>{{ typeIcon(s.providerType) }}</mat-icon>
              </div>
              <div class="info">
                <div class="nickname">{{ s.nickname || s.customerCode }}</div>
                <div class="meta">
                  <span>{{ s.providerName }}</span>
                  <span class="dot">•</span>
                  <span class="code">Code: {{ s.customerCode }}</span>
                </div>
              </div>
            </div>
            <div class="right-cell">
              <button class="btn btn-secondary btn-sm" (click)="onQuickLookup(s)" [disabled]="lookingUp() === s.id">
                {{ lookingUp() === s.id ? 'Looking up…' : 'Look Up Now' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .saved-page { max-width: 900px; margin: 0 auto; padding: 32px 24px; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px; }
    .header-tag {
      display: inline-block; font-size: 11px; font-weight: 700; letter-spacing: 2px;
      color: #059669; background: #d1fae5; padding: 4px 10px; border-radius: 4px;
    }
    .page-header h2 { margin: 8px 0 4px; font-size: 26px; font-weight: 700; color: #111827; }
    .subtitle { color: #6b7280; margin: 0; }
    .content-card {
      background: #fff; border: 1px solid #e5e7eb; border-radius: 14px;
      padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.03);
    }
    .empty-state { text-align: center; padding: 40px 20px; }
    .empty-icon { font-size: 40px; width: 40px; height: 40px; margin-bottom: 12px; }
    .empty-state h4 { color: #111827; margin: 0 0 6px; }
    .empty-state p { color: #6b7280; margin: 0 0 16px; }
    .empty-note { color: #6b7280; font-style: italic; padding: 12px; }
    .saved-list { display: flex; flex-direction: column; gap: 10px; }
    .saved-item {
      display: flex; justify-content: space-between; align-items: center;
      padding: 14px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px;
    }
    .saved-item:hover { border-color: #10b981; }
    .left-cell { display: flex; align-items: center; gap: 14px; }
    .type-badge {
      width: 42px; height: 42px; border-radius: 10px;
      display: inline-flex; align-items: center; justify-content: center;
      background: #eef2ff; color: #4338ca;
    }
    .type-badge mat-icon { font-size: 20px; width: 20px; height: 20px; }
    .type-badge[data-type='ELECTRICITY'] { background: #fef3c7; color: #92400e; }
    .type-badge[data-type='WATER'] { background: #dbeafe; color: #1d4ed8; }
    .type-badge[data-type='INTERNET'] { background: #ede9fe; color: #6d28d9; }
    .info .nickname { font-weight: 700; color: #111827; }
    .info .meta { color: #6b7280; font-size: 13px; margin-top: 3px; display: flex; gap: 8px; align-items: center; }
    .info .code { font-family: 'SF Mono', monospace; letter-spacing: 0.5px; }
    .dot { opacity: 0.5; }
    .btn {
      padding: 8px 16px; border-radius: 8px; font-weight: 600; border: none;
      cursor: pointer; text-decoration: none; font-size: 13px;
      display: inline-flex; align-items: center;
    }
    .btn:disabled { opacity: 0.6; cursor: not-allowed; }
    .btn-primary { background: #10b981; color: #fff; }
    .btn-primary:hover:not(:disabled) { background: #059669; }
    .btn-secondary { background: #fff; color: #10b981; border: 1px solid #10b981; }
    .btn-secondary:hover:not(:disabled) { background: #ecfdf5; }
    .btn-sm { padding: 6px 12px; font-size: 12px; }
  `]
})
export class SavedBillsComponent implements OnInit {
  private bill = inject(BillService);
  private notify = inject(NotificationService);
  private router = inject(Router);

  loading = signal(false);
  saved = signal<SavedBillResponse[]>([]);
  lookingUp = signal<number | null>(null);

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.bill.getSaved().subscribe({
      next: r => {
        this.saved.set(r.data ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.notify.error('Could not load saved bills');
      }
    });
  }

  typeIcon(t: string): string {
    switch (t) {
      case 'ELECTRICITY': return 'electric_bolt';
      case 'WATER': return 'water_drop';
      case 'INTERNET': return 'wifi';
      default: return 'description';
    }
  }

  onQuickLookup(s: SavedBillResponse): void {
    this.lookingUp.set(s.id);
    this.bill.lookup({ providerCode: s.providerCode, customerCode: s.customerCode }).subscribe({
      next: r => {
        this.lookingUp.set(null);
        this.notify.success(`Found bill for period ${r.data.period} — redirecting to payment`);
        this.router.navigate(['/bills/pay'], {
          queryParams: {
            type: s.providerType,
            provider: s.providerCode,
            customerCode: s.customerCode
          }
        });
      },
      error: e => {
        this.lookingUp.set(null);
        this.notify.error(e?.error?.message || 'No unpaid bill found');
      }
    });
  }
}
