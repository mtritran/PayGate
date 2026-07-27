import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  BillService,
  BillType,
  BillProviderResponse,
  BillLookupResponse,
  BillPayResponse,
  SavedBillResponse
} from '../../../core/services/bill.service';
import { NotificationService } from '../../../core/services/notification.service';

type BillTypeMeta = {
  type: BillType;
  label: string;
  icon: string;
  color: string;
};

@Component({
  selector: 'app-bill-pay',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, CurrencyPipe, DatePipe],
  template: `
    <div class="bill-page">
      <div class="page-header">
        <div class="header-tag">PAYGATE BILLS</div>
        <h2>Thanh toán hóa đơn</h2>
        <p class="subtitle">Điện · Nước · Internet — Nhanh, chính xác, ghi sổ minh bạch qua PayGate Ledger.</p>
        <a class="link-saved" routerLink="/bills/saved">
          Hóa đơn đã lưu →
        </a>
      </div>

      <!-- STEP 1: Choose Bill Type -->
      <div class="step-card">
        <div class="step-title">
          <span class="step-num">1</span>
          Chọn loại dịch vụ
        </div>
        <div class="type-grid">
          <button
            *ngFor="let t of billTypes"
            type="button"
            class="type-card"
            [class.selected]="selectedType() === t.type"
            [style.--accent]="t.color"
            (click)="onSelectType(t.type)">
            <div class="type-icon">{{ t.icon }}</div>
            <div class="type-label">{{ t.label }}</div>
          </button>
        </div>
      </div>

      <!-- STEP 2: Choose Provider -->
      <div class="step-card" *ngIf="selectedType()">
        <div class="step-title">
          <span class="step-num">2</span>
          Chọn nhà cung cấp
        </div>
        <div class="providers-row" *ngIf="!loadingProviders(); else loadingTpl">
          <button
            *ngFor="let p of providers()"
            type="button"
            class="provider-chip"
            [class.selected]="selectedProvider()?.code === p.code"
            (click)="onSelectProvider(p)">
            {{ p.name }}
          </button>
          <div *ngIf="providers().length === 0" class="empty-note">
            Chưa có nhà cung cấp cho loại này.
          </div>
        </div>
        <ng-template #loadingTpl>
          <div class="empty-note">Đang tải danh sách nhà cung cấp…</div>
        </ng-template>
      </div>

      <!-- STEP 3: Customer Code + Lookup -->
      <div class="step-card" *ngIf="selectedProvider()">
        <div class="step-title">
          <span class="step-num">3</span>
          Nhập mã khách hàng
        </div>
        <div class="lookup-row">
          <input
            type="text"
            class="input"
            [(ngModel)]="customerCode"
            placeholder="VD: PE0100112233"
            (keyup.enter)="onLookup()" />
          <button
            type="button"
            class="btn btn-primary"
            [disabled]="!customerCode.trim() || looking()"
            (click)="onLookup()">
            {{ looking() ? 'Đang tra cứu…' : 'Tra cứu hóa đơn' }}
          </button>
        </div>
        <div class="hint" *ngIf="lookupError()">
          {{ lookupError() }}
        </div>
      </div>

      <!-- STEP 4: Bill Detail + Confirm Pay -->
      <div class="step-card bill-detail" *ngIf="lookedUp()">
        <div class="step-title">
          <span class="step-num">4</span>
          Xác nhận & thanh toán
        </div>
        <div class="bill-info-grid">
          <div class="bill-row"><span>Nhà cung cấp</span><b>{{ lookedUp()!.providerName }}</b></div>
          <div class="bill-row"><span>Mã khách hàng</span><b>{{ lookedUp()!.customerCode }}</b></div>
          <div class="bill-row"><span>Khách hàng</span><b>{{ lookedUp()!.customerName }}</b></div>
          <div class="bill-row" *ngIf="lookedUp()!.address"><span>Địa chỉ</span><b>{{ lookedUp()!.address }}</b></div>
          <div class="bill-row"><span>Kỳ hóa đơn</span><b>{{ lookedUp()!.period }}</b></div>
          <div class="bill-row"><span>Trạng thái</span>
            <span class="badge" [class.unpaid]="lookedUp()!.status === 'UNPAID'" [class.paid]="lookedUp()!.status === 'PAID'">
              {{ lookedUp()!.status === 'UNPAID' ? 'Chưa thanh toán' : 'Đã thanh toán' }}
            </span>
          </div>
          <div class="bill-row highlight">
            <span>Số tiền</span>
            <b>{{ lookedUp()!.amount | currency:'VND':'symbol':'1.0-0' }}</b>
          </div>
        </div>

        <div class="actions">
          <button
            type="button"
            class="btn btn-secondary"
            (click)="onSaveBill()"
            [disabled]="saving()">
            {{ saving() ? 'Đang lưu…' : '☆ Lưu hóa đơn' }}
          </button>
          <button
            type="button"
            class="btn btn-primary btn-pay"
            [disabled]="paying() || lookedUp()!.status !== 'UNPAID'"
            (click)="onPay()">
            {{ paying() ? 'Đang thanh toán…' : 'Thanh toán ngay' }}
          </button>
        </div>
      </div>

      <!-- STEP 5: Result -->
      <div class="result-card" *ngIf="paid()">
        <div class="result-icon">✓</div>
        <h3>Thanh toán thành công</h3>
        <div class="result-info">
          <div><span>Mã giao dịch</span><b>{{ paid()!.transactionRef }}</b></div>
          <div><span>Số tiền thanh toán</span><b>{{ paid()!.paidAmount | currency:'VND':'symbol':'1.0-0' }}</b></div>
          <div><span>Thời gian</span><b>{{ paid()!.paidAt | date:'dd/MM/yyyy HH:mm' }}</b></div>
        </div>
        <div class="result-actions">
          <button class="btn btn-secondary" (click)="resetFlow()">Thanh toán hóa đơn khác</button>
          <a class="btn btn-primary" routerLink="/transactions/history">Xem lịch sử giao dịch</a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .bill-page {
      max-width: 960px;
      margin: 0 auto;
      padding: 32px 24px;
    }
    .page-header { margin-bottom: 32px; position: relative; }
    .header-tag {
      display: inline-block;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 2px;
      color: #059669;
      background: #d1fae5;
      padding: 4px 10px;
      border-radius: 4px;
    }
    .page-header h2 { margin: 8px 0 4px; font-size: 28px; font-weight: 700; color: #111827; }
    .subtitle { color: #6b7280; margin: 0; }
    .link-saved {
      position: absolute; top: 4px; right: 0;
      color: #059669; font-weight: 600; text-decoration: none;
    }
    .link-saved:hover { text-decoration: underline; }
    .step-card {
      background: #fff; border: 1px solid #e5e7eb; border-radius: 14px;
      padding: 24px; margin-bottom: 20px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.03);
    }
    .step-title { font-size: 16px; font-weight: 700; color: #111827; margin-bottom: 16px; display: flex; align-items: center; gap: 10px; }
    .step-num {
      display: inline-flex; width: 26px; height: 26px; border-radius: 50%;
      background: #10b981; color: #fff; font-size: 13px; align-items: center; justify-content: center; font-weight: 700;
    }
    .type-grid {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;
    }
    .type-card {
      --accent: #10b981;
      background: #fff; border: 2px solid #e5e7eb; border-radius: 12px;
      padding: 20px; cursor: pointer; transition: 0.15s;
      display: flex; flex-direction: column; align-items: center; gap: 8px;
    }
    .type-card:hover { border-color: var(--accent); }
    .type-card.selected {
      border-color: var(--accent);
      background: color-mix(in srgb, var(--accent) 8%, white);
    }
    .type-icon { font-size: 28px; }
    .type-label { font-weight: 600; color: #111827; }
    .providers-row {
      display: flex; flex-wrap: wrap; gap: 10px;
    }
    .provider-chip {
      background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 20px;
      padding: 8px 16px; cursor: pointer; font-weight: 500; color: #374151;
      transition: 0.15s;
    }
    .provider-chip:hover { border-color: #10b981; color: #059669; }
    .provider-chip.selected {
      background: #10b981; color: #fff; border-color: #10b981;
    }
    .lookup-row { display: flex; gap: 10px; }
    .input {
      flex: 1; padding: 10px 14px; font-size: 14px;
      border: 1px solid #d1d5db; border-radius: 8px;
      font-family: 'SF Mono', monospace; letter-spacing: 1px;
    }
    .input:focus { outline: none; border-color: #10b981; box-shadow: 0 0 0 3px rgba(16,185,129,0.15); }
    .hint { margin-top: 10px; color: #b91c1c; font-size: 13px; }
    .empty-note { color: #6b7280; font-style: italic; padding: 8px 0; }
    .btn {
      padding: 10px 20px; font-weight: 600; border-radius: 8px;
      cursor: pointer; border: none; font-size: 14px; transition: 0.15s;
      display: inline-flex; align-items: center; justify-content: center;
      text-decoration: none;
    }
    .btn:disabled { opacity: 0.6; cursor: not-allowed; }
    .btn-primary { background: #10b981; color: #fff; }
    .btn-primary:hover:not(:disabled) { background: #059669; }
    .btn-secondary { background: #f3f4f6; color: #374151; }
    .btn-secondary:hover:not(:disabled) { background: #e5e7eb; }
    .btn-pay { min-width: 180px; }
    .bill-info-grid { display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px; }
    .bill-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px dashed #e5e7eb; }
    .bill-row span { color: #6b7280; }
    .bill-row b { color: #111827; font-weight: 600; }
    .bill-row.highlight { border-top: 1px solid #e5e7eb; margin-top: 6px; padding-top: 14px; }
    .bill-row.highlight b { color: #059669; font-size: 20px; font-weight: 700; }
    .badge { padding: 3px 10px; border-radius: 6px; font-size: 12px; font-weight: 600; }
    .badge.unpaid { background: #fef3c7; color: #92400e; }
    .badge.paid { background: #d1fae5; color: #065f46; }
    .actions { display: flex; justify-content: flex-end; gap: 10px; }
    .result-card {
      background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
      border-radius: 14px; padding: 32px; text-align: center;
      margin-top: 20px;
    }
    .result-icon {
      display: inline-flex; width: 60px; height: 60px; border-radius: 50%;
      background: #10b981; color: #fff; font-size: 32px; font-weight: 700;
      align-items: center; justify-content: center; margin-bottom: 12px;
    }
    .result-card h3 { color: #065f46; margin: 0 0 16px; }
    .result-info { display: flex; flex-direction: column; gap: 6px; margin-bottom: 20px; }
    .result-info div { display: flex; justify-content: space-between; max-width: 500px; margin: 0 auto; }
    .result-info span { color: #047857; }
    .result-info b { color: #064e3b; font-weight: 700; }
    .result-actions { display: flex; justify-content: center; gap: 10px; }
  `]
})
export class BillPayComponent implements OnInit {
  private bill = inject(BillService);
  private notify = inject(NotificationService);
  private router = inject(Router);

