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
          <h1>Grow small goals into real plans</h1>
          <p>Separate money into dedicated vaults, track progress clearly, and add more whenever you want.</p>
          <div class="hero-actions">
            <a class="primary-btn" routerLink="/vaults/new">Create Vault</a>
            <span class="soft-pill">{{ activeCount }} active vaults</span>
          </div>
        </div>

        <div class="pig-wrap" aria-hidden="true">
          <svg class="pig" viewBox="0 0 360 260" role="img">
            <defs>
              <linearGradient id="pigBody" x1="40" y1="40" x2="300" y2="220">
                <stop stop-color="#ff8fc7"/>
                <stop offset="1" stop-color="#ff4fa3"/>
              </linearGradient>
              <linearGradient id="coinGold" x1="0" y1="0" x2="1" y2="1">
                <stop stop-color="#ffe08a"/>
                <stop offset="1" stop-color="#ffb020"/>
              </linearGradient>
            </defs>
            <circle cx="86" cy="80" r="26" fill="#fff1f7"/>
            <circle cx="293" cy="54" r="18" fill="#fff1f7"/>
            <rect x="145" y="22" width="70" height="22" rx="11" fill="url(#coinGold)"/>
            <path d="M74 136c0-58 55-96 136-96 65 0 114 28 132 72 16-6 28 1 29 18 1 19-12 31-33 31-18 42-65 68-128 68-17 0-34-2-49-6l-24 27h-36l7-43c-22-16-34-41-34-71z" fill="url(#pigBody)"/>
            <path d="M98 98c-7-30 5-57 31-75l28 45" fill="#ff7abb"/>
            <circle cx="254" cy="118" r="8" fill="#7c1049"/>
            <ellipse cx="311" cy="143" rx="25" ry="20" fill="#ffb0d3"/>
            <circle cx="303" cy="143" r="4" fill="#7c1049"/>
            <circle cx="319" cy="143" r="4" fill="#7c1049"/>
            <rect x="135" y="72" width="102" height="12" rx="6" fill="#bf1b69" opacity=".38"/>
            <path d="M118 229h36v20h-36zM235 229h36v20h-36z" fill="#d93683"/>
            <path d="M53 131c-20-9-26 16-7 24 13 6 25-2 22-13" fill="none" stroke="#d93683" stroke-width="12" stroke-linecap="round"/>
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
      color: #23152f;
    }
    .vault-hero { position: relative; display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(260px, .85fr); gap: 24px; overflow: hidden; border-radius: 28px; padding: 34px; background: radial-gradient(circle at 82% 18%, rgba(255,255,255,.9), transparent 28%), linear-gradient(135deg, #fff7fb 0%, #ffe1ef 46%, #e9fbf1 100%); border: 1px solid rgba(244,114,182,.24); box-shadow: 0 24px 60px rgba(190, 24, 93, .12); }
    .hero-copy { position: relative; z-index: 1; max-width: 680px; }
    .eyebrow { color: #be185d; font-size: .82rem; font-weight: 900; text-transform: uppercase; letter-spacing: .08em; }
    h1 { margin: 8px 0 10px; max-width: 760px; font-size: clamp(2rem, 4vw, 3.6rem); font-weight: 900; line-height: 1.04; color: #2b1238; letter-spacing: -0.01em; }
    .hero-copy p { margin: 0; max-width: 560px; color: #5a2745; font-size: 1.02rem; font-weight: 600; line-height: 1.65; }
    .hero-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; margin-top: 24px; }
    .primary-btn { display: inline-flex; justify-content: center; align-items: center; min-height: 46px; border: 0; border-radius: 14px; background: linear-gradient(135deg, #e91e63, #b5179e); color: white; padding: 12px 22px; font-weight: 900; font-size: 0.95rem; letter-spacing: 0.01em; text-decoration: none; box-shadow: 0 12px 26px rgba(233, 30, 99, .28); cursor: pointer; }
    .soft-pill { display: inline-flex; align-items: center; min-height: 38px; border-radius: 999px; padding: 8px 16px; background: rgba(255,255,255,.85); color: #8a1f57; font-weight: 900; font-size: 0.85rem; border: 1px solid rgba(244,114,182,.3); }
    .pig-wrap { display: flex; align-items: center; justify-content: center; min-height: 210px; }
    .pig { width: min(100%, 360px); filter: drop-shadow(0 22px 30px rgba(190, 24, 93, .22)); }
    .stats-row { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
    .stat-tile, .panel, .empty-state, .vault-card { background: #ffffff; border: 1px solid #f3d6e5; box-shadow: 0 14px 34px rgba(99, 24, 75, .07); }
    .stat-tile { border-radius: 18px; padding: 18px; }
    .stat-tile span { display: block; color: #6b405e; font-weight: 800; font-size: .85rem; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.03em; }
    .stat-tile strong { color: #2b1238; font-weight: 900; font-size: clamp(1.15rem, 2vw, 1.5rem); }
    .stat-tile.accent { background: linear-gradient(135deg, #fff1f7, #f0fdf4); }
    .panel { border-radius: 18px; padding: 24px; color: #6b405e; font-weight: 800; }
    .empty-state { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 12px; border-radius: 24px; padding: 42px 24px; }
    .empty-state h2 { margin: 0; font-size: 1.8rem; font-weight: 900; color: #2b1238; }
    .empty-state p { margin: 0; max-width: 460px; color: #6b405e; font-weight: 600; line-height: 1.55; }
    .mini-pig { width: 82px; height: 62px; border-radius: 42px 48px 36px 36px; background: linear-gradient(135deg, #ff8fc7, #e91e63); box-shadow: inset -10px -8px 0 rgba(190,24,93,.18), 0 14px 30px rgba(233,30,99,.18); }
    .vault-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(286px, 1fr)); gap: 18px; }
    .vault-card { display: flex; flex-direction: column; min-height: 250px; color: inherit; text-decoration: none; border-radius: 22px; padding: 20px; transition: transform .18s ease, box-shadow .18s ease; }
    .vault-card:hover { transform: translateY(-3px); box-shadow: 0 20px 42px rgba(190, 24, 93, .13); }
    .card-head, .money-row, .meta-row { display: flex; justify-content: space-between; gap: 12px; align-items: center; }
    .coin-mark { position: relative; width: 54px; height: 46px; border-radius: 24px 28px 24px 22px; background: linear-gradient(135deg, #ffd166, #d99a2b); box-shadow: inset -9px -10px 0 rgba(151,87,17,.15), 0 10px 18px rgba(217,154,43,.2); }
    .coin-mark::before { content: ''; position: absolute; left: 8px; top: -7px; width: 18px; height: 18px; border-radius: 6px 14px 6px 10px; background: #f5b942; transform: rotate(-28deg); }
    .coin-mark::after { content: ''; position: absolute; left: 6px; top: 5px; width: 24px; height: 24px; border-radius: 50%; background: #fff6d8; box-shadow: 35px 15px 0 -8px #f6c25b; }
    h3 { margin: 18px 0 6px; color: #2b1238; font-size: 1.25rem; font-weight: 800; line-height: 1.25; }
    .vault-card p { margin: 0; color: #6b405e; font-weight: 600; min-height: 44px; line-height: 1.45; }
    .status { border-radius: 999px; padding: 6px 12px; background: #fff1f7; color: #be185d; font-size: .75rem; font-weight: 900; letter-spacing: 0.02em; white-space: nowrap; }
    .status.done { background: #dcfce7; color: #15803d; }
    .status.closed { background: #f1f5f9; color: #475569; }
    .money-row { align-items: flex-end; margin-top: auto; padding-top: 18px; }
    .money-row strong { color: #be185d; font-size: 1.4rem; font-weight: 900; line-height: 1.1; }
    .money-row span { color: #6b405e; font-size: .85rem; font-weight: 800; text-align: right; }
    .progress-track { height: 12px; background: #f8d7e7; border-radius: 999px; overflow: hidden; margin: 14px 0 10px; }
    .progress-fill { height: 100%; border-radius: inherit; background: linear-gradient(90deg, #e91e63, #ffb020, #22c55e); }
    .meta-row, .over-target { color: #5a2745; font-size: .85rem; font-weight: 800; }
    .over-target { margin-top: 8px; color: #be185d; font-weight: 900; }
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
