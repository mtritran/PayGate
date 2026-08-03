import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subscription, timer } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AccountService } from '../../../core/services/account.service';
import { TransactionService } from '../../../core/services/transaction.service';
import { RewardService, PointsResponse } from '../../../core/services/reward.service';
import { AuthService } from '../../../core/services/auth.service';
import { AccountResponse } from '../../../core/models/account.model';
import { TransactionResponse } from '../../../core/models/transaction.model';

interface DailyVolumePoint {
  day: string;
  amount: number;
  x: number;
  y: number;
  delayMs: number;
}

interface FeatureTile {
  icon: string;
  label: string;
  route: string;
  gradient: string;
}

@Component({
  selector: 'app-account-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    CurrencyPipe,
    DatePipe,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  template: `
    <div class="dashboard">
      <!-- ===== SKELETON LOADING ===== -->
      <div *ngIf="loading" class="skeleton-dashboard">
        <div class="skeleton-hero">
          <div class="sk-row">
            <div class="skeleton skeleton-avatar"></div>
            <div class="sk-col">
              <div class="skeleton skeleton-text" style="width:80px"></div>
              <div class="skeleton skeleton-title" style="width:160px"></div>
            </div>
          </div>
          <div class="skeleton skeleton-card" style="height:180px; margin-top:24px"></div>
        </div>
        <div class="sk-features">
          <div class="skeleton skeleton-title" style="width:120px"></div>
          <div class="sk-grid">
            <div *ngFor="let _ of [1,2,3,4]" class="skeleton" style="height:100px; border-radius:20px"></div>
          </div>
        </div>
        <div class="sk-stats">
          <div class="skeleton skeleton-title" style="width:160px"></div>
          <div class="sk-grid">
            <div *ngFor="let _ of [1,2,3,4]" class="skeleton" style="height:110px; border-radius:20px"></div>
          </div>
        </div>
      </div>

      <div *ngIf="!loading">

        <!-- ===== HERO ===== -->
        <section class="hero">
          <div class="hero-bg">
            <div class="orb o1"></div>
            <div class="orb o2"></div>
            <div class="orb o3"></div>
          </div>

          <div class="hero-top">
            <div class="hero-greeting">
              <span class="greet-emoji">🌤️</span>
              <div>
                <p class="greet-sub">Good morning</p>
                <h1 class="greet-name">{{ getDisplayName() }}</h1>
              </div>
            </div>
            <div class="hero-actions">
              <div class="pts-badge" routerLink="/vouchers">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
                <span class="pts-num">{{ rewardPoints?.totalPoints || 0 }}</span>
                <span class="pts-lbl">points</span>
              </div>
            </div>
          </div>

          <div class="hero-card">
            <div class="hcard-top">
              <div>
                <div class="hcard-lbl">Total balance</div>
                <div class="hcard-val">{{ (account?.balance || 0) | currency:'VND':'symbol':'1.0-0' }}</div>
                <div class="hcard-acct" (click)="copyAcSunumber()">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                  </svg>
                  <span>{{ account?.accountNumber || 'PAY0000000001' }}</span>
                </div>
              </div>
              <div class="hcard-ring">
                <svg viewBox="0 0 100 100" class="ring-svg">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="#fce4ec" stroke-width="6"/>
                  <circle cx="50" cy="50" r="42" fill="none" stroke="#c20067" stroke-width="6"
                    stroke-dasharray="264" stroke-dashoffset="66" stroke-linecap="round" transform="rotate(-90,50,50)"/>
                </svg>
                <div class="ring-txt">
                  <span class="ring-pct">75%</span>
                  <span class="ring-lbl">limit</span>
                </div>
              </div>
            </div>
            <div class="hcard-acts">
              <a class="hcard-btn" routerLink="/accounts/topup">
                <span class="hcard-ico" style="background:#fff0f6;color:#c20067">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                </span>
                <span>Top up</span>
              </a>
              <a class="hcard-btn" routerLink="/transactions/pay">
                <span class="hcard-ico" style="background:#eef6ff;color:#0072ce">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
                  </svg>
                </span>
                <span>Transfer</span>
              </a>
              <a class="hcard-btn" routerLink="/transactions/history">
                <span class="hcard-ico" style="background:#f3e8ff;color:#7c3aed">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                  </svg>
                </span>
                <span>History</span>
              </a>
            </div>
          </div>
        </section>

        <!-- ===== CỤM ĐIỀU HƯỚNG TRUNG TÂM (CORE SYSTEM NAVIGATION HUB) ===== -->
        <section class="sec merchant-spotlight-sec">
          <a class="merchant-spotlight" routerLink="/merchant/register">
            <div class="merchant-visual" aria-hidden="true">
              <div class="merchant-phone">
                <div class="merchant-phone-top">
                  <mat-icon>storefront</mat-icon>
                  <span>PayGate Merchant</span>
                </div>
                <div class="merchant-revenue">+1.250.000&#8363;</div>
                <div class="merchant-paid">
                  <mat-icon>verified</mat-icon>
                  <span>Payment received</span>
                </div>
              </div>
              <div class="merchant-qr">
                <mat-icon>qr_code_2</mat-icon>
                <span>QR Pay</span>
              </div>
            </div>
            <div class="merchant-copy">
              <span class="merchant-eyebrow">Merchant Portal</span>
              <h2>Turn PayGate into a digital cashier for your business</h2>
              <p>Accept QR payments, share checkout links, and track revenue from one clean workspace.</p>
              <div class="merchant-benefits">
                <span><mat-icon>bolt</mat-icon> Instant QR</span>
                <span><mat-icon>receipt_long</mat-icon> Clear settlement</span>
                <span><mat-icon>campaign</mat-icon> Fast payment links</span>
              </div>
              <div class="merchant-actions">
                <span class="merchant-primary">Register Merchant</span>
                <span class="merchant-note">Built for online shops, cafes, and service businesses</span>
              </div>
            </div>
          </a>
        </section>
        <!-- ===== TIỆN ÍCH (màu dịu) ===== -->
        <section class="sec">
          <div class="sec-hdr">
            <h2 class="sec-title">Utilities</h2>
            <a class="sec-more" routerLink="/accounts/me">View all
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </a>
          </div>
          <div class="f-grid stagger-children">
            <a *ngFor="let tile of featureTiles" class="f-card" [routerLink]="tile.route">
              <div class="f-ico" [style.background]="tile.gradient">
                <mat-icon>{{ tile.icon }}</mat-icon>
              </div>
              <span class="f-lbl">{{ tile.label }}</span>
            </a>
          </div>
        </section>

        <section class="sec quick-links-sec">
          <div class="sec-hdr">
            <h2 class="sec-title">Explore More</h2>
          </div>
          <div class="ql-grid stagger-children">
            <a class="ql-card" routerLink="/vouchers">
              <div class="ql-ico" style="background:linear-gradient(135deg,#fff0f6,#fce4ec);color:#c20067">
                <mat-icon>card_giftcard</mat-icon>
              </div>
              <div class="ql-info">
                <strong>Voucher Hub</strong>
                <span>Redeem points and offers</span>
              </div>
              <svg class="ql-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </a>
            <a class="ql-card" routerLink="/loans">
              <div class="ql-ico" style="background:linear-gradient(135deg,#eef6ff,#dbeafe);color:#0072ce">
                <mat-icon>account_balance</mat-icon>
              </div>
              <div class="ql-info">
                <strong>Consumer Loans</strong>
                <span>Instant disbursement to wallet</span>
              </div>
              <svg class="ql-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </a>
            <a class="ql-card" routerLink="/vaults">
              <div class="ql-ico" style="background:linear-gradient(135deg,#fef3c7,#fde68a);color:#d97706">
                <mat-icon>savings</mat-icon>
              </div>
              <div class="ql-info">
                <strong>Savings Vault</strong>
                <span>Save toward large goals</span>
              </div>
              <svg class="ql-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </a>
            <a class="ql-card" routerLink="/bills/pay">
              <div class="ql-ico" style="background:linear-gradient(135deg,#f3e8ff,#ede9fe);color:#7c3aed">
                <mat-icon>receipt</mat-icon>
              </div>
              <div class="ql-info">
                <strong>Bill Payments</strong>
                <span>Electricity, water, internet, tuition</span>
              </div>
              <svg class="ql-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </a>
          </div>
        </section>

        <!-- ===== TỔNG QUAN TÀI CHÍNH ===== -->
        <section class="sec">
          <h2 class="sec-title" style="margin-bottom:20px;">Financial Overview</h2>
          <div class="s-grid stagger-children">
            <div *ngFor="let stat of quickStats" class="s-card">
              <div class="s-top">
                <div class="s-ico-box" [style.background]="stat.bg" [style.color]="stat.color">
                  <mat-icon>{{ stat.icon }}</mat-icon>
                </div>
                <span class="s-chg" [class.s-up]="stat.positive" [class.s-dn]="!stat.positive">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <polyline *ngIf="stat.positive" points="18 15 12 9 6 15"/>
                    <polyline *ngIf="!stat.positive" points="6 9 12 15 18 9"/>
                  </svg>
                  {{ stat.change }}
                </span>
              </div>
              <div class="s-val">{{ stat.value }}</div>
              <div class="s-lbl">{{ stat.label }}</div>
            </div>
          </div>
        </section>

        <!-- ===== BIỂU ĐỒ SỐ DƯ ===== -->
        <section class="sec">
          <div class="sec-hdr">
            <div>
              <h2 class="sec-title">Balance Trend</h2>
              <p class="sec-sub">Last 7 days</p>
            </div>
            <div class="chart-total">
              <span class="ct-label">Total transactions</span>
              <strong class="ct-val">{{ totalVolume | currency:'VND':'symbol':'1.0-0' }}</strong>
            </div>
          </div>
          <div class="chart-box">
            <div class="chart-wrap">
              <svg viewBox="0 0 700 240" preserveAspectRatio="xMidYMid meet" class="chart-svg">
                <defs>
                  <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#c20067" stop-opacity="0.18"/>
                    <stop offset="60%" stop-color="#c20067" stop-opacity="0.04"/>
                    <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
                  </linearGradient>
                </defs>
                <line x1="70" y1="30" x2="670" y2="30" stroke="#fce4ec" stroke-dasharray="4,4"/>
                <line x1="70" y1="70" x2="670" y2="70" stroke="#fce4ec" stroke-dasharray="4,4"/>
                <line x1="70" y1="110" x2="670" y2="110" stroke="#fce4ec" stroke-dasharray="4,4"/>
                <line x1="70" y1="150" x2="670" y2="150" stroke="#fce4ec" stroke-dasharray="4,4"/>
                <text x="58" y="34" font-size="12" fill="#94a3b8" text-anchor="end">800k</text>
                <text x="58" y="74" font-size="12" fill="#94a3b8" text-anchor="end">600k</text>
                <text x="58" y="114" font-size="12" fill="#94a3b8" text-anchor="end">400k</text>
                <text x="58" y="154" font-size="12" fill="#94a3b8" text-anchor="end">200k</text>
                <text x="58" y="194" font-size="12" fill="#94a3b8" text-anchor="end">0</text>
                <path [attr.d]="chartAreaPath" fill="url(#cg)" class="ca" />
                <path [attr.d]="chartPath" fill="none" stroke="#c20067" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="cl" />
                <g>
                  <circle *ngFor="let p of dailyPoints; let idx = index"
                    [attr.cx]="p.x" [attr.cy]="p.y" r="5"
                    fill="#fff" stroke="#c20067" stroke-width="3"
                    class="cd" [style.animation-delay.ms]="p.delayMs">
                    <title>{{ p.day }}: {{ p.amount | currency:'VND':'symbol':'1.0-0' }}</title>
                  </circle>
                </g>
                <text x="70" y="218" font-size="12" fill="#94a3b8" text-anchor="middle">Mon</text>
                <text x="170" y="218" font-size="12" fill="#94a3b8" text-anchor="middle">Tue</text>
                <text x="270" y="218" font-size="12" fill="#94a3b8" text-anchor="middle">Wed</text>
                <text x="370" y="218" font-size="12" fill="#94a3b8" text-anchor="middle">Thu</text>
                <text x="470" y="218" font-size="12" fill="#94a3b8" text-anchor="middle">Fri</text>
                <text x="570" y="218" font-size="12" fill="#94a3b8" text-anchor="middle">Sat</text>
                <text x="670" y="218" font-size="12" fill="#94a3b8" text-anchor="end">Sun</text>
              </svg>
            </div>
          </div>
        </section>

        <!-- ===== GIAO DỊCH GẦN ĐÂY ===== -->
        <section class="sec">
          <div class="sec-hdr">
            <div>
              <h2 class="sec-title">Recent Transactions</h2>
              <p class="sec-sub">{{ (recentTransactions.length || 0) }} transactions</p>
            </div>
            <a class="sec-more" routerLink="/transactions/history">View all
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </a>
          </div>
          <div class="tx-list">
            <div *ngFor="let tx of recentTransactions.slice(0, 5)" class="tx-item stagger-children">
              <div class="tx-left">
                <div class="tx-icon" [class.tx-in]="tx.type === 'TOPUP'" [class.tx-out]="tx.type !== 'TOPUP'">
                  <mat-icon>{{ tx.type === 'TOPUP' ? 'arrow_downward' : 'arrow_upward' }}</mat-icon>
                </div>
                <div class="tx-info">
                  <span class="tx-type">{{ txLabel(tx.type) }}</span>
                  <span class="tx-date">{{ tx.createdAt | date:'dd/MM HH:mm' }}</span>
                </div>
              </div>
              <div class="tx-right">
                <span class="tx-amount" [class.tx-amount-in]="tx.type === 'TOPUP'" [class.tx-amount-out]="tx.type !== 'TOPUP'">
                  {{ (tx.type === 'TOPUP' ? '+' : '-') + (tx.amount | currency:'VND':'symbol':'1.0-0') }}
                </span>
                <span class="tx-status" [class.tx-success]="tx.status === 'COMPLETED'" [class.tx-failed]="tx.status === 'FAILED'">
                  {{ tx.status === 'COMPLETED' ? 'Completed' : tx.status === 'FAILED' ? 'Failed' : tx.status }}
                </span>
              </div>
            </div>
            <div *ngIf="(!recentTransactions || recentTransactions.length === 0)" class="tx-empty">
              <mat-icon style="font-size:40px;width:40px;height:40px;color:#f8bbd0">receipt_long</mat-icon>
              <p>No transactions yet</p>
            </div>
          </div>
        </section>

        <!-- ===== TRUY CẬP NHANH (Quick Links) ===== -->
      </div>
    </div>
  `,
  styles: [`
    @keyframes fu { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
    @keyframes dl { 0%{stroke-dashoffset:1400} 100%{stroke-dashoffset:0} }
    @keyframes ra { 0%{clip-path:polygon(0 0,0 0,0 100%,0 100%);opacity:0} 100%{clip-path:polygon(0 0,100% 0,100% 100%,0 100%);opacity:1} }
    @keyframes pd { 0%{transform:scale(0);opacity:0} 60%{transform:scale(1.5)} 100%{transform:scale(1);opacity:1} }
    @keyframes fl {
      0%,100%{transform:translateY(0) scale(1)}
      50%{transform:translateY(-24px) scale(1.06)}
    }

    .cl { stroke-dasharray:1400; stroke-dashoffset:1400; animation:dl 1.6s cubic-bezier(0.25,1,0.5,1) forwards; }
    .ca { animation:ra 1.6s cubic-bezier(0.25,1,0.5,1) forwards; }
    .cd { transform-origin:center; animation:pd 0.4s cubic-bezier(0.175,0.885,0.32,1.275) both; cursor:pointer; transition:r .15s; }
    .cd:hover { r:8; fill:#c20067; }

    .dashboard { animation:fu .5s ease-out; }

    /* ===== SKELETON LOADING ===== */
    .skeleton-dashboard { display:flex; flex-direction:column; gap:32px; }
    .skeleton-hero {
      background:radial-gradient(circle at 80% 15%, rgba(255,255,255,.95), transparent 30%),
                  linear-gradient(135deg, #fff7fb 0%, #ffe1ef 40%, #fff5f9 70%, #f0f4ff 100%);
      border-radius:32px; padding:48px 56px 40px;
      border:1px solid rgba(244,114,182,.25);
    }
    .sk-row { display:flex; align-items:center; gap:16px; }
    .sk-col { display:flex; flex-direction:column; gap:6px; }
    .sk-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; margin-top:16px; }
    .sk-features, .sk-stats { display:flex; flex-direction:column; gap:4px; }

    /* ===== HERO (thoáng, hồng dịu) ===== */
    .hero {
      position:relative; overflow:hidden;
      background: radial-gradient(circle at 75% 10%, rgba(255,255,255,1), transparent 35%),
                  linear-gradient(160deg, #fff0f6 0%, #ffe1ef 35%, #fff5f9 65%, #fce4ec 100%);
      border-radius:28px; padding:48px 56px 44px; margin-bottom:48px;
      color:#0d2b5c; border:1px solid rgba(244,114,182,.2);
      box-shadow: 0 20px 60px rgba(194,0,103,.06);
    }
    .hero-bg { position:absolute; inset:0; pointer-events:none; overflow:hidden; }
    .orb { position:absolute; border-radius:50%; filter:blur(100px); opacity:.12; }
    .o1 { width:600px; height:600px; top:-250px; right:-150px; background:#f8bbd0; animation:fl 10s ease-in-out infinite; }
    .o2 { width:450px; height:450px; bottom:-200px; left:-120px; background:#e8d5f5; animation:fl 12s ease-in-out infinite reverse; }
    .o3 { width:350px; height:350px; top:40%; left:40%; transform:translate(-50%,-50%); background:#fce4ec; opacity:.08; }

    .hero-top { display:flex; justify-content:space-between; align-items:flex-start; position:relative; z-index:1; margin-bottom:40px; }
    .hero-greeting { display:flex; align-items:center; gap:16px; }
    .greet-emoji { font-size:2.4rem; line-height:1; }
    .greet-sub { font-size:.85rem; color:#a6a6b8; margin:0 0 4px; font-weight:500; letter-spacing:.02em; }
    .greet-name { font-size:2rem; font-weight:900; margin:0; letter-spacing:-.02em; color:#0d2b5c; }
    .hero-actions { display:flex; align-items:center; gap:14px; }

    .pts-badge {
      display:flex; align-items:center; gap:8px;
      background:rgba(255,255,255,.8); backdrop-filter:blur(10px);
      border:1px solid rgba(244,114,182,.2); padding:10px 20px; border-radius:16px;
      transition:all .25s ease; cursor:pointer; color:#0d2b5c;
    }
    .pts-badge:hover { background:rgba(255,255,255,.95); border-color:#f8bbd0; transform:translateY(-1px); }
    .pts-badge svg { color:#fbbf24; }
    .pts-num { font-size:1rem; font-weight:800; }
    .pts-lbl { font-size:.78rem; color:#a6a6b8; font-weight:500; }

    .notif-btn {
      position:relative; width:44px; height:44px; border-radius:14px;
      background:rgba(255,255,255,.8); backdrop-filter:blur(10px);
      border:1px solid rgba(244,114,182,.2);
      display:flex; align-items:center; justify-content:center;
      color:#64748b; cursor:pointer; transition:all .25s ease;
    }
    .notif-btn:hover { background:rgba(255,255,255,.95); border-color:#f8bbd0; color:#c20067; }
    .notif-dot { position:absolute; top:9px; right:9px; width:8px; height:8px; border-radius:50%; background:#ef4444; border:2px solid #fff; animation:pulseRing 2s ease-in-out infinite; }

    .hero-card {
      position:relative; z-index:1;
      background:rgba(255,255,255,.8); backdrop-filter:blur(16px);
      border:1px solid rgba(244,114,182,.15); border-radius:24px; padding:32px;
    }

    .hcard-top { display:flex; justify-content:space-between; align-items:center; }
    .hcard-lbl { font-size:.75rem; font-weight:700; text-transform:uppercase; letter-spacing:.08em; margin-bottom:6px; color:#a6a6b8; }
    .hcard-val { font-size:2.6rem; font-weight:900; letter-spacing:-.03em; line-height:1.1; margin-bottom:10px; color:#0d2b5c; }
    .hcard-acct { display:flex; align-items:center; gap:8px; font-size:.85rem; color:#a6a6b8; cursor:pointer; transition:color .2s; font-family:monospace; }
    .hcard-acct:hover { color:#c20067; }

    .hcard-ring { flex-shrink:0; position:relative; width:88px; height:88px; }
    .ring-svg { width:100%; height:100%; }
    .ring-txt { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; }
    .ring-pct { font-size:1.1rem; font-weight:900; color:#0d2b5c; }
    .ring-lbl { font-size:.6rem; color:#a6a6b8; font-weight:600; text-transform:uppercase; letter-spacing:.04em; }

    .hcard-acts { display:flex; gap:12px; margin-top:24px; padding-top:24px; border-top:1px solid rgba(244,114,182,.1); }
    .hcard-btn { display:flex; align-items:center; gap:10px; padding:10px 20px; border-radius:14px; text-decoration:none; color:#475569; font-size:.88rem; font-weight:700; transition:all .25s ease; }
    .hcard-btn:hover { background:rgba(194,0,103,.06); color:#c20067; transform:translateY(-1px); }
    .hcard-ico { width:36px; height:36px; border-radius:12px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
    .hcard-ico svg { width:20px; height:20px; }

    /* ---- SECTIONS (thoáng) ---- */
    .sec { margin-bottom:52px; }
    .sec-hdr { display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:24px; }
    .sec-title { font-size:1.3rem; font-weight:800; color:#0d2b5c; margin:0; letter-spacing:-.01em; }
    .sec-sub { font-size:.85rem; color:#a6a6b8; margin:6px 0 0; }
    .sec-more { display:flex; align-items:center; gap:6px; font-size:.82rem; font-weight:700; color:#c20067; text-decoration:none; transition:all .25s ease; }
    .sec-more:hover { gap:12px; color:#e00077; }

    .merchant-spotlight-sec { margin-top:-18px; margin-bottom:46px; }
    .merchant-spotlight {
      display:grid; grid-template-columns:minmax(280px,.86fr) minmax(0,1.14fr); gap:30px;
      align-items:center; text-decoration:none; color:#13213a;
      background:linear-gradient(135deg, #fff0f7 0%, #eef6ff 48%, #ecfdf5 100%);
      border-radius:28px; padding:30px; overflow:hidden; position:relative;
      box-shadow:0 24px 62px rgba(194,0,103,.12), 0 10px 28px rgba(0,114,206,.08);
      border:1px solid #f3d6e5;
      transition:transform .25s cubic-bezier(.16,1,.3,1), box-shadow .25s ease;
    }
    .merchant-spotlight::before {
      content:""; position:absolute; inset:0;
      background:linear-gradient(90deg, rgba(194,0,103,.08), transparent 38%, rgba(22,163,74,.08));
      pointer-events:none;
    }
    .merchant-spotlight:hover {
      transform:translateY(-5px);
      box-shadow:0 34px 78px rgba(194,0,103,.16), 0 16px 36px rgba(0,114,206,.12);
    }
    .merchant-visual { position:relative; min-height:210px; display:flex; align-items:center; justify-content:center; z-index:1; }
    .merchant-phone {
      width:min(250px,100%); min-height:184px; border-radius:26px; padding:18px;
      background:linear-gradient(160deg, #c20067 0%, #ef4b8c 45%, #0072ce 100%);
      color:#fff; box-shadow:0 18px 42px rgba(194,0,103,.24);
      display:flex; flex-direction:column; justify-content:space-between;
    }
    .merchant-phone-top, .merchant-paid, .merchant-benefits span {
      display:flex; align-items:center; gap:8px;
    }
    .merchant-phone-top { font-size:.78rem; font-weight:800; opacity:.95; }
    .merchant-phone-top mat-icon, .merchant-paid mat-icon { font-size:19px; width:19px; height:19px; }
    .merchant-revenue { font-size:1.65rem; font-weight:900; letter-spacing:-.03em; }
    .merchant-paid {
      width:max-content; max-width:100%; padding:8px 10px; border-radius:999px;
      background:rgba(255,255,255,.18); font-size:.74rem; font-weight:800;
    }
    .merchant-qr {
      position:absolute; right:8px; bottom:8px; width:94px; height:94px; border-radius:24px;
      background:#fff; color:#0d2b5c; border:1px solid #e5edf7;
      display:flex; flex-direction:column; align-items:center; justify-content:center; gap:4px;
      box-shadow:0 18px 36px rgba(13,43,92,.12); font-size:.72rem; font-weight:900;
    }
    .merchant-qr mat-icon { font-size:42px; width:42px; height:42px; color:#c20067; }
    .merchant-copy { position:relative; z-index:1; display:flex; flex-direction:column; justify-content:center; min-width:0; }
    .merchant-eyebrow {
      width:max-content; padding:7px 12px; border-radius:999px;
      background:#ffffff; border:1px solid #f3d6e5;
      color:#c20067; font-size:.72rem; font-weight:900; letter-spacing:.08em; text-transform:uppercase;
      margin-bottom:14px; box-shadow:0 8px 20px rgba(194,0,103,.06);
    }
    .merchant-copy h2 {
      margin:0 0 10px; max-width:760px; font-size:1.72rem; line-height:1.16;
      font-weight:900; letter-spacing:-.025em; color:#0d2b5c;
    }
    .merchant-copy p {
      margin:0; max-width:680px; color:#546179; font-size:.94rem; line-height:1.55; font-weight:600;
    }
    .merchant-benefits { display:flex; gap:10px; flex-wrap:wrap; margin-top:18px; }
    .merchant-benefits span {
      min-height:34px; padding:0 12px; border-radius:999px; background:#ffffff;
      border:1px solid #e5edf7; color:#334155; font-size:.75rem; font-weight:800;
    }
    .merchant-benefits mat-icon { font-size:17px; width:17px; height:17px; color:#0072ce; }
    .merchant-actions { display:flex; align-items:center; gap:14px; flex-wrap:wrap; margin-top:22px; }
    .merchant-primary {
      display:inline-flex; align-items:center; justify-content:center; min-height:42px;
      padding:0 18px; border-radius:14px; background:#c20067; color:#fff;
      font-size:.86rem; font-weight:900; box-shadow:0 12px 26px rgba(194,0,103,.2);
    }
    .merchant-note { color:#64748b; font-size:.78rem; font-weight:700; }
/* ---- TIỆN ÍCH GRID (thoáng, hồng) ---- */
    .f-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:20px; }
    .f-card {
      display:flex; flex-direction:column; align-items:center; gap:16px;
      padding:36px 16px 24px; background:#fff; border-radius:24px;
      border:1px solid #f3d6e5; text-decoration:none;
      transition:all .3s cubic-bezier(.16,1,.3,1); box-shadow:0 6px 20px rgba(194,0,103,.03);
    }
    .f-card:hover { transform:translateY(-6px); box-shadow:0 20px 48px rgba(194,0,103,.10); border-color:#f48fb1; }
    .f-card:active { transform:scale(.97); }
    .f-ico { width:56px; height:56px; border-radius:18px; display:flex; align-items:center; justify-content:center; }
    .f-ico mat-icon { font-size:26px; width:26px; height:26px; color:#fff; }
    .f-lbl { font-size:.82rem; font-weight:600; color:#1e293b; text-align:center; }

    /* ---- STATS (thoáng) ---- */
    .s-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:20px; }
    .s-card {
      background:#fff; border:1px solid #f3d6e5; border-radius:20px; padding:24px;
      transition:all .3s cubic-bezier(.16,1,.3,1); cursor:default; box-shadow:0 6px 20px rgba(194,0,103,.03);
    }
    .s-card:hover { transform:translateY(-4px); box-shadow:0 16px 40px rgba(194,0,103,.08); border-color:#f48fb1; }
    .s-top { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:16px; }
    .s-ico-box { width:40px; height:40px; border-radius:12px; display:flex; align-items:center; justify-content:center; }
    .s-ico-box mat-icon { font-size:20px; width:20px; height:20px; }
    .s-chg { display:inline-flex; align-items:center; gap:4px; font-size:.72rem; font-weight:700; padding:3px 10px; border-radius:8px; }
    .s-up { background:#f0fdf4; color:#16a34a; }
    .s-dn { background:#fef2f2; color:#dc2626; }
    .s-val { font-size:1.4rem; font-weight:800; color:#0d2b5c; letter-spacing:-.02em; margin-bottom:6px; }
    .s-lbl { font-size:.78rem; color:#a6a6b8; font-weight:500; }

    /* ---- CHART (thoáng) ---- */
    .chart-total { text-align:right; }
    .ct-label { font-size:.7rem; color:#a6a6b8; font-weight:500; text-transform:uppercase; letter-spacing:.06em; display:block; }
    .ct-val { font-size:1.15rem; font-weight:800; color:#c20067; }
    .chart-box { background:#fff; border:1px solid #f3d6e5; border-radius:24px; padding:28px 32px; box-shadow:0 6px 20px rgba(194,0,103,.03); }
    .chart-wrap { width:100%; height:280px; display:flex; align-items:center; }
    .chart-svg { width:100%; height:100%; }

    /* ---- GIAO DỊCH GẦN ĐÂY ---- */
    .tx-list {
      background:#fff; border:1px solid #f3d6e5; border-radius:24px;
      box-shadow:0 6px 20px rgba(194,0,103,.03); overflow:hidden;
    }
    .tx-item {
      display:flex; justify-content:space-between; align-items:center;
      padding:18px 24px; border-bottom:1px solid #f3d6e5;
      transition:all .2s ease; cursor:default;
    }
    .tx-item:last-child { border-bottom:none; }
    .tx-item:hover { background:#fcf5f9; padding-left:28px; }
    .tx-left { display:flex; align-items:center; gap:14px; }
    .tx-icon {
      width:42px; height:42px; border-radius:14px;
      display:flex; align-items:center; justify-content:center;
      background:#f1f5f9; color:#64748b;
    }
    .tx-icon.tx-in { background:#fff0f6; color:#c20067; }
    .tx-icon.tx-out { background:#fef3c7; color:#d97706; }
    .tx-icon mat-icon { font-size:20px; width:20px; height:20px; }
    .tx-info { display:flex; flex-direction:column; gap:4px; }
    .tx-type { font-size:.9rem; font-weight:700; color:#0f172a; }
    .tx-date { font-size:.78rem; color:#a6a6b8; }
    .tx-right { display:flex; flex-direction:column; align-items:flex-end; gap:4px; }
    .tx-amount { font-size:.95rem; font-weight:800; }
    .tx-amount-in { color:#16a34a; }
    .tx-amount-out { color:#dc2626; }
    .tx-status { font-size:.7rem; font-weight:600; padding:3px 10px; border-radius:8px; }
    .tx-success { background:#f0fdf4; color:#16a34a; }
    .tx-failed { background:#fef2f2; color:#dc2626; }
    .tx-empty { display:flex; flex-direction:column; align-items:center; gap:12px; padding:48px 24px; color:#a6a6b8; }

    /* ---- KHÁM PHÁ THÊM (thoáng) ---- */
    .quick-links-sec { margin-bottom:52px; }
    .ql-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:16px; }
    .ql-card {
      display:flex; align-items:center; gap:16px;
      background:#fff; border:1px solid #f3d6e5; border-radius:20px;
      padding:20px 24px; text-decoration:none;
      transition:all .3s cubic-bezier(.16,1,.3,1); box-shadow:0 6px 20px rgba(194,0,103,.03);
    }
    .ql-card:hover { transform:translateY(-3px); box-shadow:0 16px 40px rgba(194,0,103,.08); border-color:#f48fb1; }
    .ql-card:hover .ql-arrow { transform:translateX(6px); opacity:1; }
    .ql-ico {
      width:48px; height:48px; border-radius:16px;
      display:flex; align-items:center; justify-content:center; flex-shrink:0;
    }
    .ql-ico mat-icon { font-size:24px; width:24px; height:24px; }
    .ql-info { display:flex; flex-direction:column; gap:4px; flex:1; min-width:0; }
    .ql-info strong { font-size:.92rem; font-weight:700; color:#0f172a; }
    .ql-info span { font-size:.8rem; color:#a6a6b8; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    /* ===== CORE SYSTEM NAVIGATION HUB ===== */
    .nav-hub-sec { margin-bottom: 36px; }
    .nav-hub-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
    .nav-hub-card {
      display: flex; align-items: center; gap: 14px; padding: 18px 20px;
      background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 20px;
      text-decoration: none; color: #0f172a; transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      box-shadow: 0 4px 16px rgba(0,0,0,0.02); position: relative; overflow: hidden;
    }
    .nav-hub-card:hover {
      transform: translateY(-4px); border-color: #f472b6;
      box-shadow: 0 12px 30px -6px rgba(194, 0, 103, 0.12);
    }
    .nav-hub-card:hover .nav-hub-arrow { transform: translate(3px, -3px); color: #c20067; opacity: 1; }

    .nav-hub-ico {
      width: 48px; height: 48px; border-radius: 14px; display: flex;
      align-items: center; justify-content: center; color: #ffffff; flex-shrink: 0;
      box-shadow: 0 6px 14px rgba(0,0,0,0.08);
    }
    .dashboard-gradient { background: linear-gradient(135deg, #ec4899 0%, #be185d 100%); }
    .txn-gradient { background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); }
    .vault-gradient { background: linear-gradient(135deg, #f59e0b 0%, #b45309 100%); }
    .merchant-gradient { background: linear-gradient(135deg, #10b981 0%, #047857 100%); }
    .admin-gradient { background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%); }

    .nav-hub-content { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; }
    .nav-hub-title { font-size: 0.95rem; font-weight: 800; color: #0f172a; letter-spacing: -0.01em; }
    .nav-hub-desc { font-size: 0.78rem; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .nav-hub-arrow { font-size: 1.1rem; font-weight: 800; color: #94a3b8; opacity: 0.6; transition: all 0.2s ease; }

    .nav-hub-card.admin-special { border-color: #ddd6fe; background: linear-gradient(135deg, #ffffff 0%, #f5f3ff 100%); }

    /* ---- RWD ---- */
    @media(max-width:1200px) {
      .merchant-spotlight { grid-template-columns:1fr; }
      .nav-hub-grid { grid-template-columns: repeat(2, 1fr); }
      .f-grid, .s-grid { gap:16px; }
    }
    @media(max-width:768px) {
      .merchant-spotlight { padding:24px; border-radius:22px; }
      .merchant-copy h2 { font-size:1.35rem; }
      .merchant-visual { min-height:190px; }
      .merchant-phone { min-height:170px; }
      .merchant-benefits { gap:8px; }
      .nav-hub-grid { grid-template-columns: 1fr; }
    }
    @media(max-width:1024px) {
      .f-grid { grid-template-columns:repeat(4,1fr); gap:14px; }
      .s-grid { grid-template-columns:repeat(2,1fr); }
      .ql-grid { grid-template-columns:1fr; }
      .hero { padding:36px 32px 32px; border-radius:24px; }
      .hcard-val { font-size:2.2rem; }
    }
    @media(max-width:860px) {
      .f-grid { grid-template-columns:repeat(2,1fr); }
    }
    @media(max-width:768px) {
      .f-grid { gap:12px; }
      .f-card { padding:24px 12px 20px; border-radius:20px; }
      .f-ico { width:48px; height:48px; border-radius:16px; }
      .f-ico mat-icon { font-size:22px; width:22px; height:22px; }
      .hero { padding:28px 24px 24px; border-radius:20px; margin-bottom:36px; }
      .greet-name { font-size:1.5rem; }
      .hcard-val { font-size:1.8rem; }
      .hcard-ring { width:72px; height:72px; }
      .s-grid { grid-template-columns:repeat(2,1fr); gap:12px; }
      .s-card { padding:18px; }
      .tx-item { padding:14px 18px; }
      .ql-grid { gap:12px; }
    }
    @media(max-width:520px) {
      .f-grid { gap:10px; }
      .f-card { padding:20px 8px 16px; border-radius:18px; }
      .f-ico { width:42px; height:42px; border-radius:14px; }
      .f-ico mat-icon { font-size:20px; width:20px; height:20px; }
      .f-lbl { font-size:.75rem; }
      .s-grid { grid-template-columns:1fr; }
      .hcard-acts { flex-wrap:wrap; gap:8px; }
      .hcard-btn { padding:8px 14px; font-size:.82rem; }
      .hero-top { flex-direction:column; gap:16px; }
      .hero-card { padding:22px; }
      .ql-card { padding:16px 18px; }
    }
  `]
})
export class AccountDashboardComponent implements OnInit {
  account: AccountResponse | null = null;
  recentTransactions: TransactionResponse[] = [];
  totalVolume = 0;
  totalTransactionsCount = 0;
  failedTransactionsCount = 0;
  loading = true;

