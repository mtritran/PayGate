import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subscription, timer } from 'rxjs';
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
          <svg class="pig" viewBox="0 0 380 300" role="img">
            <defs>
              <!-- Premium 3D Piggy Gradient -->
              <linearGradient id="pig3dBody" x1="15%" y1="10%" x2="85%" y2="90%">
                <stop offset="0%" stop-color="#ffdeeb"/>
                <stop offset="40%" stop-color="#ffb3d1"/>
                <stop offset="80%" stop-color="#f472b6"/>
                <stop offset="100%" stop-color="#e11d48"/>
              </linearGradient>

              <!-- Inner Ear & Snout Deep Pink Gradient -->
              <linearGradient id="pigDeepPink" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#fb7185"/>
                <stop offset="100%" stop-color="#be123c"/>
              </linearGradient>

              <!-- 3D Belly Soft Highlight -->
              <radialGradient id="bellyHighlight" cx="42%" cy="38%" r="62%">
                <stop offset="0%" stop-color="#ffffff" stop-opacity="0.65"/>
                <stop offset="60%" stop-color="#ffdbe9" stop-opacity="0.15"/>
                <stop offset="100%" stop-color="#f472b6" stop-opacity="0"/>
              </radialGradient>

              <!-- Gold Coin Shiny 3D Gradient -->
              <linearGradient id="goldCoinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#fef08a"/>
                <stop offset="35%" stop-color="#f59e0b"/>
                <stop offset="100%" stop-color="#92400e"/>
              </linearGradient>

              <!-- Ground Soft Shadow -->
              <radialGradient id="groundShadow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stop-color="#9d174d" stop-opacity="0.22"/>
                <stop offset="100%" stop-color="#9d174d" stop-opacity="0"/>
              </radialGradient>
            </defs>

            <!-- Ground Shadow (Mặt đất phẳng bóng đẻ) -->
            <ellipse cx="190" cy="272" rx="125" ry="16" fill="url(#groundShadow)"/>

            <!-- Left Ear (Back Layer) -->
            <g transform="rotate(-15, 125, 65)">
              <ellipse cx="125" cy="65" rx="22" ry="34" fill="#e11d48"/>
              <ellipse cx="125" cy="67" rx="14" ry="24" fill="#be123c" opacity="0.7"/>
            </g>

            <!-- Right Ear (Front Layer - Symmetrical & Cute) -->
            <g transform="rotate(15, 205, 65)">
              <ellipse cx="205" cy="65" rx="24" ry="36" fill="url(#pig3dBody)"/>
              <ellipse cx="205" cy="67" rx="15" ry="25" fill="url(#pigDeepPink)"/>
            </g>

            <!-- Back Legs (Tạo độ sâu 3D phía sau) -->
            <rect x="110" y="210" width="38" height="50" rx="19" fill="#be123c"/>
            <rect x="220" y="210" width="38" height="50" rx="19" fill="#be123c"/>

            <!-- Tail (Đuôi xoắn dễ thương cân đối ở hông) -->
            <path d="M 68 150 C 42 145 44 175 60 178 C 72 180 75 160 62 158" fill="none" stroke="#f472b6" stroke-width="7" stroke-linecap="round"/>

            <!-- Main Body (Thân heo to tròn mập mạp) -->
            <ellipse cx="185" cy="165" rx="120" ry="90" fill="url(#pig3dBody)"/>
            <ellipse cx="168" cy="145" rx="100" ry="72" fill="url(#bellyHighlight)"/>

            <!-- Coin Slot (Khe thả coin nằm chính giữa lưng heo) -->
            <ellipse cx="165" cy="80" rx="34" ry="8" fill="#831843"/>
            <ellipse cx="165" cy="80" rx="28" ry="4.5" fill="#38020f"/>

            <!-- Floating Gold Coin (Đồng xu vàng thả xuống khe) -->
            <g class="floating-coin">
              <ellipse cx="165" cy="38" rx="25" ry="25" fill="url(#goldCoinGrad)"/>
              <ellipse cx="165" cy="38" rx="19" ry="19" fill="none" stroke="#fef08a" stroke-width="2.5"/>
              <text x="165" y="45" font-family="system-ui, sans-serif" font-size="20" font-weight="900" fill="#78350f" text-anchor="middle">$</text>
            </g>

            <!-- Front Legs (Chân trước mập mạp đều đặn) -->
            <g>
              <rect x="130" y="218" width="40" height="52" rx="20" fill="url(#pig3dBody)"/>
              <ellipse cx="150" cy="264" rx="17" ry="5.5" fill="#be123c" opacity="0.35"/>

              <rect x="230" y="218" width="40" height="52" rx="20" fill="url(#pig3dBody)"/>
              <ellipse cx="250" cy="264" rx="17" ry="5.5" fill="#be123c" opacity="0.35"/>
            </g>

            <!-- Cheerful Big Eye (Mắt to tròn lanh lợi) -->
            <g>
              <ellipse cx="245" cy="138" rx="12" ry="15" fill="#ffffff"/>
              <circle cx="247.5" cy="138" r="8" fill="#0f172a"/>
              <circle cx="250.5" cy="134.5" r="3" fill="#ffffff"/>
              <circle cx="244" cy="140.5" r="1.5" fill="#ffffff"/>
            </g>

            <!-- Rosy Cheek Blush (Má hồng mũm mĩm) -->
            <ellipse cx="232" cy="165" rx="18" ry="10" fill="#f43f5e" opacity="0.38"/>

            <!-- Snout / Nose (Mũi heo 3D xinh xắn đặt chuẩn tỉ lệ) -->
            <g>
              <ellipse cx="282" cy="160" rx="28" ry="20" fill="url(#pigDeepPink)"/>
              <ellipse cx="282" cy="153" rx="22" ry="7" fill="#ffffff" opacity="0.25"/>
              <ellipse cx="272" cy="160" rx="6" ry="8" fill="#38020f"/>
              <ellipse cx="292" cy="160" rx="6" ry="8" fill="#38020f"/>
            </g>
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
    .pig-wrap { display: flex; align-items: center; justify-content: center; min-height: 240px; }
    .pig {
      width: min(100%, 380px);
      filter: drop-shadow(0 20px 30px rgba(190, 24, 93, 0.18));
      animation: pigBobbing 4s ease-in-out infinite;
    }
    .floating-coin {
      animation: coinDrop 2.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
    }

    @keyframes pigBobbing {
      0%, 100% { transform: translateY(0) rotate(0deg); }
      50% { transform: translateY(-8px) rotate(1deg); }
    }
    @keyframes coinDrop {
      0% { transform: translateY(-16px); opacity: 0; }
      30% { opacity: 1; }
      80% { transform: translateY(22px); opacity: 1; }
      100% { transform: translateY(28px); opacity: 0; }
    }
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
export class VaultListComponent implements OnInit, OnDestroy {
  vaults: VaultResponse[] = [];
  loading = true;
  private pollingSub: Subscription | null = null;

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

    // SWR Realtime Polling ngầm 5s/lần cho Hũ Tiết Kiệm
    this.pollingSub = timer(5000, 5000).subscribe(() => {
      this.vaultService.getAll().subscribe({
        next: res => {
          if (res.data) this.vaults = res.data;
        }
      });
    });
  }

  ngOnDestroy(): void {
    if (this.pollingSub) {
      this.pollingSub.unsubscribe();
    }
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
