import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  BillService,
  BillType,
  BillProviderResponse,
  BillSubscriptionResponse,
  BillLookupResponse,
  BillPayResponse,
  BillSubscriptionFrequency,
  LinkBillRequest
} from '../../../core/services/bill.service';
import { NotificationService } from '../../../core/services/notification.service';

type Tab = 'services' | 'bills';
type LinkMode = 'LINK_EXISTING' | 'REGISTER_NEW';

const TYPE_META: Record<BillType, { label: string; icon: string; color: string; bg: string }> = {
  ELECTRICITY: { label: 'Điện', icon: '⚡', color: '#f59e0b', bg: '#fef3c7' },
  WATER:       { label: 'Nước', icon: '💧', color: '#3b82f6', bg: '#dbeafe' },
  INTERNET:    { label: 'Internet', icon: '🌐', color: '#8b5cf6', bg: '#ede9fe' }
};

@Component({
  selector: 'app-bill-pay',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, CurrencyPipe, DatePipe],
  template: `
<div class="hub-page">

  <!-- Header -->
  <div class="hub-header">
    <div>
      <div class="header-tag">PAYGATE · UTILITIES</div>
      <h2>Quản lý hóa đơn dịch vụ</h2>
      <p class="subtitle">Liên kết tài khoản điện · nước · internet và thanh toán tự động hàng tháng</p>
    </div>
    <button class="btn btn-primary btn-link" (click)="openLinkModal()">
      + Liên kết dịch vụ mới
    </button>
  </div>

  <!-- Tabs -->
  <div class="tabs">
    <button class="tab" [class.active]="activeTab() === 'services'" (click)="activeTab.set('services')">
      🏠 Dịch vụ của tôi
      <span class="tab-badge" *ngIf="subscriptions().length">{{ subscriptions().length }}</span>
    </button>
    <button class="tab" [class.active]="activeTab() === 'bills'" (click)="activeTab.set('bills')">
      📄 Hóa đơn
      <span class="tab-badge unpaid" *ngIf="unpaidCount() > 0">{{ unpaidCount() }}</span>
    </button>
  </div>

  <!-- ====================== TAB: MY SERVICES ====================== -->
  <div *ngIf="activeTab() === 'services'">

    <div *ngIf="loadingSubs()" class="loading-state">
      <div class="spinner"></div> Đang tải dịch vụ…
    </div>

    <div *ngIf="!loadingSubs() && subscriptions().length === 0" class="empty-state">
      <div class="empty-icon">🔌</div>
      <h3>Chưa liên kết dịch vụ nào</h3>
      <p>Liên kết tài khoản điện, nước, internet để xem và thanh toán hóa đơn một chạm</p>
      <button class="btn btn-primary" (click)="openLinkModal()">+ Liên kết dịch vụ đầu tiên</button>
    </div>

    <div class="subs-grid" *ngIf="!loadingSubs() && subscriptions().length > 0">
      <div
        *ngFor="let sub of subscriptions()"
        class="sub-card"
        [class.selected]="selectedSub()?.id === sub.id"
        [style.--accent]="typeColor(sub.providerType)"
        (click)="selectSub(sub)">

        <div class="sub-card-header">
          <div class="sub-type-badge" [style.background]="typeBg(sub.providerType)" [style.color]="typeColor(sub.providerType)">
            {{ typeIcon(sub.providerType) }} {{ typeLabel(sub.providerType) }}
          </div>
          <span class="sub-status" [class.active]="sub.status === 'ACTIVE'" [class.cancelled]="sub.status === 'CANCELLED'">
            {{ sub.status === 'ACTIVE' ? 'Đang hoạt động' : sub.status }}
          </span>
        </div>

        <div class="sub-provider">{{ sub.providerName }}</div>
        <div class="sub-customer-code">{{ sub.customerCode }}</div>
        <div class="sub-name">{{ sub.customerName }}</div>
        <div class="sub-address" *ngIf="sub.address">{{ sub.address }}</div>
        <div class="sub-meta">
          <span>Chu kỳ: {{ frequencyLabel(sub.frequency) }}</span>
          <span>~{{ sub.cycleAmount | currency:'VND':'symbol':'1.0-0' }}/kỳ</span>
        </div>

        <div class="sub-actions">
          <button class="btn btn-sm btn-pay" (click)="goToBills(sub); $event.stopPropagation()">
            Xem hóa đơn →
          </button>
          <button
            class="btn btn-sm btn-cancel"
            *ngIf="sub.status === 'ACTIVE'"
            [disabled]="cancellingId() === sub.id"
            (click)="cancelSub(sub); $event.stopPropagation()">
            {{ cancellingId() === sub.id ? '…' : 'Huỷ liên kết' }}
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- ====================== TAB: BILLS ====================== -->
  <div *ngIf="activeTab() === 'bills'">

    <!-- Sub selector -->
    <div class="sub-selector" *ngIf="subscriptions().length > 0">
      <label>Dịch vụ:</label>
      <div class="sub-chips">
        <button
          *ngFor="let sub of activeSubscriptions()"
          class="sub-chip"
          [class.selected]="selectedSub()?.id === sub.id"
          (click)="selectSub(sub)">
          {{ typeIcon(sub.providerType) }} {{ sub.providerName }} · {{ sub.customerCode }}
        </button>
      </div>
    </div>

    <div *ngIf="subscriptions().length === 0" class="empty-state">
      <div class="empty-icon">📄</div>
      <h3>Chưa có dịch vụ nào được liên kết</h3>
      <button class="btn btn-primary" (click)="openLinkModal()">Liên kết dịch vụ ngay</button>
    </div>

    <!-- Bills for selected sub -->
    <div *ngIf="selectedSub()">

      <div class="bills-header">
        <div>
          <div class="bills-sub-name">{{ selectedSub()!.providerName }} · {{ selectedSub()!.customerCode }}</div>
          <div class="bills-sub-owner">{{ selectedSub()!.customerName }}</div>
        </div>
        <button class="btn btn-secondary btn-sm" [disabled]="refreshing()" (click)="refreshBill()">
          {{ refreshing() ? '⟳ Đang cập nhật…' : '⟳ Tra cứu hóa đơn mới nhất' }}
        </button>
      </div>

      <div *ngIf="loadingBills()" class="loading-state">
        <div class="spinner"></div> Đang tải hóa đơn…
      </div>

      <!-- No bills yet -->
      <div *ngIf="!loadingBills() && subBills().length === 0" class="empty-state small">
        <p>Chưa có hóa đơn nào. Nhấn "Tra cứu hóa đơn mới nhất" để lấy hóa đơn từ nhà cung cấp.</p>
      </div>

      <!-- Bills list -->
      <div class="bills-list" *ngIf="!loadingBills() && subBills().length > 0">

        <!-- Pay error banner -->
        <div class="pay-error-banner" *ngIf="payError()">
          <span>⚠️ {{ payError() }}</span>
          <a routerLink="/topup" class="topup-link">Nạp tiền ngay →</a>
        </div>

        <div *ngFor="let bill of subBills()" class="bill-card" [class.unpaid]="bill.status === 'UNPAID'" [class.paid]="bill.status === 'PAID'">
          <div class="bill-card-left">
            <div class="bill-period">{{ bill.period }}</div>
            <div class="bill-customer">{{ bill.customerName }}</div>
            <div class="bill-address" *ngIf="bill.address">{{ bill.address }}</div>
          </div>
          <div class="bill-card-right">
            <div class="bill-amount">{{ bill.amount | currency:'VND':'symbol':'1.0-0' }}</div>
            <span class="bill-badge" [class.unpaid]="bill.status === 'UNPAID'" [class.paid]="bill.status === 'PAID'">
              {{ bill.status === 'UNPAID' ? 'Chưa thanh toán' : '✓ Đã thanh toán' }}
            </span>
            <button
              *ngIf="bill.status === 'UNPAID'"
              class="btn btn-primary btn-sm btn-pay-now"
              [disabled]="payingBillId() === bill.billId"
              (click)="payBill(bill)">
              {{ payingBillId() === bill.billId ? 'Đang thanh toán…' : 'Thanh toán ngay' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Payment Success Receipt -->
      <div class="receipt" *ngIf="lastPaid()">
        <div class="receipt-icon">✓</div>
        <h3>Thanh toán thành công</h3>
        <div class="receipt-rows">
          <div><span>Mã giao dịch</span><b>{{ lastPaid()!.transactionRef }}</b></div>
          <div><span>Số tiền</span><b>{{ lastPaid()!.paidAmount | currency:'VND':'symbol':'1.0-0' }}</b></div>
          <div><span>Thời gian</span><b>{{ lastPaid()!.paidAt | date:'dd/MM/yyyy HH:mm' }}</b></div>
        </div>
        <button class="btn btn-secondary btn-sm" (click)="lastPaid.set(null)">Đóng</button>
      </div>
    </div>
  </div>

</div>

<!-- ====================== LINK MODAL ====================== -->
<div class="modal-backdrop" *ngIf="showLinkModal()" (click)="closeLinkModal()">
  <div class="modal" (click)="$event.stopPropagation()">
    <div class="modal-header">
      <h3>Liên kết tài khoản dịch vụ</h3>
      <button class="modal-close" (click)="closeLinkModal()">✕</button>
    </div>

    <!-- Step 1: Choose type -->
    <div class="modal-section" *ngIf="!linkProvider()">
      <div class="modal-label">Chọn loại dịch vụ</div>
      <div class="type-grid">
        <button
          *ngFor="let t of billTypeList"
          class="type-card"
          [style.--accent]="t.color"
          [class.selected]="linkTypeFilter === t.type"
          (click)="linkTypeFilter = t.type; loadModalProviders()">
          <div class="type-icon">{{ t.icon }}</div>
          <div class="type-label">{{ t.label }}</div>
        </button>
      </div>

      <div *ngIf="linkTypeFilter" class="provider-section">
        <div class="modal-label">Chọn nhà cung cấp</div>
        <div *ngIf="loadingModalProviders()" class="hint">Đang tải…</div>
        <div class="provider-chips" *ngIf="!loadingModalProviders()">
          <button
            *ngFor="let p of modalProviders()"
            class="provider-chip"
            [class.selected]="linkProvider()?.code === p.code"
            (click)="selectLinkProvider(p)">
            {{ p.name }}
          </button>
        </div>
      </div>
    </div>

    <!-- Step 2: Link mode + details -->
    <div class="modal-section" *ngIf="linkProvider()">
      <div class="back-row">
        <button class="btn-back" (click)="linkProvider.set(null)">← {{ linkProvider()!.name }}</button>
      </div>

      <!-- Mode toggle -->
      <div class="mode-toggle">
        <button class="mode-btn" [class.active]="linkMode === 'LINK_EXISTING'" (click)="linkMode = 'LINK_EXISTING'">
          🔗 Có sẵn mã hợp đồng
        </button>
        <button class="mode-btn" [class.active]="linkMode === 'REGISTER_NEW'" (click)="linkMode = 'REGISTER_NEW'">
          ✨ Đăng ký mới
        </button>
      </div>

      <div class="mode-hint" *ngIf="linkMode === 'LINK_EXISTING'">
        Nhập mã khách hàng / số hợp đồng in trên hóa đơn giấy của bạn
      </div>
      <div class="mode-hint" *ngIf="linkMode === 'REGISTER_NEW'">
        Đăng ký tài khoản dịch vụ mới — bạn sẽ nhận mã khách hàng sau khi liên kết
      </div>

      <!-- LINK_EXISTING fields -->
      <div *ngIf="linkMode === 'LINK_EXISTING'" class="form-fields">
        <label>Mã khách hàng / số hợp đồng</label>
        <input class="input" [(ngModel)]="linkCustomerCode" placeholder="VD: PE02100001" />
      </div>

      <!-- REGISTER_NEW fields -->
      <div *ngIf="linkMode === 'REGISTER_NEW'" class="form-fields">
        <label>Tên chủ hợp đồng</label>
        <input class="input" [(ngModel)]="linkCustomerName" placeholder="VD: NGUYEN VAN AN" />
        <label>Địa chỉ lắp đặt</label>
        <input class="input" [(ngModel)]="linkAddress" placeholder="VD: 123 Nguyễn Huệ, Q1, HCM" />
        <label>Số tiền kỳ ước tính (VND)</label>
        <input class="input" type="number" [(ngModel)]="linkCycleAmount" placeholder="VD: 350000" />
      </div>

      <!-- Frequency -->
      <div class="form-fields">
        <label>Chu kỳ nhắc hóa đơn</label>
        <div class="freq-chips">
          <button *ngFor="let f of freqOptions" class="freq-chip" [class.selected]="linkFrequency === f.value" (click)="linkFrequency = f.value">
            {{ f.label }}
          </button>
        </div>
      </div>

      <div class="modal-error" *ngIf="linkError()">{{ linkError() }}</div>

      <div class="modal-actions">
        <button class="btn btn-secondary" (click)="closeLinkModal()">Huỷ</button>
        <button class="btn btn-primary" [disabled]="linking()" (click)="submitLink()">
          {{ linking() ? 'Đang liên kết…' : (linkMode === 'LINK_EXISTING' ? '🔗 Liên kết tài khoản' : '✨ Đăng ký & Liên kết') }}
        </button>
      </div>
    </div>
  </div>
</div>
  `,
  styles: [`
    .hub-page { max-width: 1000px; margin: 0 auto; padding: 32px 24px; }

    .hub-header {
      display: flex; align-items: flex-start; justify-content: space-between;
      margin-bottom: 28px; flex-wrap: wrap; gap: 16px;
    }
    .header-tag {
      display: inline-block; font-size: 11px; font-weight: 700; letter-spacing: 2px;
      color: #059669; background: #d1fae5; padding: 4px 10px; border-radius: 4px; margin-bottom: 6px;
    }
    .hub-header h2 { margin: 0 0 4px; font-size: 26px; font-weight: 700; color: #111827; }
    .subtitle { margin: 0; color: #6b7280; font-size: 14px; }

    .tabs { display: flex; gap: 4px; border-bottom: 2px solid #e5e7eb; margin-bottom: 24px; }
    .tab {
      display: flex; align-items: center; gap: 8px;
      padding: 10px 20px; font-weight: 600; font-size: 14px; color: #6b7280;
      background: none; border: none; border-bottom: 2px solid transparent; margin-bottom: -2px;
      cursor: pointer; transition: 0.15s;
    }
    .tab.active { color: #059669; border-bottom-color: #059669; }
    .tab:hover:not(.active) { color: #374151; }
    .tab-badge {
      display: inline-flex; align-items: center; justify-content: center;
      width: 20px; height: 20px; border-radius: 50%; background: #e5e7eb; color: #374151;
      font-size: 11px; font-weight: 700;
    }
    .tab-badge.unpaid { background: #fef3c7; color: #92400e; }

    /* Subscriptions grid */
    .subs-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
    .sub-card {
      --accent: #10b981;
      background: #fff; border: 2px solid #e5e7eb; border-radius: 14px;
      padding: 20px; cursor: pointer; transition: 0.15s;
    }
    .sub-card:hover, .sub-card.selected { border-color: var(--accent); box-shadow: 0 4px 16px rgba(0,0,0,0.08); }
    .sub-card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .sub-type-badge { padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 700; }
    .sub-status { font-size: 12px; font-weight: 600; }
    .sub-status.active { color: #059669; }
    .sub-status.cancelled { color: #9ca3af; }
    .sub-provider { font-size: 15px; font-weight: 700; color: #111827; margin-bottom: 4px; }
    .sub-customer-code { font-family: 'SF Mono', monospace; font-size: 13px; color: #059669; font-weight: 700; margin-bottom: 2px; }
    .sub-name { font-size: 13px; color: #374151; font-weight: 600; margin-bottom: 2px; }
    .sub-address { font-size: 12px; color: #6b7280; margin-bottom: 8px; }
    .sub-meta { display: flex; justify-content: space-between; font-size: 12px; color: #6b7280; margin-bottom: 12px; }
    .sub-actions { display: flex; gap: 8px; }

    /* Bills tab */
    .sub-selector { margin-bottom: 20px; }
    .sub-selector label { font-size: 13px; color: #6b7280; font-weight: 600; margin-bottom: 8px; display: block; }
    .sub-chips { display: flex; flex-wrap: wrap; gap: 8px; }
    .sub-chip {
      padding: 8px 14px; border: 1.5px solid #e5e7eb; border-radius: 20px;
      font-size: 13px; font-weight: 600; color: #374151; background: #f9fafb; cursor: pointer; transition: 0.15s;
    }
    .sub-chip.selected { background: #10b981; color: #fff; border-color: #10b981; }
    .sub-chip:hover:not(.selected) { border-color: #10b981; color: #059669; }

    .bills-header {
      display: flex; justify-content: space-between; align-items: flex-start;
      margin-bottom: 16px; flex-wrap: wrap; gap: 12px;
    }
    .bills-sub-name { font-size: 16px; font-weight: 700; color: #111827; }
    .bills-sub-owner { font-size: 13px; color: #6b7280; }

    .bills-list { display: flex; flex-direction: column; gap: 12px; }
    .bill-card {
      display: flex; justify-content: space-between; align-items: center;
      background: #fff; border: 1.5px solid #e5e7eb; border-radius: 12px; padding: 16px 20px;
      gap: 16px; flex-wrap: wrap;
    }
    .bill-card.unpaid { border-color: #fcd34d; }
    .bill-card.paid { border-color: #a7f3d0; opacity: 0.8; }
    .bill-period { font-size: 15px; font-weight: 700; color: #111827; margin-bottom: 4px; }
    .bill-customer { font-size: 13px; color: #374151; }
    .bill-address { font-size: 12px; color: #6b7280; }
    .bill-card-right { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; }
    .bill-amount { font-size: 20px; font-weight: 700; color: #059669; }
    .bill-badge { padding: 3px 10px; border-radius: 6px; font-size: 12px; font-weight: 600; }
    .bill-badge.unpaid { background: #fef3c7; color: #92400e; }
    .bill-badge.paid { background: #d1fae5; color: #065f46; }
    .btn-pay-now { min-width: 160px; }

    /* Receipt */
    .receipt {
      background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
      border-radius: 14px; padding: 28px; text-align: center; margin-top: 20px;
    }
    .receipt-icon {
      display: inline-flex; width: 52px; height: 52px; border-radius: 50%;
      background: #10b981; color: #fff; font-size: 26px; font-weight: 700;
      align-items: center; justify-content: center; margin-bottom: 10px;
    }
    .receipt h3 { color: #065f46; margin: 0 0 14px; }
    .receipt-rows { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
    .receipt-rows div { display: flex; justify-content: space-between; max-width: 420px; margin: 0 auto; width: 100%; }
    .receipt-rows span { color: #047857; }
    .receipt-rows b { color: #064e3b; font-weight: 700; }

    /* Pay error banner */
    .pay-error-banner {
      display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;
      background: #fef2f2; border: 1.5px solid #fca5a5; border-radius: 10px;
      padding: 12px 16px; margin-bottom: 12px; font-size: 14px; color: #b91c1c;
    }
    .topup-link {
      color: #059669; font-weight: 700; text-decoration: none; white-space: nowrap;
    }
    .topup-link:hover { text-decoration: underline; }

    /* Loading / Empty */
    .loading-state { display: flex; align-items: center; gap: 12px; padding: 32px; color: #6b7280; }
    .spinner {
      width: 20px; height: 20px; border: 2px solid #e5e7eb; border-top-color: #10b981;
      border-radius: 50%; animation: spin 0.6s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .empty-state { text-align: center; padding: 48px 24px; }
    .empty-state.small { padding: 24px; }
    .empty-icon { font-size: 48px; margin-bottom: 12px; }
    .empty-state h3 { color: #111827; margin: 0 0 8px; }
    .empty-state p { color: #6b7280; margin: 0 0 16px; font-size: 14px; }

    /* Buttons */
    .btn {
      padding: 10px 20px; font-weight: 600; border-radius: 8px;
      cursor: pointer; border: none; font-size: 14px; transition: 0.15s;
      display: inline-flex; align-items: center; justify-content: center; gap: 6px;
    }
    .btn:disabled { opacity: 0.6; cursor: not-allowed; }
    .btn-primary { background: #10b981; color: #fff; }
    .btn-primary:hover:not(:disabled) { background: #059669; }
    .btn-secondary { background: #f3f4f6; color: #374151; border: 1px solid #e5e7eb; }
    .btn-secondary:hover:not(:disabled) { background: #e5e7eb; }
    .btn-link { padding: 10px 18px; font-size: 14px; }
    .btn-sm { padding: 7px 14px; font-size: 13px; }
    .btn-pay { background: #10b981; color: #fff; }
    .btn-pay:hover:not(:disabled) { background: #059669; }
    .btn-cancel { background: #fee2e2; color: #991b1b; }
    .btn-cancel:hover:not(:disabled) { background: #fecaca; }

    /* Modal */
    .modal-backdrop {
      position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 100;
      display: flex; align-items: center; justify-content: center; padding: 20px;
    }
    .modal {
      background: #fff; border-radius: 16px; width: 100%; max-width: 520px;
      max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.2);
    }
    .modal-header {
      display: flex; justify-content: space-between; align-items: center;
      padding: 20px 24px; border-bottom: 1px solid #f3f4f6;
    }
    .modal-header h3 { margin: 0; font-size: 17px; font-weight: 700; color: #111827; }
    .modal-close {
      background: none; border: none; font-size: 18px; color: #6b7280; cursor: pointer; padding: 4px;
    }
    .modal-section { padding: 20px 24px; }
    .modal-label { font-size: 13px; font-weight: 700; color: #374151; margin-bottom: 12px; letter-spacing: 0.3px; }

    .type-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 20px; }
    .type-card {
      --accent: #10b981;
      background: #fff; border: 2px solid #e5e7eb; border-radius: 10px;
      padding: 16px 8px; cursor: pointer; transition: 0.15s;
      display: flex; flex-direction: column; align-items: center; gap: 6px;
    }
    .type-card:hover { border-color: var(--accent); }
    .type-card.selected { border-color: var(--accent); background: color-mix(in srgb, var(--accent) 8%, white); }
    .type-icon { font-size: 24px; }
    .type-label { font-weight: 600; font-size: 13px; color: #111827; }

    .provider-section { border-top: 1px dashed #e5e7eb; padding-top: 16px; }
    .provider-chips { display: flex; flex-wrap: wrap; gap: 8px; }
    .provider-chip {
      background: #f9fafb; border: 1.5px solid #e5e7eb; border-radius: 20px;
      padding: 8px 16px; cursor: pointer; font-size: 13px; font-weight: 600; color: #374151;
      transition: 0.15s;
    }
    .provider-chip:hover { border-color: #10b981; color: #059669; }
    .provider-chip.selected { background: #10b981; color: #fff; border-color: #10b981; }

    .back-row { margin-bottom: 16px; }
    .btn-back { background: none; border: none; color: #059669; font-weight: 700; font-size: 14px; cursor: pointer; padding: 0; }

    .mode-toggle { display: flex; gap: 8px; margin-bottom: 12px; }
    .mode-btn {
      flex: 1; padding: 10px; border: 2px solid #e5e7eb; border-radius: 8px;
      background: #f9fafb; font-size: 13px; font-weight: 600; color: #374151; cursor: pointer; transition: 0.15s;
    }
    .mode-btn.active { border-color: #10b981; background: #f0fdf4; color: #065f46; }
    .mode-hint { font-size: 12px; color: #6b7280; margin-bottom: 16px; padding: 8px 12px; background: #f9fafb; border-radius: 6px; }

    .form-fields { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
    .form-fields label { font-size: 12px; font-weight: 700; color: #374151; margin-bottom: 2px; }
    .input {
      padding: 10px 14px; font-size: 14px; border: 1.5px solid #d1d5db; border-radius: 8px;
      font-family: inherit; width: 100%; box-sizing: border-box;
    }
    .input:focus { outline: none; border-color: #10b981; box-shadow: 0 0 0 3px rgba(16,185,129,0.15); }

    .freq-chips { display: flex; flex-wrap: wrap; gap: 8px; }
    .freq-chip {
      padding: 7px 14px; border: 1.5px solid #e5e7eb; border-radius: 20px;
      font-size: 12px; font-weight: 600; color: #374151; background: #f9fafb; cursor: pointer; transition: 0.15s;
    }
    .freq-chip.selected { background: #10b981; color: #fff; border-color: #10b981; }

    .modal-error { margin-bottom: 12px; padding: 10px 14px; background: #fee2e2; color: #b91c1c; border-radius: 8px; font-size: 13px; }
    .modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 16px; }

    .hint { color: #6b7280; font-size: 13px; padding: 8px 0; }
  `]
})
export class BillPayComponent implements OnInit {
  private bill = inject(BillService);
  private notify = inject(NotificationService);