  readonly billTypes: BillTypeMeta[] = [
    { type: 'ELECTRICITY', label: 'Điện', icon: '⚡', color: '#f59e0b' },
    { type: 'WATER',       label: 'Nước', icon: '💧', color: '#3b82f6' },
    { type: 'INTERNET',    label: 'Internet', icon: '🌐', color: '#8b5cf6' }
  ];

  selectedType = signal<BillType | null>(null);
  providers = signal<BillProviderResponse[]>([]);
  loadingProviders = signal(false);
  selectedProvider = signal<BillProviderResponse | null>(null);

  customerCode = '';
  looking = signal(false);
  lookupError = signal<string | null>(null);
  lookedUp = signal<BillLookupResponse | null>(null);

  saving = signal(false);
  paying = signal(false);
  paid = signal<BillPayResponse | null>(null);

  ngOnInit(): void {}

  onSelectType(t: BillType): void {
    this.selectedType.set(t);
    this.selectedProvider.set(null);
    this.lookedUp.set(null);
    this.paid.set(null);
    this.customerCode = '';
    this.loadProviders(t);
  }

  private loadProviders(t: BillType): void {
    this.loadingProviders.set(true);
    this.bill.getProviders(t).subscribe({
      next: r => {
        this.providers.set(r.data ?? []);
        this.loadingProviders.set(false);
      },
      error: e => {
        this.loadingProviders.set(false);
        this.notify.error(e?.error?.message || 'Không tải được danh sách nhà cung cấp');
      }
    });
  }

