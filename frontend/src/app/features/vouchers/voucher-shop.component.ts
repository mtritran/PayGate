import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VoucherService, VoucherResponse, UserVoucherResponse } from '../../core/services/voucher.service';
import { RewardService, PointsResponse, PointTransactionResponse } from '../../core/services/reward.service';
import { NotificationService } from '../../core/services/notification.service';
import { ApiResponse } from '../../core/models/api-response.model';

@Component({
  selector: 'app-voucher-shop',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="voucher-shop-page">

      <!-- Points Hero Banner -->
      <div class="points-hero" *ngIf="points">
        <div class="hero-content">
          <div class="hero-text">
            <h1 class="hero-title">Voucher Store & Rewards Center</h1>
            <p class="hero-subtitle">Earn points automatically on every payment transaction and redeem exclusive voucher deals</p>
          </div>

          <div class="hero-stats">
            <div class="hero-stat">
              <span class="hero-stat-icon" style="background: #ecfdf5; color: #059669;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                </svg>
              </span>
              <div class="hero-stat-text">
                <span class="hero-stat-label">Total Points</span>
                <span class="hero-stat-value">{{ points.totalPoints | number }} <small>pts</small></span>
              </div>
            </div>
            <div class="hero-stat">
              <span class="hero-stat-icon" style="background: #fef3c7; color: #d97706;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </span>
              <div class="hero-stat-text">
                <span class="hero-stat-label">Member Tier</span>
                <span class="hero-stat-value">{{ points.tier }}</span>
              </div>
            </div>
            <div class="hero-stat">
              <span class="hero-stat-icon" style="background: #eff6ff; color: #2563eb;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
              </span>
              <div class="hero-stat-text">
                <span class="hero-stat-label">Earned This Month</span>
                <span class="hero-stat-value accent">+{{ points.earnedThisMonth | number }} <small>pts</small></span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tabs-bar">
        <button class="tab-btn" [class.active]="activeTab === 'shop'" (click)="activeTab = 'shop'">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
          </svg>
          Redeem
          <span class="tab-count">{{ shopVouchers.length }}</span>
        </button>
        <button class="tab-btn" [class.active]="activeTab === 'my'" (click)="activeTab = 'my'">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 12v8H4v-8M22 7H2v5h20V7zM12 22V7M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z" />
          </svg>
          My Vouchers
          <span class="tab-count">{{ myVouchers.length }}</span>
        </button>
        <button class="tab-btn" [class.active]="activeTab === 'history'" (click)="activeTab = 'history'; loadHistory()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
          </svg>
          History
          <span class="tab-count" *ngIf="pointHistory.length">{{ pointHistory.length }}</span>
        </button>
      </div>

      <!-- Tab: Voucher Shop -->
      <div *ngIf="activeTab === 'shop'">
        <div class="voucher-grid" *ngIf="shopVouchers.length > 0">
          <div class="voucher-card" *ngFor="let voucher of shopVouchers">
            <!-- Card Decorative Top -->
            <div class="voucher-card-top">
              <div class="voucher-code">{{ voucher.code }}</div>
              <span class="voucher-remaining" [class.remaining-low]="voucher.remainingQty <= 0">
                <span class="remaining-dot"></span>
                {{ voucher.remainingQty > 0 ? voucher.remainingQty + ' left' : 'Sold out' }}
              </span>
            </div>

            <div class="voucher-card-body">
              <h3 class="voucher-title">{{ voucher.title }}</h3>

              <div class="voucher-discount">
                <span class="discount-amount">{{ voucher.discountAmount | currency:'VND':'symbol':'1.0-0' }}</span>
                <span class="discount-min">Min order {{ voucher.minOrderAmount | currency:'VND':'symbol':'1.0-0' }}</span>
              </div>

              <div class="voucher-meta">
                <span class="voucher-tag">{{ APPLICABLE_LABELS[voucher.applicableType] || voucher.applicableType }}</span>
                <span class="voucher-expiry">Expires: {{ voucher.expiresAt | date:'dd/MM/yyyy' }}</span>
              </div>
            </div>

            <div class="voucher-card-footer">
              <div class="points-price">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--color-warning-500);">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                <span class="points-value">{{ voucher.pointsRequired | number }} pts</span>
              </div>
              <button class="btn-redeem"
                      (click)="redeem(voucher.id)"
                      [disabled]="redeemingId === voucher.id || (points ? points.totalPoints < voucher.pointsRequired : false) || voucher.remainingQty <= 0">
                <span *ngIf="redeemingId === voucher.id" class="btn-spinner"></span>
                {{ redeemingId === voucher.id ? 'Processing...' : (points && points.totalPoints < voucher.pointsRequired ? 'Not enough pts' : 'Redeem') }}
              </button>
            </div>
          </div>
        </div>

        <div class="empty-state" *ngIf="shopVouchers.length === 0">
          <div class="empty-icon">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10" /><path d="M16 16s-1.5-2-4-2-4 2-4 2" /><line x1="9" y1="9" x2="9.01" y2="9" /><line x1="15" y1="9" x2="15.01" y2="9" />
            </svg>
          </div>
          <h4 class="empty-title">No vouchers available</h4>
          <p class="empty-desc">Redeemable vouchers will appear here. Check back later!</p>
        </div>
      </div>

      <!-- Tab: My Vouchers -->
      <div *ngIf="activeTab === 'my'">
        <div class="voucher-grid" *ngIf="myVouchers.length > 0">
          <div class="user-voucher-card" *ngFor="let voucher of myVouchers"
               [class.status-available]="voucher.status === 'AVAILABLE'"
               [class.status-used]="voucher.status === 'USED'"
               [class.status-expired]="voucher.status === 'EXPIRED'">
            <div class="uvc-status-bar"></div>
            <div class="uvc-body">
              <div class="uvc-header">
                <span class="uvc-code">{{ voucher.voucherCode }}</span>
                <span class="uvc-status-badge"
                      [class.badge-available]="voucher.status === 'AVAILABLE'"
                      [class.badge-used]="voucher.status === 'USED'"
                      [class.badge-expired]="voucher.status === 'EXPIRED'">
                  {{ voucher.status === 'AVAILABLE' ? 'Available' : (voucher.status === 'USED' ? 'Used' : 'Expired') }}
                </span>
              </div>
              <h4 class="uvc-title">{{ voucher.title }}</h4>
              <div class="uvc-discount">Save {{ voucher.discountAmount | currency:'VND':'symbol':'1.0-0' }}</div>
              <div class="uvc-meta">
                <span>Redeemed: {{ voucher.redeemedAt | date:'dd/MM/yyyy' }}</span>
                <span>Expires: {{ voucher.expiresAt | date:'dd/MM/yyyy' }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="empty-state" *ngIf="myVouchers.length === 0">
          <div class="empty-icon">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 12v8H4v-8M22 7H2v5h20V7zM12 22V7M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z" />
            </svg>
          </div>
          <h4 class="empty-title">No vouchers yet</h4>
          <p class="empty-desc">Redeem your reward points for vouchers in the "Redeem" tab!</p>
        </div>
      </div>

      <!-- Tab: Point History -->
      <div *ngIf="activeTab === 'history'">
        <div class="card" *ngIf="pointHistory.length > 0">
          <table class="table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Description</th>
                <th>Transaction Ref</th>
                <th>Points</th>
                <th class="text-right">Date</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let item of pointHistory">
                <td>
                  <span class="history-type" [class.type-earn]="item.type === 'EARN'" [class.type-redeem]="item.type === 'REDEEM'">
                    {{ item.type === 'EARN' ? 'Earned' : 'Redeemed' }}
                  </span>
                </td>
                <td class="text-tertiary">{{ item.description }}</td>
                <td>
                  <code class="txn-ref">{{ item.transactionRef || '-' }}</code>
                </td>
                <td>
                  <span class="points-change" [class.text-success]="item.type === 'EARN'" [class.text-danger]="item.type === 'REDEEM'">
                    {{ item.type === 'EARN' ? '+' : '-' }}{{ item.points }} pts
                  </span>
                </td>
                <td class="text-right text-tertiary text-sm">{{ item.createdAt | date:'dd/MM/yyyy HH:mm' }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="empty-state" *ngIf="pointHistory.length === 0">
          <div class="empty-icon">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <h4 class="empty-title">No history yet</h4>
          <p class="empty-desc">Your point transaction history will be recorded here.</p>
        </div>
      </div>

    </div>
  `,
  styles: [`
    .voucher-shop-page {
      max-width: 1280px;
    }

    /* ── Points Hero ── */
    .points-hero {
      background: linear-gradient(135deg, #059669 0%, #047857 100%);
      border-radius: var(--radius-2xl);
      padding: var(--space-8);
      margin-bottom: var(--space-6);
    }

    .hero-content {
      display: flex;
      flex-direction: column;
      gap: var(--space-6);
    }

    .hero-text {
      text-align: center;
    }

    .hero-title {
      font-size: 1.5rem;
      font-weight: var(--font-weight-bold);
      color: #ffffff;
      margin: 0 0 var(--space-1);
      letter-spacing: -0.02em;
    }

    .hero-subtitle {
      font-size: var(--font-size-sm);
      color: rgba(255, 255, 255, 0.7);
      margin: 0;
    }

    .hero-stats {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: var(--space-4);
    }

    .hero-stat {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      background: rgba(255, 255, 255, 0.95);
      border-radius: var(--radius-xl);
      padding: var(--space-4) var(--space-5);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    }

    .hero-stat-icon {
      width: 44px;
      height: 44px;
      border-radius: var(--radius-lg);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .hero-stat-text {
      display: flex;
      flex-direction: column;
    }

    .hero-stat-label {
      font-size: var(--font-size-xs);
      font-weight: var(--font-weight-medium);
      color: var(--color-text-tertiary);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .hero-stat-value {
      font-size: var(--font-size-xl);
      font-weight: var(--font-weight-bold);
      color: var(--color-text-primary);
      line-height: 1.2;
    }

    .hero-stat-value small {
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-normal);
      color: var(--color-text-tertiary);
    }

    .hero-stat-value.accent {
      color: var(--color-primary-600);
    }

    @media (max-width: 768px) {
      .hero-stats {
        grid-template-columns: 1fr;
      }
      .points-hero {
        padding: var(--space-5);
      }
    }

    /* ── Tabs ── */
    .tabs-bar {
      display: flex;
      gap: var(--space-2);
      margin-bottom: var(--space-6);
      border-bottom: 1px solid var(--color-border-primary);
      padding-bottom: 0;
      overflow-x: auto;
    }

    .tab-btn {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-3) var(--space-4);
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-medium);
      color: var(--color-text-tertiary);
      background: none;
      border: none;
      border-bottom: 2px solid transparent;
      cursor: pointer;
      transition: all var(--transition-fast);
      white-space: nowrap;
      margin-bottom: -1px;
    }

    .tab-btn:hover {
      color: var(--color-text-primary);
    }

    .tab-btn.active {
      color: var(--color-primary-500);
      border-bottom-color: var(--color-primary-500);
    }

    .tab-count {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 20px;
      height: 20px;
      padding: 0 var(--space-1);
      font-size: 11px;
      font-weight: var(--font-weight-bold);
      background: var(--color-bg-tertiary);
      border-radius: var(--radius-full);
      color: var(--color-text-secondary);
    }

    .tab-btn.active .tab-count {
      background: var(--color-primary-100);
      color: var(--color-primary-700);
    }

    /* ── Voucher Grid ── */
    .voucher-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: var(--space-4);
    }

    /* ── Voucher Card (Shop) ── */
    .voucher-card {
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border-primary);
      border-radius: var(--radius-xl);
      overflow: hidden;
      transition: all var(--transition-normal);
      display: flex;
      flex-direction: column;
    }

    .voucher-card:hover {
      box-shadow: var(--shadow-md);
      border-color: var(--color-border-secondary);
      transform: translateY(-2px);
    }

    .voucher-card-top {
      background: linear-gradient(135deg, #059669, #047857);
      padding: var(--space-3) var(--space-4);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .voucher-code {
      font-family: var(--font-family-mono);
      font-weight: var(--font-weight-bold);
      font-size: var(--font-size-sm);
      color: #ffffff;
      letter-spacing: 0.05em;
    }

    .voucher-remaining {
      display: inline-flex;
      align-items: center;
      gap: var(--space-1);
      font-size: 11px;
      font-weight: var(--font-weight-semibold);
      padding: var(--space-1) var(--space-2);
      background: rgba(255, 255, 255, 0.2);
      color: #ffffff;
      border-radius: var(--radius-full);
    }

    .remaining-dot {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: #ffffff;
    }

    .remaining-low .remaining-dot {
      background: #fca5a5;
    }

    .remaining-low {
      background: rgba(239, 68, 68, 0.3);
    }

    .voucher-card-body {
      padding: var(--space-4);
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .voucher-title {
      font-size: var(--font-size-base);
      font-weight: var(--font-weight-semibold);
      color: var(--color-text-primary);
      margin: 0 0 var(--space-3);
      line-height: var(--line-height-tight);
    }

    .voucher-discount {
      margin-bottom: var(--space-3);
    }

    .discount-amount {
      font-size: var(--font-size-2xl);
      font-weight: var(--font-weight-bold);
      color: var(--color-text-error);
      display: block;
      line-height: 1.1;
    }

    .discount-min {
      font-size: var(--font-size-xs);
      color: var(--color-text-tertiary);
    }

    .voucher-meta {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      margin-top: auto;
    }

    .voucher-tag {
      display: inline-flex;
      padding: var(--space-1) var(--space-2);
      background: var(--color-bg-tertiary);
      border-radius: var(--radius-md);
      font-size: var(--font-size-xs);
      font-weight: var(--font-weight-medium);
      color: var(--color-text-secondary);
    }

    .voucher-expiry {
      font-size: var(--font-size-xs);
      color: var(--color-text-tertiary);
    }

    .voucher-card-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--space-3) var(--space-4);
      border-top: 1px solid var(--color-border-primary);
      background: var(--color-bg-tertiary);
    }

    .points-price {
      display: flex;
      align-items: center;
      gap: var(--space-1);
    }

    .points-value {
      font-weight: var(--font-weight-bold);
      font-size: var(--font-size-sm);
      color: var(--color-text-primary);
    }

    .btn-redeem {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-2);
      height: 34px;
      padding: 0 var(--space-4);
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-semibold);
      color: #ffffff;
      background: var(--color-bg-brand);
      border: none;
      border-radius: var(--radius-lg);
      cursor: pointer;
      transition: all var(--transition-fast);
      white-space: nowrap;
    }

    .btn-redeem:hover:not(:disabled) {
      background: var(--color-bg-brand-hover);
      transform: translateY(-1px);
      box-shadow: var(--shadow-brand);
    }

    .btn-redeem:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-spinner {
      display: inline-block;
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }

    /* ── User Voucher Card ── */
    .user-voucher-card {
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border-primary);
      border-radius: var(--radius-xl);
      overflow: hidden;
      display: flex;
      transition: all var(--transition-normal);
    }

    .user-voucher-card:hover {
      box-shadow: var(--shadow-md);
    }

    .uvc-status-bar {
      width: 5px;
      flex-shrink: 0;
    }

    .status-available .uvc-status-bar {
      background: var(--color-success-500);
    }

    .status-used .uvc-status-bar {
      background: var(--color-neutral-400);
    }

    .status-expired .uvc-status-bar {
      background: var(--color-error-500);
    }

    .status-used,
    .status-expired {
      opacity: 0.65;
    }

    .uvc-body {
      padding: var(--space-4);
      flex: 1;
    }

    .uvc-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: var(--space-2);
    }

    .uvc-code {
      font-family: var(--font-family-mono);
      font-weight: var(--font-weight-bold);
      font-size: var(--font-size-base);
      color: var(--color-text-brand);
    }

    .uvc-status-badge {
      font-size: var(--font-size-xs);
      font-weight: var(--font-weight-semibold);
      padding: var(--space-1) var(--space-2);
      border-radius: var(--radius-full);
    }

    .badge-available {
      background: var(--color-success-100);
      color: var(--color-success-700);
    }

    .badge-used {
      background: var(--color-neutral-100);
      color: var(--color-neutral-600);
    }

    .badge-expired {
      background: var(--color-error-100);
      color: var(--color-error-700);
    }

    .uvc-title {
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-medium);
      color: var(--color-text-primary);
      margin: 0 0 var(--space-2);
    }

    .uvc-discount {
      font-size: var(--font-size-lg);
      font-weight: var(--font-weight-bold);
      color: var(--color-text-error);
      margin-bottom: var(--space-2);
    }

    .uvc-meta {
      display: flex;
      gap: var(--space-4);
      font-size: var(--font-size-xs);
      color: var(--color-text-tertiary);
    }

    /* ── History Table ── */
    .card {
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border-primary);
      border-radius: var(--radius-xl);
      overflow: hidden;
    }

    .table {
      width: 100%;
      border-collapse: collapse;
    }

    .table thead th {
      padding: var(--space-3) var(--space-4);
      font-size: var(--font-size-xs);
      font-weight: var(--font-weight-semibold);
      color: var(--color-text-tertiary);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      background: var(--color-bg-tertiary);
      border-bottom: 1px solid var(--color-border-primary);
      white-space: nowrap;
    }

    .table tbody td {
      padding: var(--space-3) var(--space-4);
      border-bottom: 1px solid var(--color-border-primary);
      color: var(--color-text-primary);
      font-size: var(--font-size-sm);
      vertical-align: middle;
    }

    .table tbody tr:last-child td {
      border-bottom: none;
    }

    .table tbody tr {
      transition: background-color var(--transition-fast);
    }

    .table tbody tr:hover {
      background-color: var(--color-bg-hover);
    }

    .text-right { text-align: right; }
    .text-tertiary { color: var(--color-text-tertiary); }
    .text-sm { font-size: var(--font-size-sm); }

    .history-type {
      display: inline-flex;
      padding: var(--space-1) var(--space-2);
      border-radius: var(--radius-md);
      font-size: var(--font-size-xs);
      font-weight: var(--font-weight-semibold);
    }

    .type-earn {
      background: var(--color-success-100);
      color: var(--color-success-700);
    }

    .type-redeem {
      background: var(--color-error-100);
      color: var(--color-error-700);
    }

    .txn-ref {
      font-family: var(--font-family-mono);
      font-size: var(--font-size-xs);
      background: var(--color-bg-tertiary);
      padding: 2px var(--space-1);
      border-radius: var(--radius-sm);
    }

    .points-change {
      font-weight: var(--font-weight-bold);
      font-size: var(--font-size-sm);
    }

    .text-success { color: var(--color-text-success); }
    .text-danger { color: var(--color-text-error); }

    /* ── Empty State ── */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: var(--space-12) var(--space-4);
    }

    .empty-icon {
      width: 72px;
      height: 72px;
      border-radius: var(--radius-full);
      background: var(--color-bg-tertiary);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: var(--space-4);
      color: var(--color-text-tertiary);
    }

    .empty-title {
      font-size: var(--font-size-lg);
      font-weight: var(--font-weight-semibold);
      color: var(--color-text-primary);
      margin: 0 0 var(--space-2);
    }

    .empty-desc {
      font-size: var(--font-size-sm);
      color: var(--color-text-secondary);
      margin: 0;
      max-width: 320px;
    }

    /* ── Animations ── */
    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* ── Global fallbacks ── */
    :host {
      --color-bg-hover: var(--color-neutral-100);
    }
  `]
})
export class VoucherShopComponent implements OnInit {
  private notification = inject(NotificationService);

  activeTab: 'shop' | 'my' | 'history' = 'shop';
  points: PointsResponse | null = null;
  shopVouchers: VoucherResponse[] = [];
  myVouchers: UserVoucherResponse[] = [];
  pointHistory: PointTransactionResponse[] = [];
  redeemingId: number | null = null;

  readonly APPLICABLE_LABELS: Record<string, string> = {
    ALL: 'All',
    BILL_PAYMENT: 'Bill Payment',
    ELECTRICITY: 'Electricity',
    WATER: 'Water',
    INTERNET: 'Internet'
  };

  constructor(
    private voucherService: VoucherService,
    private rewardService: RewardService
  ) {}

  ngOnInit(): void {
    this.loadPoints();
    this.loadShopVouchers();
    this.loadMyVouchers();
  }

  loadPoints(): void {
    this.rewardService.getMyPoints().subscribe({
      next: (res: ApiResponse<PointsResponse>) => {
        if (res.success) this.points = res.data;
      },
      error: (err) => console.error('Failed to load points:', err)
    });
  }

  loadShopVouchers(): void {
    this.voucherService.getShopVouchers().subscribe({
      next: (res: any) => {
        if (res.success && res.data) this.shopVouchers = res.data.content || [];
      },
      error: (err) => console.error('Failed to load shop vouchers:', err)
    });
  }

  loadMyVouchers(): void {
    this.voucherService.getMyVouchers().subscribe({
      next: (res: ApiResponse<UserVoucherResponse[]>) => {
        if (res.success) this.myVouchers = res.data || [];
      },
      error: (err) => console.error('Failed to load my vouchers:', err)
    });
  }

  loadHistory(): void {
    this.rewardService.getPointsHistory().subscribe({
      next: (res: any) => {
        if (res.success && res.data) this.pointHistory = res.data.content || [];
      },
      error: (err) => console.error('Failed to load point history:', err)
    });
  }

  redeem(voucherId: number): void {
    this.redeemingId = voucherId;
    this.voucherService.redeemVoucher(voucherId).subscribe({
      next: (res: ApiResponse<UserVoucherResponse>) => {
        this.redeemingId = null;
        if (res.success) {
          this.notification.success('Voucher redeemed successfully! 🎉');
          this.loadPoints();
          this.loadShopVouchers();
          this.loadMyVouchers();
        }
      },
      error: (err: any) => {
        this.redeemingId = null;
        this.notification.error(err.error?.message || 'Failed to redeem voucher');
      }
    });
  }
}