  // Tabs
  activeTab = signal<Tab>('services');

  // Subscriptions
  subscriptions = signal<BillSubscriptionResponse[]>([]);
  loadingSubs = signal(false);
  selectedSub = signal<BillSubscriptionResponse | null>(null);
  cancellingId = signal<number | null>(null);

  activeSubscriptions = computed(() => this.subscriptions().filter(s => s.status === 'ACTIVE'));
  unpaidCount = computed(() => this.subBills().filter(b => b.status === 'UNPAID').length);

  // Bills for selected subscription
  subBills = signal<BillLookupResponse[]>([]);
  loadingBills = signal(false);
  refreshing = signal(false);
  payingBillId = signal<number | null>(null);
  lastPaid = signal<BillPayResponse | null>(null);
  payError = signal<string | null>(null);

  // Link modal
  showLinkModal = signal(false);
  linkMode: LinkMode = 'LINK_EXISTING';
  linkTypeFilter: BillType | null = null;
  linkProvider = signal<BillProviderResponse | null>(null);
  linkCustomerCode = '';
  linkCustomerName = '';
  linkAddress = '';
  linkCycleAmount: number | null = null;
  linkFrequency: BillSubscriptionFrequency = 'MONTHLY';
  linking = signal(false);
  linkError = signal<string | null>(null);
  modalProviders = signal<BillProviderResponse[]>([]);
  loadingModalProviders = signal(false);

