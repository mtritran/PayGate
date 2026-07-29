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
    <div class="voucher-shop-momo fade-in-up">

      <!-- MOMO PINK & EMERALD HERO BANNER -->
      <div class="momo-hero-card">
        <div class="hero-bg-glow"></div>
        <div class="hero-bg-glow-right"></div>

        <div class="hero-inner">
          <div class="hero-top-bar">
            <div class="hero-badge-pink">
              <span class="pulse-pink-dot"></span>
              <span class="badge-text">PAYGATE VOUCHER & REWARDS</span>
            </div>
            <div class="tier-pill-pink">
              <span class="tier-icon">👑</span>
              <span class="tier-name">{{ points?.tier || 'SILVER' }} MEMBER</span>
            </div>
          </div>

          <div class="hero-headline-group">
            <h1 class="hero-headline">
              Voucher <span class="highlight-pink">Reward Store</span> PayGate
            </h1>
            <p class="hero-description">
              Earn reward points automatically on every payment transaction. Redeem points for exclusive discount vouchers instantly!
            </p>
          </div>

          <!-- 3 Stats Cards Row -->
          <div class="momo-stats-grid">
            <div class="stat-card-momo accent-pink">
              <div class="stat-icon-box pink-bg">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 16 14"/>
                </svg>
              </div>
              <div class="stat-detail">
                <span class="stat-title">TOTAL REWARD POINTS</span>
                <div class="stat-number text-pink">
                  {{ (points?.totalPoints || 0) | number }} <small>PTS</small>
                </div>
              </div>
            </div>

            <div class="stat-card-momo accent-emerald">
              <div class="stat-icon-box emerald-bg">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                </svg>
              </div>
              <div class="stat-detail">
                <span class="stat-title">EARNED THIS MONTH</span>
                <div class="stat-number text-emerald">
                  +{{ (points?.earnedThisMonth || 0) | number }} <small>PTS</small>
                </div>
              </div>
            </div>

            <div class="stat-card-momo accent-purple">
              <div class="stat-icon-box purple-bg">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M20 12v8H4v-8M22 7H2v5h20V7zM12 22V7M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/>
                </svg>
              </div>
              <div class="stat-detail">
                <span class="stat-title">AVAILABLE DEALS</span>
                <div class="stat-number text-purple">
                  {{ shopVouchers.length }} <small>DEALS</small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- MOMO PINK TABS NAVIGATION -->
      <div class="tabs-wrapper">
        <div class="momo-tabs-container">
          <button class="tab-item" [class.active]="activeTab === 'shop'" (click)="activeTab = 'shop'">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
            </svg>
            <span>REDEEM DEALS</span>
            <span class="count-tag">{{ shopVouchers.length }}</span>
          </button>

          <button class="tab-item" [class.active]="activeTab === 'my'" (click)="activeTab = 'my'">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 12v8H4v-8M22 7H2v5h20V7zM12 22V7M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/>
            </svg>
            <span>MY VOUCHERS</span>
            <span class="count-tag">{{ myVouchers.length }}</span>
          </button>

          <button class="tab-item" [class.active]="activeTab === 'history'" (click)="activeTab = 'history'; loadHistory()">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            <span>POINT LOGS</span>
            <span class="count-tag" *ngIf="pointHistory.length">{{ pointHistory.length }}</span>
          </button>
        </div>
      </div>

      <!-- TAB 1: REDEEM VOUCHERS SHOP -->
      <div *ngIf="activeTab === 'shop'" class="tab-pane">
        <div class="vouchers-grid" *ngIf="shopVouchers.length > 0">
          <div class="momo-voucher-card" *ngFor="let voucher of shopVouchers">
            <div class="ticket-header">
              <div class="voucher-code-chip">
                <span class="chip-dot"></span>
                <span>{{ voucher.code }}</span>
              </div>
              <span class="stock-badge" [class.stock-out]="voucher.remainingQty <= 0">
                {{ voucher.remainingQty > 0 ? (voucher.remainingQty + ' left') : 'Sold out' }}
              </span>
            </div>

            <div class="ticket-body">
              <h3 class="voucher-title">{{ voucher.title }}</h3>

              <div class="discount-box">
                <span class="discount-label">INSTANT DISCOUNT</span>
                <span class="discount-amount">{{ voucher.discountAmount | currency:'VND':'symbol':'1.0-0' }}</span>
                <span class="discount-rule">For orders over {{ voucher.minOrderAmount | currency:'VND':'symbol':'1.0-0' }}</span>
              </div>

              <div class="meta-row">
                <span class="meta-tag">{{ APPLICABLE_LABELS[voucher.applicableType] || voucher.applicableType }}</span>
                <span class="expiry-text">Exp: {{ voucher.expiresAt | date:'dd/MM/yyyy' }}</span>
              </div>
            </div>

            <div class="coupon-divider">
              <div class="circle-notch notch-l"></div>
              <div class="dashed-line"></div>
              <div class="circle-notch notch-r"></div>
            </div>

            <div class="ticket-footer">
              <div class="pts-cost">
                <span class="pts-title">EXCHANGE PRICE</span>
                <div class="pts-display">
                  <span class="pts-val">{{ voucher.pointsRequired | number }}</span>
                  <span class="pts-unit">PTS</span>
                </div>
              </div>

              <button class="btn-momo-pink"
                      (click)="redeem(voucher.id)"
                      [disabled]="redeemingId === voucher.id || (points ? points.totalPoints < voucher.pointsRequired : false) || voucher.remainingQty <= 0">
                <span *ngIf="redeemingId === voucher.id" class="btn-spinner"></span>
                <span>
                  {{ redeemingId === voucher.id ? 'Redeeming...' : (points && points.totalPoints < voucher.pointsRequired ? 'Need Points' : 'Redeem Now') }}
                </span>
              </button>
            </div>
          </div>
        </div>

        <div class="empty-card" *ngIf="shopVouchers.length === 0">
          <div class="empty-icon-circle">🎁</div>
          <h4>No Vouchers Available Currently</h4>
          <p>Check back soon for new promotions and reward offers!</p>
        </div>
      </div>

      <!-- TAB 2: MY VOUCHERS WALLET -->
      <div *ngIf="activeTab === 'my'" class="tab-pane">
        <div class="vouchers-grid" *ngIf="myVouchers.length > 0">
          <div class="my-voucher-card" *ngFor="let voucher of myVouchers"
               [class.my-avail]="voucher.status === 'AVAILABLE'"
               [class.my-used]="voucher.status === 'USED'"
               [class.my-exp]="voucher.status === 'EXPIRED'">
            <div class="my-card-stripe"></div>
            <div class="my-card-content">
              <div class="my-card-top">
                <span class="my-code">{{ voucher.voucherCode }}</span>
                <span class="my-status-badge"
                      [class.bg-avail]="voucher.status === 'AVAILABLE'"
                      [class.bg-used]="voucher.status === 'USED'"
                      [class.bg-exp]="voucher.status === 'EXPIRED'">
                  {{ voucher.status === 'AVAILABLE' ? 'Ready to use' : (voucher.status === 'USED' ? 'Used' : 'Expired') }}
                </span>
              </div>
              <h4 class="my-title">{{ voucher.title }}</h4>
              <div class="my-discount">Save {{ voucher.discountAmount | currency:'VND':'symbol':'1.0-0' }}</div>
              <div class="my-dates">
                <span>Redeemed: {{ voucher.redeemedAt | date:'dd/MM/yyyy' }}</span>
                <span>Expiry: {{ voucher.expiresAt | date:'dd/MM/yyyy' }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="empty-card" *ngIf="myVouchers.length === 0">
          <div class="empty-icon-circle">🎟️</div>
          <h4>Your Voucher Wallet is Empty</h4>
          <p>Go to "Redeem Deals" tab and exchange your reward points for instant vouchers!</p>
        </div>
      </div>

      <!-- TAB 3: POINT LOGS -->
      <div *ngIf="activeTab === 'history'" class="tab-pane">
        <div class="light-table-card" *ngIf="pointHistory.length > 0">
          <table class="fintech-table">
            <thead>
              <tr>
                <th>TYPE</th>
                <th>DESCRIPTION</th>
                <th>REFERENCE</th>
                <th>POINTS CHANGE</th>
                <th class="text-right">DATE & TIME</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let item of pointHistory">
                <td>
                  <span class="pill-type" [class.pill-earn]="item.type === 'EARN'" [class.pill-redeem]="item.type === 'REDEEM'">
                    {{ item.type === 'EARN' ? '+ EARN' : '- REDEEM' }}
                  </span>
                </td>
                <td class="font-semibold">{{ item.description }}</td>
                <td><code class="code-ref">{{ item.transactionRef || 'SYSTEM' }}</code></td>
                <td>
                  <span class="pts-bold" [class.text-emerald]="item.type === 'EARN'" [class.text-pink]="item.type === 'REDEEM'">
                    {{ item.type === 'EARN' ? '+' : '-' }}{{ item.points }} PTS
                  </span>
                </td>
                <td class="text-right text-muted-sm">{{ item.createdAt | date:'dd/MM/yyyy HH:mm:ss' }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="empty-card" *ngIf="pointHistory.length === 0">
          <div class="empty-icon-circle">📜</div>
          <h4>No Point History Recorded</h4>
          <p>Bill payments and top-ups will automatically earn points here.</p>
        </div>
      </div>

    </div>
  `,
  styles: [`
    .voucher-shop-momo {
      font-family: 'Roboto', 'Inter', system-ui, -apple-system, sans-serif;
      color: #0f172a;
      max-width: 1280px;
      margin: 0 auto;
      padding-bottom: 60px;
    }

    /* PAYGATE DUAL GRADIENT HERO CARD (MAGENTA PINK & OCEAN BLUE) */
    .momo-hero-card {
      position: relative;
      background: radial-gradient(circle at 85% 15%, rgba(255, 255, 255, 0.95), transparent 40%),
                  linear-gradient(135deg, #ffffff 0%, #fff0f6 40%, #eef6ff 100%);
      border: 1px solid rgba(216, 27, 96, 0.2);
      border-radius: 28px;
      padding: 36px 40px;
      margin-bottom: 32px;
      box-shadow: 0 20px 50px rgba(194, 0, 103, 0.08);
      overflow: hidden;
    }

    .hero-bg-glow {
      position: absolute;
      top: -30%; left: -10%;
      width: 480px; height: 480px;
      background: radial-gradient(circle, rgba(216, 27, 96, 0.18) 0%, transparent 70%);
      border-radius: 50%;
      pointer-events: none;
    }

    .hero-bg-glow-right {
      position: absolute;
      bottom: -40%; right: -5%;
      width: 480px; height: 480px;
      background: radial-gradient(circle, rgba(0, 114, 206, 0.18) 0%, transparent 70%);
      border-radius: 50%;
      pointer-events: none;
    }

    .hero-inner {
      position: relative;
      z-index: 2;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .hero-top-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .hero-badge-pink {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(255, 240, 246, 0.95);
      border: 1px solid rgba(216, 27, 96, 0.35);
      padding: 6px 16px;
      border-radius: 20px;
      box-shadow: 0 2px 8px rgba(194, 0, 103, 0.08);
    }

    .pulse-pink-dot {
      width: 8px; height: 8px;
      background-color: #c20067;
      border-radius: 50%;
      box-shadow: 0 0 10px #c20067;
    }

    .badge-text {
      font-size: 0.75rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      color: #c20067;
    }

    .tier-pill-pink {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: linear-gradient(135deg, #eef6ff, #fff0f6);
      border: 1px solid rgba(0, 114, 206, 0.3);
      padding: 6px 18px;
      border-radius: 20px;
    }
    .tier-icon { font-size: 0.95rem; }
    .tier-name {
      font-size: 0.8rem;
      font-weight: 800;
      letter-spacing: 0.06em;
      color: #0072ce;
    }

    .hero-headline-group { display: flex; flex-direction: column; gap: 8px; }

    .hero-headline {
      font-size: clamp(1.8rem, 3.2vw, 2.6rem);
      font-weight: 900;
      color: #0d2b5c;
      letter-spacing: -0.02em;
      line-height: 1.15;
      margin: 0;
    }

    .highlight-pink {
      background: linear-gradient(135deg, #c20067 0%, #0072ce 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .hero-description {
      font-size: 0.98rem;
      color: #475569;
      margin: 0;
      max-width: 640px;
      line-height: 1.5;
    }

    .momo-stats-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 18px;
    }

    .stat-card-momo {
      background: #ffffff;
      border: 1px solid #fce4ec;
      border-radius: 20px;
      padding: 18px 22px;
      display: flex;
      align-items: center;
      gap: 16px;
      box-shadow: 0 10px 24px rgba(194, 0, 103, 0.05);
      transition: transform 0.25s, border-color 0.25s, box-shadow 0.25s;
    }
    .stat-card-momo:hover {
      transform: translateY(-3px);
      border-color: #c20067;
      box-shadow: 0 14px 30px rgba(194, 0, 103, 0.12);
    }
    .stat-card-momo.accent-pink { background: linear-gradient(135deg, #ffffff 0%, #fff0f6 100%); }
    .stat-card-momo.accent-emerald { background: linear-gradient(135deg, #ffffff 0%, #eef6ff 100%); }
    .stat-card-momo.accent-purple { background: linear-gradient(135deg, #ffffff 0%, #f7f3ff 100%); }

    .stat-icon-box {
      width: 48px; height: 48px;
      border-radius: 14px;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .pink-bg { background: #fce4ec; color: #c20067; border: 1px solid #f8bbd0; }
    .emerald-bg { background: #e3f2fd; color: #0072ce; border: 1px solid #bbdefb; }
    .purple-bg { background: #f3e5f5; color: #7b1fa2; border: 1px solid #e1bee7; }

    .stat-detail { display: flex; flex-direction: column; }
    .stat-title { font-size: 0.72rem; font-weight: 800; letter-spacing: 0.06em; color: #64748b; }
    .stat-number { font-size: 1.65rem; font-weight: 900; line-height: 1.1; margin-top: 2px; }
    .stat-number small { font-size: 0.78rem; font-weight: 800; color: #94a3b8; }
    .text-pink { color: #c20067; }
    .text-emerald { color: #0072ce; }
    .text-purple { color: #7b1fa2; }

    /* DUAL COLOR TAB NAVIGATION */
    .tabs-wrapper { margin-bottom: 28px; }
    .momo-tabs-container {
      display: inline-flex;
      background: linear-gradient(135deg, #fff0f6 0%, #eef6ff 100%);
      padding: 6px;
      border-radius: 18px;
      gap: 6px;
      border: 1px solid rgba(216, 27, 96, 0.2);
    }

    .tab-item {
      display: flex; align-items: center; gap: 8px;
      padding: 11px 24px;
      border-radius: 14px;
      font-size: 0.85rem; font-weight: 800; letter-spacing: 0.02em;
      color: #64748b;
      background: transparent;
      border: none; cursor: pointer;
      transition: all 0.25s;
    }
    .tab-item:hover { color: #c20067; }
    .tab-item.active {
      background: linear-gradient(135deg, #c20067 0%, #0072ce 100%);
      color: #ffffff;
      box-shadow: 0 8px 20px rgba(194, 0, 103, 0.28);
    }

    .count-tag {
      background: rgba(194, 0, 103, 0.12); color: #c20067;
      font-size: 0.72rem; font-weight: 800;
      padding: 2px 8px; border-radius: 8px;
    }
    .tab-item.active .count-tag { background: rgba(255, 255, 255, 0.25); color: #ffffff; }

    .vouchers-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 24px;
    }

    .momo-voucher-card {
      background: #ffffff;
      border: 1px solid #fce4ec;
      border-radius: 22px;
      display: flex; flex-direction: column;
      position: relative; overflow: hidden;
      box-shadow: 0 10px 28px rgba(194, 0, 103, 0.05);
      transition: transform 0.3s, border-color 0.3s, box-shadow 0.3s;
    }
    .momo-voucher-card:hover {
      transform: translateY(-5px);
      border-color: #c20067;
      box-shadow: 0 16px 36px rgba(194, 0, 103, 0.15);
    }

    .ticket-header {
      padding: 16px 20px 12px;
      display: flex; justify-content: space-between; align-items: center;
      background: linear-gradient(135deg, #fff0f6 0%, #eef6ff 100%);
      border-bottom: 1px dashed #f8bbd0;
    }

    .voucher-code-chip {
      display: flex; align-items: center; gap: 6px;
      font-size: 1rem; font-weight: 800;
      color: #c20067; letter-spacing: 0.04em;
    }
    .chip-dot { width: 6px; height: 6px; background: #c20067; border-radius: 50%; }

    .stock-badge {
      font-size: 0.72rem; font-weight: 800;
      background: #e3f2fd; color: #0072ce; border: 1px solid #bbdefb;
      padding: 3px 9px; border-radius: 10px;
    }
    .stock-badge.stock-out { background: #fee2e2; color: #b91c1c; border-color: #fca5a5; }

    .ticket-body { padding: 20px; display: flex; flex-direction: column; gap: 14px; flex: 1; }
    .voucher-title { font-size: 1.1rem; font-weight: 800; color: #0f172a; margin: 0; line-height: 1.35; }

    .discount-box {
      background: linear-gradient(135deg, #fff0f6 0%, #eef6ff 100%);
      border: 1px solid #f8bbd0;
      border-radius: 14px; padding: 12px 16px;
      display: flex; flex-direction: column; gap: 2px;
    }
    .discount-label { font-size: 0.68rem; font-weight: 900; color: #c20067; letter-spacing: 0.05em; }
    .discount-amount {
      font-size: 1.7rem; font-weight: 900;
      background: linear-gradient(135deg, #c20067 0%, #0072ce 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      letter-spacing: -0.02em;
    }
    .discount-rule { font-size: 0.72rem; font-weight: 700; color: #64748b; }

    .meta-row { display: flex; justify-content: space-between; align-items: center; }
    .meta-tag { background: #fff0f6; color: #c20067; font-size: 0.75rem; font-weight: 800; padding: 4px 10px; border-radius: 8px; border: 1px solid #f8bbd0; }
    .expiry-text { font-size: 0.75rem; color: #64748b; font-weight: 700; }

    .coupon-divider { position: relative; height: 20px; display: flex; align-items: center; }
    .circle-notch {
      width: 16px; height: 16px; background: #ffffff;
      border-radius: 50%; position: absolute; top: 2px; border: 1px solid #fce4ec;
    }
    .notch-l { left: -8px; }
    .notch-r { right: -8px; }
    .dashed-line { width: 100%; border-top: 2px dashed #f8bbd0; margin: 0 14px; }

    .ticket-footer {
      padding: 14px 20px 20px;
      display: flex; justify-content: space-between; align-items: center;
      background: #ffffff;
    }

    .pts-cost { display: flex; flex-direction: column; }
    .pts-title { font-size: 0.7rem; font-weight: 800; color: #64748b; letter-spacing: 0.05em; }
    .pts-display { display: flex; align-items: baseline; gap: 3px; }
    .pts-val { font-size: 1.4rem; font-weight: 900; color: #c20067; }
    .pts-unit { font-size: 0.78rem; font-weight: 800; color: #c20067; }

    .btn-momo-pink {
      display: inline-flex; align-items: center; justify-content: center; gap: 6px;
      background: linear-gradient(135deg, #c20067 0%, #0072ce 100%);
      color: #ffffff;
      font-size: 0.9rem; font-weight: 800;
      padding: 0 24px; height: 42px;
      border-radius: 12px; border: none; cursor: pointer;
      box-shadow: 0 8px 22px rgba(194, 0, 103, 0.3);
      transition: all 0.25s;
    }
    .btn-momo-pink:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 12px 28px rgba(194, 0, 103, 0.4);
      background: linear-gradient(135deg, #e00077 0%, #0084eb 100%);
    }
    .btn-momo-pink:disabled { opacity: 0.45; cursor: not-allowed; box-shadow: none; }

    .btn-spinner {
      width: 14px; height: 14px; border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: #fff; border-radius: 50%; animation: spin 0.6s linear infinite;
    }

    .my-voucher-card {
      background: #ffffff; border: 1px solid #fce4ec; border-radius: 18px;
      overflow: hidden; display: flex; flex-direction: column; transition: all 0.25s;
    }
    .my-card-stripe { height: 4px; width: 100%; }
    .my-avail .my-card-stripe { background: linear-gradient(90deg, #c20067, #0072ce); }
    .my-used .my-card-stripe { background: #94a3b8; }
    .my-exp .my-card-stripe { background: #ef4444; }

    .my-voucher-card.my-used, .my-voucher-card.my-exp { opacity: 0.6; }

    .my-card-content { padding: 20px; display: flex; flex-direction: column; gap: 10px; }
    .my-card-top { display: flex; justify-content: space-between; align-items: center; }
    .my-code { font-size: 1rem; font-weight: 800; color: #0072ce; }

    .my-status-badge { font-size: 0.72rem; font-weight: 800; padding: 2px 8px; border-radius: 8px; }
    .bg-avail { background: #fff0f6; color: #c20067; border: 1px solid #f8bbd0; }
    .bg-used { background: #f1f5f9; color: #475569; }
    .bg-exp { background: #fee2e2; color: #991b1b; }

    .my-title { font-size: 1.05rem; font-weight: 800; color: #0f172a; margin: 0; }
    .my-discount { font-size: 1.4rem; font-weight: 900; color: #c20067; }
    .my-dates { display: flex; justify-content: space-between; font-size: 0.75rem; color: #64748b; border-top: 1px solid #fff0f6; padding-top: 10px; }

    .light-table-card {
      background: #ffffff; border: 1px solid #fce4ec; border-radius: 20px;
      overflow: hidden; box-shadow: 0 10px 28px rgba(194, 0, 103, 0.05);
    }
    .fintech-table { width: 100%; border-collapse: collapse; text-align: left; }
    .fintech-table th {
      padding: 14px 20px;
      font-size: 0.75rem; font-weight: 800; letter-spacing: 0.06em;
      color: #475569; background: linear-gradient(135deg, #fff0f6 0%, #eef6ff 100%); border-bottom: 1px solid #f8bbd0;
    }
    .fintech-table td { padding: 16px 20px; border-bottom: 1px solid #f8fafc; font-size: 0.9rem; color: #0f172a; }
    .fintech-table tr:hover td { background: #fff0f6; }

    .pill-type { font-size: 0.75rem; font-weight: 800; padding: 3px 10px; border-radius: 8px; }
    .pill-earn { background: #e3f2fd; color: #0072ce; border: 1px solid #bbdefb; }
    .pill-redeem { background: #fff0f6; color: #c20067; border: 1px solid #f8bbd0; }

    .font-semibold { font-weight: 600; }
    .code-ref { font-family: monospace; font-size: 0.82rem; background: #fff0f6; padding: 2px 6px; border-radius: 5px; color: #c20067; }
    .pts-bold { font-size: 1.05rem; font-weight: 900; }
    .text-emerald { color: #0072ce; }
    .text-pink { color: #c20067; }
    .text-muted-sm { color: #64748b; font-size: 0.8rem; }
    .text-right { text-align: right; }

    .empty-card {
      background: #ffffff; border: 1px solid #fce4ec; border-radius: 20px;
      padding: 60px 20px; text-align: center; display: flex; flex-direction: column; align-items: center;
    }
    .empty-icon-circle {
      font-size: 2.5rem; width: 80px; height: 80px; background: linear-gradient(135deg, #fff0f6 0%, #eef6ff 100%);
      border: 1px solid #f8bbd0; border-radius: 50%; display: flex; align-items: center; justify-content: center;
      margin-bottom: 16px;
    }
    .empty-card h4 { font-size: 1.25rem; font-weight: 800; color: #0f172a; margin: 0 0 6px 0; }
    .empty-card p { font-size: 0.9rem; color: #64748b; margin: 0; }

    @keyframes spin { to { transform: rotate(360deg); } }

    @media (max-width: 900px) {
      .momo-stats-grid { grid-template-columns: 1fr; }
      .vouchers-grid { grid-template-columns: 1fr; }
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
    ALL: 'ALL SERVICES',
    BILL_PAYMENT: 'BILL PAYMENT',
    ELECTRICITY: 'ELECTRICITY',
    WATER: 'WATER',
    INTERNET: 'INTERNET'
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
      next: (res: ApiResponse<PointsResponse>) => { if (res.success) this.points = res.data; },
      error: (err) => console.error('Failed to load points:', err)
    });
  }

  loadShopVouchers(): void {
    this.voucherService.getShopVouchers().subscribe({
      next: (res: any) => { if (res.success && res.data) this.shopVouchers = res.data.content || []; },
      error: (err) => console.error('Failed to load shop vouchers:', err)
    });
  }

  loadMyVouchers(): void {
    this.voucherService.getMyVouchers().subscribe({
      next: (res: ApiResponse<UserVoucherResponse[]>) => { if (res.success) this.myVouchers = res.data || []; },
      error: (err) => console.error('Failed to load my vouchers:', err)
    });
  }

  loadHistory(): void {
    this.rewardService.getPointsHistory().subscribe({
      next: (res: any) => { if (res.success && res.data) this.pointHistory = res.data.content || []; },
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