  dailyPoints: DailyVolumePoint[] = [];
  chartPath: string = 'M 70 150 C 120 120, 140 100, 170 100 C 210 100, 230 115, 270 115 C 310 115, 330 75, 370 70 C 410 65, 430 47, 470 47 C 510 47, 530 85, 570 85 C 610 85, 630 25, 670 20';
  chartAreaPath: string = 'M 70 150 C 120 120, 140 100, 170 100 C 210 100, 230 115, 270 115 C 310 115, 330 75, 370 70 C 410 65, 430 47, 470 47 C 510 47, 530 85, 570 85 C 610 85, 630 25, 670 20 L 670 190 L 70 190 Z';

  rewardPoints: PointsResponse | null = null;

  featureTiles: FeatureTile[] = [
    { icon: 'send', label: 'Transfer', route: '/transactions/pay', gradient: 'linear-gradient(135deg,#f8bbd0,#c20067)' },
    { icon: 'add_circle', label: 'Top up', route: '/accounts/topup', gradient: 'linear-gradient(135deg,#bbdefb,#0072ce)' },
    { icon: 'receipt', label: 'Pay bills', route: '/bills/pay', gradient: 'linear-gradient(135deg,#f8bbd0,#a00055)' },
    { icon: 'savings', label: 'Vault', route: '/vaults', gradient: 'linear-gradient(135deg,#fde68a,#d97706)' },
    { icon: 'account_balance', label: 'Loans', route: '/loans', gradient: 'linear-gradient(135deg,#bbdefb,#005bb5)' },
    { icon: 'card_giftcard', label: 'Voucher', route: '/vouchers', gradient: 'linear-gradient(135deg,#f8bbd0,#ec407a)' },
    { icon: 'swap_horiz', label: 'History', route: '/transactions/history', gradient: 'linear-gradient(135deg,#c7d2fe,#6366f1)' },
    { icon: 'settings', label: 'Profile', route: '/accounts/me', gradient: 'linear-gradient(135deg,#e2e8f0,#64748b)' },
  ];