  readonly billTypeList = [
    { type: 'ELECTRICITY' as BillType, label: 'Điện', icon: '⚡', color: '#f59e0b' },
    { type: 'WATER' as BillType,       label: 'Nước', icon: '💧', color: '#3b82f6' },
    { type: 'INTERNET' as BillType,    label: 'Internet', icon: '🌐', color: '#8b5cf6' }
  ];

  readonly freqOptions = [
    { value: 'MINUTELY' as BillSubscriptionFrequency, label: 'Mỗi phút (Demo)' },
    { value: 'MONTHLY' as BillSubscriptionFrequency,  label: 'Hàng tháng' },
    { value: 'WEEKLY' as BillSubscriptionFrequency,   label: 'Hàng tuần' },
  ];

  ngOnInit(): void {
    this.loadSubscriptions();
  }

  private loadSubscriptions(): void {
    this.loadingSubs.set(true);
    this.bill.getSubscriptions().subscribe({
      next: res => {
        this.subscriptions.set(res.data ?? []);
        this.loadingSubs.set(false);
        // Auto-select first active
        if (!this.selectedSub() && this.activeSubscriptions().length > 0) {
          this.selectSub(this.activeSubscriptions()[0]);
        }
      },
      error: () => this.loadingSubs.set(false)
    });
  }

