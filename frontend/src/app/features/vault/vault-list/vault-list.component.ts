import { Component, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { VaultResponse, VaultService } from '../vault.service';

@Component({
  selector: 'app-vault-list',
  standalone: true,
  imports: [CommonModule, RouterLink, CurrencyPipe, DatePipe],
  template: `
    <div class="vault-page fade-in-up">
      <section class="vault-hero">
        <div class="hero-copy">
          <div class="eyebrow">Savings Vault</div>
          <h1>Grow small goals into <span class="highlight-pink">real plans</span></h1>
          <p>Separate money into dedicated vaults, track progress clearly, and add more whenever you want.</p>
          <div class="hero-actions">
            <a class="primary-btn" routerLink="/vaults/new">Create Vault</a>
            <span class="soft-pill">{{ activeCount }} active vaults</span>
          </div>
        </div>

        <div class="pig-wrap" aria-hidden="true">
          <svg class="pig" viewBox="0 0 360 270" role="img">
            <defs>
              <linearGradient id="pigBody2" x1="40" y1="30" x2="300" y2="220">
                <stop offset="0%" stop-color="#ffd6e7"/>
                <stop offset="50%" stop-color="#ffb8d0"/>
                <stop offset="100%" stop-color="#f48fb1"/>
              </linearGradient>
              <radialGradient id="pigBelly2" cx="0.5" cy="0.45" r="0.5">
                <stop offset="0%" stop-color="#fff5f9" stop-opacity="0.85"/>
                <stop offset="100%" stop-color="#ffb8d0" stop-opacity="0"/>
              </radialGradient>
              <linearGradient id="coinGold2" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stop-color="#ffe68f"/>
                <stop offset="100%" stop-color="#f59e0b"/>
              </linearGradient>
              <linearGradient id="noseGrad2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#f06292"/>
                <stop offset="100%" stop-color="#c20067"/>
              </linearGradient>
            </defs>
            <!-- Ears -->
            <ellipse cx="100" cy="72" rx="28" ry="32" fill="#f48fb1" transform="rotate(-20 100 72)"/>
            <ellipse cx="100" cy="76" rx="16" ry="20" fill="#ec407a" opacity="0.5" transform="rotate(-20 100 76)"/>
            <ellipse cx="248" cy="72" rx="28" ry="32" fill="#f48fb1" transform="rotate(20 248 72)"/>
            <ellipse cx="248" cy="76" rx="16" ry="20" fill="#ec407a" opacity="0.5" transform="rotate(20 248 76)"/>
            <!-- Body -->
            <path d="M72 140 c0-52 45-86 118-86 58 0 102 22 120 58 12-4 24 2 25 14 1 15-11 26-30 26 -17 36-60 58-118 58 -15 0-30-2-44-5 l-20 22 h-32 l6-36 c-20-16-30-36-30-58z" fill="url(#pigBody2)"/>
            <!-- Belly -->
            <ellipse cx="180" cy="132" rx="82" ry="34" fill="url(#pigBelly2)"/>
            <!-- Tail -->
            <path d="M52 128 c-14-6-20 12-5 18 10 4 18-1 16-9" fill="none" stroke="#f48fb1" stroke-width="8" stroke-linecap="round"/>
            <!-- Legs -->
            <rect x="116" y="216" width="30" height="18" rx="9" fill="url(#pigBody2)"/>
            <rect x="216" y="216" width="30" height="18" rx="9" fill="url(#pigBody2)"/>
            <ellipse cx="131" cy="236" rx="22" ry="7" fill="#e88ba8"/>
            <ellipse cx="231" cy="236" rx="22" ry="7" fill="#e88ba8"/>
            <!-- Coin -->
            <rect x="138" y="18" width="72" height="22" rx="11" fill="url(#coinGold2)"/>
            <text x="174" y="34" font-family="Arial,sans-serif" font-size="14" font-weight="900" fill="#92400e" text-anchor="middle">$</text>
            <!-- Progress bar -->
            <rect x="130" y="88" width="100" height="10" rx="5" fill="#fce4ec" opacity="0.7"/>
            <rect x="130" y="88" width="60" height="10" rx="5" fill="url(#coinGold2)"/>
            <!-- Eye -->
            <ellipse cx="224" cy="112" rx="9" ry="11" fill="#fff"/>
            <circle cx="226" cy="112" r="5.5" fill="#380e1f"/>
            <circle cx="228" cy="109.5" r="2" fill="#fff"/>
            <!-- Blush -->
            <ellipse cx="210" cy="128" rx="14" ry="7" fill="#ec407a" opacity="0.12"/>
            <!-- Snout -->
            <ellipse cx="270" cy="136" rx="20" ry="16" fill="url(#noseGrad2)"/>
            <circle cx="262" cy="135" r="3.5" fill="#380e1f" opacity="0.5"/>
            <circle cx="278" cy="135" r="3.5" fill="#380e1f" opacity="0.5"/>
            <ellipse cx="270" cy="131" rx="12" ry="4" fill="#fff" opacity="0.15"/>
          </svg>
        </div>
      </section>

      <section class="stats-row" *ngIf="!loading && vaults.length > 0">
        <div class="stat-tile">
          <span>Total Saved</span>
          <strong>{{ totalSaved | currency:'VND':'symbol':'1.0-0' }}</strong>
        </div>
        <div class="stat-tile">
          <span>Total Target</span>
          <strong>{{ totalTarget | currency:'VND':'symbol':'1.0-0' }}</strong>
        </div>
        <div class="stat-tile accent">
          <span>Overall Progress</span>
          <strong>{{ overallProgress | number:'1.0-1' }}%</strong>
        </div>
      </section>

      <div *ngIf="loading" class="panel muted">Loading vaults...</div>

      <section *ngIf="!loading && vaults.length === 0" class="empty-state">
        <div class="mini-pig" aria-hidden="true"></div>
        <h2>No Savings Vaults Yet</h2>
        <p>Create your first vault for a trip, a gift, or your emergency fund.</p>
        <a class="primary-btn" routerLink="/vaults/new">Start Saving</a>
      </section>

      <section class="vault-grid" *ngIf="!loading && vaults.length > 0">
        <a class="vault-card" *ngFor="let vault of vaults" [routerLink]="['/vaults', vault.id]">
          <div class="card-head">
            <div class="coin-mark" aria-hidden="true"></div>
            <span class="status" [class.done]="vault.status === 'COMPLETED'" [class.closed]="vault.status === 'CLOSED'">
              {{ statusLabel(vault.status) }}
            </span>
          </div>

          <h3>{{ vault.name }}</h3>
          <p>{{ vault.description || 'Personal savings goal' }}</p>

          <div class="money-row">
            <strong>{{ vault.currentBalance | currency:'VND':'symbol':'1.0-0' }}</strong>
            <span>{{ remaining(vault) | currency:'VND':'symbol':'1.0-0' }} left</span>
          </div>

          <div class="progress-track">
            <div class="progress-fill" [style.width.%]="barProgress(vault)"></div>
          </div>

          <div class="meta-row">
            <span>{{ vault.currentBalance | currency:'VND':'symbol':'1.0-0' }} / {{ vault.targetAmount | currency:'VND':'symbol':'1.0-0' }}</span>
            <span *ngIf="vault.deadline">{{ vault.deadline | date:'dd/MM/yyyy' }}</span>
          </div>
          <div class="over-target" *ngIf="vault.currentBalance > vault.targetAmount">
            Over target by {{ (vault.currentBalance - vault.targetAmount) | currency:'VND':'symbol':'1.0-0' }}
          </div>
        </a>
      </section>
    </div>
  `,
  styles: [`
    .vault-page {
      font-family: 'Roboto', 'Inter', system-ui, -apple-system, sans-serif;
      display: flex;
      flex-direction: column;
      gap: 22px;
      color: #0f172a;
    }
    .vault-hero {
      position: relative; display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(260px, .85fr); gap: 24px;
      overflow: hidden; border-radius: 28px; padding: 34px;
      background: radial-gradient(circle at 80% 15%, rgba(255,255,255,.95), transparent 30%),
                  linear-gradient(135deg, #fff7fb 0%, #ffe1ef 40%, #fff5f9 70%, #f0f4ff 100%);
      border: 1px solid rgba(244,114,182,.25);
      box-shadow: 0 16px 48px rgba(194,0,103,.08);
    }
    .hero-copy { position: relative; z-index: 1; max-width: 680px; }
    .eyebrow { color: #c20067; font-size: .78rem; font-weight: 900; text-transform: uppercase; letter-spacing: .08em; }
    h1 {
      margin: 8px 0 10px;
      max-width: 760px;
      font-size: clamp(1.8rem, 3.2vw, 2.6rem);
      font-weight: 900;
      color: #0d2b5c;
      letter-spacing: -0.02em;
      line-height: 1.15;
    }
    .highlight-pink {
      background: linear-gradient(135deg, #c20067 0%, #0072ce 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .hero-copy p {
      margin: 0;
      max-width: 560px;
      color: #475569;
      font-size: 0.98rem;
      font-weight: 500;
      line-height: 1.5;
    }
    .hero-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; margin-top: 24px; }
    .primary-btn { display: inline-flex; justify-content: center; align-items: center; min-height: 46px; border: 0; border-radius: 14px; background: linear-gradient(135deg, #c20067 0%, #0072ce 100%); color: white; padding: 12px 22px; font-weight: 800; font-size: 0.9rem; letter-spacing: 0.01em; text-decoration: none; box-shadow: 0 8px 22px rgba(194, 0, 103, 0.25); cursor: pointer; transition: all 0.25s cubic-bezier(.16,1,.3,1); }
    .primary-btn:hover { transform: translateY(-2px); box-shadow: 0 12px 28px rgba(194, 0, 103, 0.35); background: linear-gradient(135deg, #e00077 0%, #0084eb 100%); }
    .soft-pill { display: inline-flex; align-items: center; min-height: 38px; border-radius: 999px; padding: 8px 16px; background: rgba(255,255,255,.9); color: #c20067; font-weight: 800; font-size: 0.85rem; border: 1px solid rgba(244,114,182,.3); }
    .pig-wrap { display: flex; align-items: center; justify-content: center; min-height: 210px; }
    .pig { width: min(100%, 360px); filter: drop-shadow(0 16px 24px rgba(194,0,103,.12)); }
    .stats-row { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
    .stat-tile, .panel, .empty-state, .vault-card { background: #ffffff; border: 1px solid #fce4ec; box-shadow: 0 8px 24px rgba(194,0,103,.04); }
    .stat-tile { border-radius: 18px; padding: 18px; transition: all .2s ease; }
    .stat-tile:hover { border-color: #f8bbd0; box-shadow: 0 12px 28px rgba(194,0,103,.06); }
    .stat-tile span { display: block; color: #64748b; font-weight: 800; font-size: .75rem; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.04em; }
    .stat-tile strong { color: #0d2b5c; font-weight: 900; font-size: clamp(1.15rem, 2vw, 1.5rem); letter-spacing: -0.01em; }
    .stat-tile.accent { background: linear-gradient(135deg, #fff0f6 0%, #eef6ff 100%); }
    .panel { border-radius: 18px; padding: 24px; color: #64748b; font-weight: 800; }
    .empty-state { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 12px; border-radius: 24px; padding: 42px 24px; border-color: #fce4ec; background: linear-gradient(180deg,#fffafc,#fff); }
    .empty-state h2 { margin: 0; font-size: 1.5rem; font-weight: 900; color: #0d2b5c; letter-spacing: -0.01em; }
    .empty-state p { margin: 0; max-width: 460px; color: #64748b; font-weight: 500; line-height: 1.5; }
    .mini-pig { width: 82px; height: 62px; border-radius: 42px 48px 36px 36px; background: linear-gradient(135deg, #ff8fc7, #e91e63); box-shadow: inset -10px -8px 0 rgba(190,24,93,.12), 0 14px 30px rgba(233,30,99,.12); }
    .vault-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(286px, 1fr)); gap: 18px; }
    .vault-card {
      display: flex; flex-direction: column; min-height: 250px; color: inherit; text-decoration: none;
      border-radius: 22px; padding: 20px;
      transition: all .25s cubic-bezier(.16,1,.3,1);
    }
    .vault-card:hover { transform: translateY(-4px) scale(1.01); box-shadow: 0 16px 36px rgba(194,0,103,.08); border-color: #f8bbd0; }
    .card-head, .money-row, .meta-row { display: flex; justify-content: space-between; gap: 12px; align-items: center; }
    .coin-mark { position: relative; width: 54px; height: 46px; border-radius: 24px 28px 24px 22px; background: linear-gradient(135deg, #ffd166, #d99a2b); box-shadow: inset -9px -10px 0 rgba(151,87,17,.1), 0 10px 18px rgba(217,154,43,.15); }
    .coin-mark::before { content: ''; position: absolute; left: 8px; top: -7px; width: 18px; height: 18px; border-radius: 6px 14px 6px 10px; background: #f5b942; transform: rotate(-28deg); }
    .coin-mark::after { content: ''; position: absolute; left: 6px; top: 5px; width: 24px; height: 24px; border-radius: 50%; background: #fff6d8; box-shadow: 35px 15px 0 -8px #f6c25b; }
    h3 { margin: 18px 0 6px; color: #0f172a; font-size: 1.1rem; font-weight: 800; line-height: 1.35; }
    .vault-card p { margin: 0; color: #64748b; font-weight: 500; font-size: 0.9rem; min-height: 44px; line-height: 1.45; }
    .status { border-radius: 999px; padding: 6px 12px; background: #fff0f6; color: #c20067; font-size: .75rem; font-weight: 800; letter-spacing: 0.02em; white-space: nowrap; border: 1px solid #f8bbd0; }
    .status.done { background: #e3f2fd; color: #0072ce; border-color: #bbdefb; }
    .status.closed { background: #f1f5f9; color: #475569; border-color: #cbd5e1; }
    .money-row { align-items: flex-end; margin-top: auto; padding-top: 18px; }
    .money-row strong { color: #c20067; font-size: 1.4rem; font-weight: 900; line-height: 1.1; letter-spacing: -0.01em; }
    .money-row span { color: #64748b; font-size: .85rem; font-weight: 700; text-align: right; }
    .progress-track { height: 12px; background: #fce4ec; border-radius: 999px; overflow: hidden; margin: 14px 0 10px; }
    .progress-fill { height: 100%; border-radius: inherit; background: linear-gradient(90deg, #c20067, #0072ce); }
    .meta-row, .over-target { color: #64748b; font-size: .85rem; font-weight: 700; }
    .over-target { margin-top: 8px; color: #c20067; font-weight: 800; }
    @media (max-width: 860px) { .vault-hero { grid-template-columns: 1fr; padding: 26px; } .pig-wrap { min-height: 150px; } .stats-row { grid-template-columns: 1fr; } }
    @media (max-width: 520px) { .vault-hero { border-radius: 20px; padding: 22px; } .primary-btn { width: 100%; } .soft-pill { width: 100%; justify-content: center; } .money-row { flex-direction: column; align-items: flex-start; } .money-row span { text-align: left; } }
  `]
})
export class VaultListComponent implements OnInit {
  vaults: VaultResponse[] = [];
  loading = true;

  constructor(private vaultService: VaultService) { }

  get activeCount(): number {
    return this.vaults.filter(v => v.status !== 'CLOSED').length;
  }

  get totalSaved(): number {
    return this.vaults.reduce((sum, vault) => sum + Number(vault.currentBalance || 0), 0);
  }

  get totalTarget(): number {
    return this.vaults.reduce((sum, vault) => sum + Number(vault.targetAmount || 0), 0);
  }

  get overallProgress(): number {
    return this.totalTarget ? Math.min((this.totalSaved / this.totalTarget) * 100, 100) : 0;
  }

  ngOnInit(): void {
    this.vaultService.getAll().subscribe({
      next: res => {
        this.vaults = res.data || [];
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  barProgress(vault: VaultResponse): number {
    return Math.min(Number(vault.progress || 0), 100);
  }

  remaining(vault: VaultResponse): number {
    return Math.max(Number(vault.targetAmount || 0) - Number(vault.currentBalance || 0), 0);
  }

  statusLabel(status: VaultResponse['status']): string {
    return { ACTIVE: 'Active', COMPLETED: 'Completed', CLOSED: 'Closed' }[status];
  }
}