  quickStats: any[] = [];

  constructor(
    private accountService: AccountService,
    private transactionService: TransactionService,
    private rewardService: RewardService,
    private authService: AuthService,
    private snackBar: MatSnackBar
  ) { }

  private pollingSubscription: Subscription | null = null;

  ngOnInit(): void {
    this.loadDashboardData();
    // SWR Realtime Polling: Automatically revalidate Dashboard data every 5 seconds ngầm
    this.pollingSubscription = timer(5000, 5000).subscribe(() => {
      this.revalidateDashboardData();
    });
  }

  isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  getDisplayName(): string {
    const user = this.authService.getUsername();
    if (!user) return 'Nguyen';
    return user.split('@')[0];
  }

  copyAcSunumber(): void {
    const num = this.account?.accountNumber || 'PAY0000000001';
    navigator.clipboard.writeText(num);
    this.snackBar.open('Account number copied', 'OK', { duration: 2000 });
  }

  txLabel(type: string): string {
    switch(type) {
      case 'TOPUP': return 'Top up';
      case 'TRANSFER_IN': return 'Transfer received';
      case 'TRANSFER_OUT': return 'Transfer sent';
      case 'PAYMENT': return 'Payment';
      default: return type || 'Transaction';
    }
  }

  ngOnDestroy(): void {
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
    }
  }

  private revalidateDashboardData(): void {
    this.rewardService.getMyPoints().subscribe({
      next: (res) => { if (res.success) this.rewardPoints = res.data; },
      error: () => {}
    });

    this.accountService.getAccountMe().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.account = res.data;
          this.loadRecentTransactions(res.data.id, true);
        }
      },
      error: () => {}
    });
  }

  private loadDashboardData(): void {
    this.loading = true;
    this.rewardService.getMyPoints().subscribe({
      next: (res) => {
        if (res.success) this.rewardPoints = res.data;
      },
      error: () => {} // Silent catch for Admin users without points
    });

    this.accountService.getAccountMe().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.account = res.data;
          this.loadRecentTransactions(res.data.id);
        } else {
          this.loading = false;
        }
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  private loadRecentTransactions(accountId: number, isSilent = false): void {
    this.accountService.getAccountHistory(accountId, 0, 50).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          const content = res.data.content;
          this.recentTransactions = content;
          this.totalTransactionsCount = res.data.totalElements || content.length;
          this.failedTransactionsCount = content.filter(t => t.status === 'FAILED').length;
          this.computeRealtimeChartData(content);

          const totalIn = content.filter(t => t.type === 'TOPUP').reduce((s,t) => s + (t.amount||0), 0);
          const totalOut = content.filter(t => t.type !== 'TOPUP').reduce((s,t) => s + (t.amount||0), 0);
          this.quickStats = [
            { icon: 'trending_up', label: 'Income', value: totalIn.toLocaleString('vi-VN') + '₫', change: '+12%', positive: true, bg: '#fff0f6', color: '#c20067' },
            { icon: 'trending_down', label: 'Spending', value: totalOut.toLocaleString('vi-VN') + '₫', change: '+5%', positive: false, bg: '#f1f5f9', color: '#64748b' },
            { icon: 'swap_horiz', label: 'Transactions', value: String(this.totalTransactionsCount), change: 'Live', positive: true, bg: '#eef6ff', color: '#0072ce' },
            { icon: 'account_balance_wallet', label: 'Balance', value: (this.account?.balance || 0).toLocaleString('vi-VN') + '₫', change: 'Active', positive: true, bg: '#fef3c7', color: '#d97706' },
          ];
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  private computeRealtimeChartData(txns: TransactionResponse[]): void {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const dayMap = new Map<string, number>();
    days.forEach(d => dayMap.set(d, 0));

    txns.forEach(t => {
      if (t.createdAt) {
        const date = new Date(t.createdAt);
        const dayIndex = (date.getDay() + 6) % 7;
        const dayName = days[dayIndex];
        const current = dayMap.get(dayName) || 0;
        dayMap.set(dayName, current + (t.amount || 0));
      }
    });

    const volumes = days.map(d => dayMap.get(d) || 0);
    this.totalVolume = volumes.reduce((sum, v) => sum + v, 0);

    const maxVal = Math.max(...volumes, 1000000);
    const xCoords = [70, 170, 270, 370, 470, 570, 670];

    this.dailyPoints = days.map((d, i) => {
      const vol = volumes[i];
      const y = Math.round(190 - (vol / maxVal) * 160);
      const delayMs = 200 + i * 200;
      return { day: d, amount: vol, x: xCoords[i], y, delayMs };
    });

    this.chartPath = this.generateSmoothSplinePath(this.dailyPoints);
    this.chartAreaPath = `${this.chartPath} L 670 190 L 70 190 Z`;
  }

  private generateSmoothSplinePath(pts: DailyVolumePoint[]): string {
    if (!pts || pts.length === 0) return '';
    let path = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i === 0 ? i : i - 1];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2 < pts.length ? i + 2 : i + 1];
      const cp1x = (p1.x + (p2.x - p0.x) / 5).toFixed(1);
      const cp1y = (p1.y + (p2.y - p0.y) / 5).toFixed(1);
      const cp2x = (p2.x - (p3.x - p1.x) / 5).toFixed(1);
      const cp2y = (p2.y - (p3.y - p1.y) / 5).toFixed(1);
      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }
    return path;
  }
}