  selectSub(sub: BillSubscriptionResponse): void {
    this.selectedSub.set(sub);
    this.lastPaid.set(null);
    this.loadBillsForSub(sub.id);
  }

  private loadBillsForSub(subId: number): void {
    this.loadingBills.set(true);
    this.subBills.set([]);
    this.bill.getBillsForSubscription(subId).subscribe({
      next: res => {
        this.subBills.set(res.data ?? []);
        this.loadingBills.set(false);
      },
      error: () => this.loadingBills.set(false)
    });
  }

  refreshBill(): void {
    const sub = this.selectedSub();
    if (!sub) return;
    this.refreshing.set(true);
    this.bill.refreshCurrentBill(sub.id).subscribe({
      next: res => {
        this.refreshing.set(false);
        this.loadBillsForSub(sub.id);
        if (res.data?.status === 'UNPAID') {
          this.notify.success('Đã tải hóa đơn kỳ ' + res.data.period + ' — ' +
            new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(res.data.amount));
        }
      },
      error: e => {
        this.refreshing.set(false);
        this.notify.error(e?.error?.message || 'Không thể tra cứu hóa đơn từ nhà cung cấp');
      }
    });
  }

  payBill(bill: BillLookupResponse): void {
    this.payingBillId.set(bill.billId);
    this.lastPaid.set(null);
    this.payError.set(null);
    this.bill.pay({ billId: bill.billId }).subscribe({
      next: res => {
        this.payingBillId.set(null);
        this.lastPaid.set(res.data ?? null);
        this.notify.success('Thanh toán thành công!');
        const sub = this.selectedSub();
        if (sub) this.loadBillsForSub(sub.id);
      },
      error: e => {
        this.payingBillId.set(null);
        const msg = e?.error?.message || e?.message || 'Thanh toán thất bại';
        this.payError.set(msg);
        this.notify.error(msg);
      }
    });
  }

