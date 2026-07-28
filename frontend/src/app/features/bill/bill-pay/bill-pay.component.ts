import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
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

import { PinModalComponent } from '../../../shared/components/pin-modal/pin-modal.component';

type Tab = 'services' | 'bills';
type LinkMode = 'LINK_EXISTING' | 'REGISTER_NEW';

const TYPE_META: Record<BillType, { label: string; icon: string; color: string; bg: string }> = {
  ELECTRICITY: { label: 'Electricity', icon: 'electric_bolt', color: '#f59e0b', bg: '#fef3c7' },
  WATER:       { label: 'Water', icon: 'water_drop', color: '#3b82f6', bg: '#dbeafe' },
  INTERNET:    { label: 'Internet', icon: 'wifi', color: '#8b5cf6', bg: '#ede9fe' }
};

@Component({
  selector: 'app-bill-pay',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, CurrencyPipe, DatePipe, MatIconModule, PinModalComponent],
  template: `
<div class="hub-page">

  <!-- Header -->
  <div class="hub-header">
    <div>
      <div class="header-tag">PAYGATE · UTILITIES</div>
      <h2>Manage Bills & Utilities</h2>
      <p class="subtitle">Link your electricity, water, and internet accounts for one-click bill payment</p>
    </div>
    <button class="btn btn-primary btn-link" (click)="openLinkModal()">
      + Link New Service
    </button>
  </div>

  <!-- Tabs -->
  <div class="tabs">
    <button class="tab" [class.active]="activeTab() === 'services'" (click)="activeTab.set('services')">
      <mat-icon>home</mat-icon> My Services
      <span class="tab-badge" *ngIf="subscriptions().length">{{ subscriptions().length }}</span>
    </button>
    <button class="tab" [class.active]="activeTab() === 'bills'" (click)="activeTab.set('bills')">
      <mat-icon>description</mat-icon> Bills
      <span class="tab-badge unpaid" *ngIf="unpaidCount() > 0">{{ unpaidCount() }}</span>
    </button>
  </div>

  <!-- ====================== TAB: MY SERVICES ====================== -->
  <div *ngIf="activeTab() === 'services'">

    <div *ngIf="loadingSubs()" class="loading-state">
      <div class="spinner"></div> Loading services…
    </div>

    <div *ngIf="!loadingSubs() && subscriptions().length === 0" class="empty-state">
      <mat-icon class="empty-icon">power_off</mat-icon>
      <h3>No services linked</h3>
      <p>Link your electricity, water, and internet accounts for one-click bill viewing and payment</p>
      <button class="btn btn-primary" (click)="openLinkModal()">+ Link Your First Service</button>
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
            <mat-icon class="sub-type-icon">{{ typeIcon(sub.providerType) }}</mat-icon>
            {{ typeLabel(sub.providerType) }}
          </div>
          <span class="sub-status" [class.active]="sub.status === 'ACTIVE'" [class.cancelled]="sub.status === 'CANCELLED'">
            {{ sub.status === 'ACTIVE' ? 'Active' : sub.status }}
          </span>
        </div>

        <div class="sub-provider">{{ sub.providerName }}</div>
        <div class="sub-customer-code">{{ sub.customerCode }}</div>
        <div class="sub-name">{{ sub.customerName }}</div>
        <div class="sub-address" *ngIf="sub.address">{{ sub.address }}</div>
        <div class="sub-meta">
          <span>Frequency: {{ frequencyLabel(sub.frequency) }}</span>
          <span>~{{ sub.cycleAmount | currency:'VND':'symbol':'1.0-0' }}/kỳ</span>
        </div>

        <div class="sub-actions">
          <button class="btn btn-sm btn-pay" (click)="goToBills(sub); $event.stopPropagation()">
            View Bills →
          </button>
          <button
            class="btn btn-sm btn-cancel"
            *ngIf="sub.status === 'ACTIVE'"
            [disabled]="cancellingId() === sub.id"
            (click)="cancelSub(sub); $event.stopPropagation()">
            {{ cancellingId() === sub.id ? '…' : 'Unlink' }}
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- ====================== TAB: BILLS ====================== -->
  <div *ngIf="activeTab() === 'bills'">

    <!-- Sub selector -->
    <div class="sub-selector" *ngIf="subscriptions().length > 0">
      <label>Service:</label>
      <div class="sub-chips">
        <button
          *ngFor="let sub of activeSubscriptions()"
          class="sub-chip"
          [class.selected]="selectedSub()?.id === sub.id"
          (click)="selectSub(sub)">
          {{ sub.providerName }} · {{ sub.customerCode }}
        </button>
      </div>
    </div>

    <div *ngIf="subscriptions().length === 0" class="empty-state">
      <mat-icon class="empty-icon">description</mat-icon>
      <h3>No services linked yet</h3>
      <button class="btn btn-primary" (click)="openLinkModal()">Link a Service Now</button>
    </div>

    <!-- Bills for selected sub -->
    <div *ngIf="selectedSub()">

      <div class="bills-header">
        <div>
          <div class="bills-sub-name">{{ selectedSub()!.providerName }} · {{ selectedSub()!.customerCode }}</div>
          <div class="bills-sub-owner">{{ selectedSub()!.customerName }}</div>
        </div>
        <button class="btn btn-secondary btn-sm" [disabled]="refreshing()" (click)="refreshBill()">
          {{ refreshing() ? 'Updating…' : 'Fetch latest bill' }}
        </button>
      </div>

      <div *ngIf="loadingBills()" class="loading-state">
        <div class="spinner"></div> Loading bills…
      </div>

      <!-- No bills yet -->
      <div *ngIf="!loadingBills() && subBills().length === 0" class="empty-state small">
        <p>No bills yet. Click "Fetch latest bill" to retrieve your bill from the provider.</p>
      </div>

      <!-- Bills list -->
      <div class="bills-list" *ngIf="!loadingBills() && subBills().length > 0">

        <!-- Pay error banner -->
        <div class="pay-error-banner" *ngIf="payError()">
          <mat-icon>warning</mat-icon> <span>{{ payError() }}</span>
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
              {{ bill.status === 'UNPAID' ? 'Unpaid' : '✓ Paid' }}
            </span>
            <button
              *ngIf="bill.status === 'UNPAID'"
              class="btn btn-primary btn-sm btn-pay-now"
              [disabled]="payingBillId() === bill.billId"
              (click)="payBill(bill)">
              {{ payingBillId() === bill.billId ? 'Paying…' : 'Pay Now' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Payment Success Receipt -->
      <div class="receipt" *ngIf="lastPaid()">
        <mat-icon class="receipt-icon">check_circle</mat-icon>
        <h3>Payment Successful</h3>
        <div class="receipt-rows">
          <div><span>Transaction Ref</span><b>{{ lastPaid()!.transactionRef }}</b></div>
          <div><span>Amount</span><b>{{ lastPaid()!.paidAmount | currency:'VND':'symbol':'1.0-0' }}</b></div>
          <div><span>Time</span><b>{{ lastPaid()!.paidAt | date:'dd/MM/yyyy HH:mm' }}</b></div>
        </div>
        <button class="btn btn-secondary btn-sm" (click)="lastPaid.set(null)">Close</button>
      </div>
    </div>
  </div>

</div>

<!-- ====================== LINK MODAL ====================== -->
<div class="modal-backdrop" *ngIf="showLinkModal()" (click)="closeLinkModal()">
  <div class="modal" (click)="$event.stopPropagation()">
    <div class="modal-header">
      <h3>Link a Service Account</h3>
      <button class="modal-close" (click)="closeLinkModal()">✕</button>
    </div>

    <!-- Step 1: Choose type -->
    <div class="modal-section" *ngIf="!linkProvider()">
      <div class="modal-label">Select service type</div>
      <div class="type-grid">
        <button
          *ngFor="let t of billTypeList"
          class="type-card"
          [style.--accent]="t.color"
          [class.selected]="linkTypeFilter === t.type"
          (click)="linkTypeFilter = t.type; loadModalProviders()">
          <mat-icon class="type-icon">{{ t.icon }}</mat-icon>
          <div class="type-label">{{ t.label }}</div>
        </button>
      </div>

      <div *ngIf="linkTypeFilter" class="provider-section">
        <div class="modal-label">Choose a provider</div>
        <div *ngIf="loadingModalProviders()" class="hint">Loading…</div>
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
          <mat-icon>link</mat-icon> I Have a Contract Code
        </button>
        <button class="mode-btn" [class.active]="linkMode === 'REGISTER_NEW'" (click)="linkMode = 'REGISTER_NEW'">
          <mat-icon>add_circle</mat-icon> Register New
        </button>
      </div>

      <div class="mode-hint" *ngIf="linkMode === 'LINK_EXISTING'">
        Enter the customer code / contract number printed on your paper bill
      </div>
      <div class="mode-hint" *ngIf="linkMode === 'REGISTER_NEW'">
        Register a new service account — you will receive a customer code after linking
      </div>

      <!-- LINK_EXISTING fields -->
      <div *ngIf="linkMode === 'LINK_EXISTING'" class="form-fields">
        <label>Customer Code / Contract Number</label>
        <input class="input" [(ngModel)]="linkCustomerCode" placeholder="VD: PE02100001" />
      </div>

      <!-- REGISTER_NEW fields -->
      <div *ngIf="linkMode === 'REGISTER_NEW'" class="form-fields">
        <label>Contract Holder Name</label>
        <input class="input" [(ngModel)]="linkCustomerName" placeholder="e.g. NGUYEN VAN AN" />
        <label>Installation Address</label>
        <input class="input" [(ngModel)]="linkAddress" placeholder="e.g. 123 Nguyen Hue, Q1, HCMC" />
        <label>Estimated Cycle Amount (VND)</label>
        <input class="input" type="number" [(ngModel)]="linkCycleAmount" placeholder="VD: 350000" />
      </div>

      <!-- Frequency -->
      <div class="form-fields">
        <label>Bill Reminder Cycle</label>
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
          {{ linking() ? 'Linking…' : (linkMode === 'LINK_EXISTING' ? 'Link Account' : 'Register & Link') }}
        </button>
      </div>
    </div>
  </div>

  <!-- PIN Security Modal -->
  <app-pin-modal
    [isOpen]="showPinModal()"
    title="Xác thực PIN thanh toán hóa đơn"
    subtitle="Nhập Mã PIN 6 số để xác nhận thanh toán dịch vụ"
    (confirmed)="onPinConfirmed()"
    (cancelled)="showPinModal.set(false)"
  ></app-pin-modal>
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
    .sub-type-badge { display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 700; }
    .sub-type-icon { font-size: 16px; width: 16px; height: 16px; }
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
      font-size: 52px; width: 52px; height: 52px; color: #fff; background: #10b981;
      border-radius: 50%; margin-bottom: 10px;
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
    .type-icon { font-size: 28px; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; }
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
    { type: 'ELECTRICITY' as BillType, label: 'Electricity', icon: 'electric_bolt', color: '#f59e0b' },
    { type: 'WATER' as BillType,       label: 'Water', icon: 'water_drop', color: '#3b82f6' },
    { type: 'INTERNET' as BillType,    label: 'Internet', icon: 'wifi', color: '#8b5cf6' }
  ];

  readonly freqOptions = [
    { value: 'MINUTELY' as BillSubscriptionFrequency, label: 'Every Minute (Demo)' },
    { value: 'MONTHLY' as BillSubscriptionFrequency,  label: 'Monthly' },
    { value: 'WEEKLY' as BillSubscriptionFrequency,   label: 'Weekly' },
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
          this.notify.success('Loaded bill for ' + res.data.period + ' — ' +
            new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(res.data.amount));
        }
      },
      error: e => {
        this.refreshing.set(false);
        this.notify.error(e?.error?.message || 'Could not fetch bill from provider');
      }
    });
  }

  showPinModal = signal(false);
  pendingBillToPay = signal<BillLookupResponse | null>(null);

  payBill(bill: BillLookupResponse): void {
    this.pendingBillToPay.set(bill);
    this.showPinModal.set(true);
  }

  onPinConfirmed(): void {
    this.showPinModal.set(false);
    const bill = this.pendingBillToPay();
    if (!bill) return;

    this.payingBillId.set(bill.billId);
    this.lastPaid.set(null);
    this.payError.set(null);
    this.bill.pay({ billId: bill.billId }).subscribe({
      next: res => {
        this.payingBillId.set(null);
        this.lastPaid.set(res.data ?? null);
        this.notify.success('Payment successful!');
        const sub = this.selectedSub();
        if (sub) this.loadBillsForSub(sub.id);
      },
      error: e => {
        this.payingBillId.set(null);
        const msg = e?.error?.message || e?.message || 'Payment failed';
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
    if (!confirm(`Unlink from ${sub.providerName} (${sub.customerCode})?`)) return;
    this.cancellingId.set(sub.id);
    this.bill.cancelSubscription(sub.id).subscribe({
      next: () => {
        this.cancellingId.set(null);
        this.notify.success('Unlinked successfully');
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
        this.linkError.set('Please enter a customer code');
        return;
      }
      req.customerCode = this.linkCustomerCode.trim();
    } else {
      if (!this.linkCustomerName.trim() || !this.linkAddress.trim() || !this.linkCycleAmount) {
        this.linkError.set('Please fill in all registration details');
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
          `Linked ${sub.providerName} · Code: ${sub.customerCode}`
        );
        this.loadSubscriptions();
        this.activeTab.set('services');
      },
      error: e => {
        this.linking.set(false);
        this.linkError.set(e?.error?.message || 'Link failed. Please try again.');
      }
    });
  }

  // Type helpers
  typeIcon(t: BillType | string): string { return TYPE_META[t as BillType]?.icon ?? 'description'; }
  typeLabel(t: BillType | string): string { return TYPE_META[t as BillType]?.label ?? t; }
  typeColor(t: BillType | string): string { return TYPE_META[t as BillType]?.color ?? '#6b7280'; }
  typeBg(t: BillType | string): string { return TYPE_META[t as BillType]?.bg ?? '#f3f4f6'; }

  frequencyLabel(f: string): string {
    const map: Record<string, string> = {
      MINUTELY: 'Every Minute', DAILY: 'Daily', WEEKLY: 'Weekly', MONTHLY: 'Monthly'
    };
    return map[f] ?? f;
  }
}