  onSelectProvider(p: BillProviderResponse): void {
    this.selectedProvider.set(p);
    this.lookedUp.set(null);
    this.paid.set(null);
    this.lookupError.set(null);
  }

  onLookup(): void {
    const prov = this.selectedProvider();
    if (!prov || !this.customerCode.trim()) return;

    this.looking.set(true);
    this.lookupError.set(null);
    this.lookedUp.set(null);
    this.paid.set(null);

    this.bill.lookup({ providerCode: prov.code, customerCode: this.customerCode.trim() }).subscribe({
      next: r => {
        this.looking.set(false);
        this.lookedUp.set(r.data);
      },
      error: e => {
        this.looking.set(false);
        this.lookupError.set(e?.error?.message || 'Không tìm thấy hóa đơn UNPAID cho mã khách hàng này');
      }
    });
  }

  onPay(): void {
    const bill = this.lookedUp();
    if (!bill) return;
    this.paying.set(true);
    this.bill.pay({ billId: bill.billId }).subscribe({
      next: r => {
        this.paying.set(false);
        this.paid.set(r.data);
        this.notify.success('Thanh toán hóa đơn thành công');
      },
      error: e => {
        this.paying.set(false);
        this.notify.error(e?.error?.message || 'Thanh toán thất bại');
      }
    });
  }

  onSaveBill(): void {
    const prov = this.selectedProvider();
    const bill = this.lookedUp();
    if (!prov || !bill) return;

    this.saving.set(true);
    this.bill.createSaved({
      providerCode: prov.code,
      customerCode: bill.customerCode,
      nickname: bill.customerName
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.notify.success('Đã lưu hóa đơn thường dùng');
      },
      error: e => {
        this.saving.set(false);
        this.notify.error(e?.error?.message || 'Không thể lưu hóa đơn');
      }
    });
  }

  resetFlow(): void {
    this.selectedType.set(null);
    this.selectedProvider.set(null);
    this.providers.set([]);
    this.customerCode = '';
    this.lookedUp.set(null);
    this.paid.set(null);
    this.lookupError.set(null);
  }
}