  goToBills(sub: BillSubscriptionResponse): void {
    this.selectedSub.set(sub);
    this.activeTab.set('bills');
    this.loadBillsForSub(sub.id);
  }

  cancelSub(sub: BillSubscriptionResponse): void {
    if (!confirm(`Huỷ liên kết với ${sub.providerName} (${sub.customerCode})?`)) return;
    this.cancellingId.set(sub.id);
    this.bill.cancelSubscription(sub.id).subscribe({
      next: () => {
        this.cancellingId.set(null);
        this.notify.success('Đã huỷ liên kết');
        this.loadSubscriptions();
      },
      error: e => {
        this.cancellingId.set(null);
        this.notify.error(e?.error?.message || 'Huỷ thất bại');
      }
    });
  }

  // ----- Modal -----
  openLinkModal(): void {
    this.linkProvider.set(null);
    this.linkTypeFilter = null;
    this.linkMode = 'LINK_EXISTING';
    this.linkCustomerCode = '';
    this.linkCustomerName = '';
    this.linkAddress = '';
    this.linkCycleAmount = null;
    this.linkFrequency = 'MONTHLY';
    this.linkError.set(null);
    this.showLinkModal.set(true);
  }

  closeLinkModal(): void {
    this.showLinkModal.set(false);
  }

  loadModalProviders(): void {
    if (!this.linkTypeFilter) return;
    this.loadingModalProviders.set(true);
    this.bill.getProviders(this.linkTypeFilter).subscribe({
      next: res => {
        this.modalProviders.set(res.data ?? []);
        this.loadingModalProviders.set(false);
      },
      error: () => this.loadingModalProviders.set(false)
    });
  }

  selectLinkProvider(p: BillProviderResponse): void {
    this.linkProvider.set(p);
    this.linkError.set(null);
  }

  submitLink(): void {
    const p = this.linkProvider();
    if (!p) return;

    this.linkError.set(null);

    const req: LinkBillRequest = {
      providerCode: p.code,
      frequency: this.linkFrequency
    };

    if (this.linkMode === 'LINK_EXISTING') {
      if (!this.linkCustomerCode.trim()) {
        this.linkError.set('Vui lòng nhập mã khách hàng');
        return;
      }
      req.customerCode = this.linkCustomerCode.trim();
    } else {
      if (!this.linkCustomerName.trim() || !this.linkAddress.trim() || !this.linkCycleAmount) {
        this.linkError.set('Vui lòng điền đầy đủ thông tin đăng ký');
        return;
      }
      req.customerName = this.linkCustomerName.trim();
      req.address = this.linkAddress.trim();
      req.cycleAmount = this.linkCycleAmount;
    }

    this.linking.set(true);
    this.bill.linkAccount(req).subscribe({
      next: res => {
        this.linking.set(false);
        this.closeLinkModal();
        const sub = res.data!;
        this.notify.success(
          `✅ Đã liên kết ${sub.providerName} · Mã KH: ${sub.customerCode}`
        );
        this.loadSubscriptions();
        this.activeTab.set('services');
      },
      error: e => {
        this.linking.set(false);
        this.linkError.set(e?.error?.message || 'Liên kết thất bại. Vui lòng thử lại.');
      }
    });
  }

  // Type helpers
  typeIcon(t: BillType | string): string { return TYPE_META[t as BillType]?.icon ?? '📋'; }
  typeLabel(t: BillType | string): string { return TYPE_META[t as BillType]?.label ?? t; }
  typeColor(t: BillType | string): string { return TYPE_META[t as BillType]?.color ?? '#6b7280'; }
  typeBg(t: BillType | string): string { return TYPE_META[t as BillType]?.bg ?? '#f3f4f6'; }

  frequencyLabel(f: string): string {
    const map: Record<string, string> = {
      MINUTELY: 'Mỗi phút', DAILY: 'Hàng ngày', WEEKLY: 'Hàng tuần', MONTHLY: 'Hàng tháng'
    };
    return map[f] ?? f;
  }
}
