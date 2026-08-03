import { Component, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { VaultResponse, VaultService } from '../vault.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-vault-detail',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, DatePipe, ReactiveFormsModule, RouterLink],
  template: `
    <div class="vault-detail fade-in-up" *ngIf="vault">
      <a routerLink="/vaults" class="back-link">← All vaults</a>

      <section class="detail-hero">
        <div class="hero-main">
          <div class="hero-tools">
            <span class="status" [class.done]="vault.status === 'COMPLETED'" [class.closed]="vault.status === 'CLOSED'">
              {{ statusLabel(vault.status) }}
            </span>
            <button type="button" class="edit-btn" (click)="openEdit()">Edit Goal</button>
          </div>

          <h1>{{ vault.name }}</h1>
          <p>{{ vault.description || 'Personal savings goal' }}</p>

          <div class="amount-row">
            <div>
              <span>Saved</span>
              <strong>{{ vault.currentBalance | currency:'VND':'symbol':'1.0-0' }}</strong>
            </div>
            <div>
              <span>Target</span>
              <strong>{{ vault.targetAmount | currency:'VND':'symbol':'1.0-0' }}</strong>
            </div>
          </div>

          <div class="progress-track"><div class="progress-fill" [style.width.%]="barProgress"></div></div>
          <div class="meta">
            <span>{{ vault.progress | number:'1.0-1' }}% / 100%</span>
            <span *ngIf="vault.deadline">Due {{ vault.deadline | date:'dd/MM/yyyy' }}</span>
          </div>
        </div>

        <div class="hero-art" aria-hidden="true">
          <svg viewBox="0 0 330 250">
            <defs>
              <linearGradient id="detailPig2" x1="20" y1="30" x2="300" y2="210">
                <stop offset="0%" stop-color="#ffd6e7"/>
                <stop offset="50%" stop-color="#ffb8d0"/>
                <stop offset="100%" stop-color="#f48fb1"/>
              </linearGradient>
              <radialGradient id="detailBelly" cx="0.5" cy="0.45" r="0.5">
                <stop offset="0%" stop-color="#fff5f9" stop-opacity="0.85"/>
                <stop offset="100%" stop-color="#ffb8d0" stop-opacity="0"/>
              </radialGradient>
              <linearGradient id="detailCoin" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stop-color="#ffe68f"/>
                <stop offset="100%" stop-color="#f59e0b"/>
              </linearGradient>
              <linearGradient id="detailNose" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#f06292"/>
                <stop offset="100%" stop-color="#c20067"/>
              </linearGradient>
            </defs>
            <!-- Ears -->
            <ellipse cx="90" cy="68" rx="24" ry="28" fill="#f48fb1" transform="rotate(-18 90 68)"/>
            <ellipse cx="90" cy="72" rx="14" ry="18" fill="#ec407a" opacity="0.5" transform="rotate(-18 90 72)"/>
            <ellipse cx="226" cy="68" rx="24" ry="28" fill="#f48fb1" transform="rotate(18 226 68)"/>
            <ellipse cx="226" cy="72" rx="14" ry="18" fill="#ec407a" opacity="0.5" transform="rotate(18 226 72)"/>
            <!-- Body -->
            <path d="M68 132 c0-46 42-78 107-78 52 0 94 20 110 54 11-4 22 2 23 12 1 14-10 24-28 24-16 34-56 54-110 54-14 0-28-2-41-5l-18 20h-30l6-34c-18-15-28-33-28-52z" fill="url(#detailPig2)"/>
            <!-- Belly -->
            <ellipse cx="165" cy="126" rx="76" ry="30" fill="url(#detailBelly)"/>
            <!-- Tail -->
            <path d="M48 120 c-12-6-18 10-4 16 8 3 16-1 14-8" fill="none" stroke="#f48fb1" stroke-width="7" stroke-linecap="round"/>
            <!-- Legs -->
            <rect x="106" y="200" width="28" height="16" rx="8" fill="url(#detailPig2)"/>
            <rect x="198" y="200" width="28" height="16" rx="8" fill="url(#detailPig2)"/>
            <ellipse cx="120" cy="218" rx="20" ry="6" fill="#e88ba8"/>
            <ellipse cx="212" cy="218" rx="20" ry="6" fill="#e88ba8"/>
            <!-- Coin -->
            <rect x="126" y="16" width="68" height="20" rx="10" fill="url(#detailCoin)"/>
            <text x="160" y="30" font-family="Arial,sans-serif" font-size="13" font-weight="900" fill="#92400e" text-anchor="middle">$</text>
            <!-- Eye -->
            <ellipse cx="206" cy="106" rx="8" ry="10" fill="#fff"/>
            <circle cx="208" cy="106" r="5" fill="#380e1f"/>
            <circle cx="210" cy="103.5" r="1.8" fill="#fff"/>
            <!-- Blush -->
            <ellipse cx="192" cy="120" rx="12" ry="6" fill="#ec407a" opacity="0.12"/>
            <!-- Snout -->
            <ellipse cx="248" cy="128" rx="18" ry="14" fill="url(#detailNose)"/>
            <circle cx="240" cy="127" r="3" fill="#380e1f" opacity="0.5"/>
            <circle cx="256" cy="127" r="3" fill="#380e1f" opacity="0.5"/>
            <ellipse cx="248" cy="124" rx="10" ry="3.5" fill="#fff" opacity="0.15"/>
          </svg>
        </div>
      </section>

      <section class="quick-stats">
        <div>
          <span>Remaining</span>
          <strong>{{ remaining | currency:'VND':'symbol':'1.0-0' }}</strong>
        </div>
        <div>
          <span>Days Left</span>
          <strong>{{ daysLeft }}</strong>
        </div>
        <div>
          <span>Status</span>
          <strong>{{ statusLabel(vault.status) }}</strong>
        </div>
      </section>

      <section class="action-dock" *ngIf="vault.status !== 'CLOSED'">
        <button type="button" class="dock-btn deposit" (click)="activeAction = 'deposit'">
          <span>Add to vault</span>
          <strong>+ Save</strong>
        </button>
        <button type="button" class="dock-btn withdraw" (click)="activeAction = 'withdraw'">
          <span>Withdraw from vault</span>
          <strong>Flexible</strong>
        </button>
      </section>

      <form *ngIf="activeAction === 'edit'" [formGroup]="editForm" (ngSubmit)="saveEdit()" class="action-panel edit-panel">
        <div class="panel-head">
          <div>
            <span>Edit</span>
            <h2>Update savings goal</h2>
          </div>
          <button type="button" class="icon-btn" (click)="activeAction = null">x</button>
        </div>
        <div class="edit-grid">
          <label>
            Vault name
            <input formControlName="name" placeholder="New tires">
          </label>
          <label>
            New target
            <input type="number" formControlName="targetAmount" min="1" placeholder="300000">
          </label>
          <label>
            Deadline
            <input type="date" formControlName="deadline">
          </label>
          <label>
            Note
            <textarea formControlName="description" rows="3" placeholder="Goal note"></textarea>
          </label>
        </div>
        <button class="submit-btn" type="submit" [disabled]="editForm.invalid || submitting">Save Changes</button>
      </form>

      <form
        *ngIf="activeAction === 'deposit' && vault.status !== 'CLOSED'"
        [formGroup]="depositForm"
        (ngSubmit)="deposit()"
        class="action-panel"
      >
        <div class="panel-head">
          <div>
            <span>Deposit</span>
            <h2>Move closer to your goal</h2>
          </div>
          <button type="button" class="icon-btn" (click)="activeAction = null">x</button>
        </div>
        <div class="form-grid">
          <input type="number" formControlName="amount" placeholder="Amount">
          <input formControlName="description" placeholder="Note">
        </div>
        <button class="submit-btn" type="submit" [disabled]="depositForm.invalid || submitting">Confirm Deposit</button>
      </form>

      <form
        *ngIf="activeAction === 'withdraw' && vault.status !== 'CLOSED'"
        [formGroup]="withdrawForm"
        (ngSubmit)="withdraw()"
        class="action-panel withdraw-panel"
      >
        <div class="panel-head">
          <div>
            <span>Withdraw</span>
            <h2>Use funds when needed</h2>
          </div>
          <button type="button" class="icon-btn" (click)="activeAction = null">x</button>
        </div>
        <div class="form-grid">
          <input type="number" formControlName="amount" placeholder="Amount">
          <input formControlName="description" placeholder="Note">
        </div>
        <button class="submit-btn withdraw-submit" type="submit" [disabled]="withdrawForm.invalid || submitting">Confirm Withdrawal</button>
      </form>

      <div class="closed-panel" *ngIf="vault.status === 'CLOSED'">
        <div>
          <span>Vault is closed</span>
          <strong>Reopen it to deposit or withdraw again.</strong>
        </div>
        <button type="button" (click)="reopen()" [disabled]="submitting">Reopen Vault</button>
      </div>

      <button class="close-btn" *ngIf="vault.status !== 'CLOSED'" (click)="close()" [disabled]="submitting">Close Vault</button>
    </div>

    <div class="panel" *ngIf="!vault && loading">Loading vault...</div>
  `,
  styles: [`
    .vault-detail {
      font-family: 'Roboto', 'Inter', system-ui, -apple-system, sans-serif;
      display: flex;
      flex-direction: column;
      gap: 18px;
      color: #0f172a;
    }
    .back-link { width: fit-content; color: #c20067; text-decoration: none; font-weight: 800; }
    .back-link:hover { color: #e00077; }
    .detail-hero {
      display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(250px, .8fr); gap: 20px;
      overflow: hidden; border-radius: 28px; padding: 30px;
      background: radial-gradient(circle at 80% 15%, rgba(255,255,255,.95), transparent 30%),
                  linear-gradient(135deg, #fff7fb 0%, #ffe1ef 40%, #fff5f9 70%, #f0f4ff 100%);
      border: 1px solid rgba(244,114,182,.25);
      box-shadow: 0 16px 48px rgba(194,0,103,.08);
    }
    .hero-main { min-width: 0; }
    .hero-tools { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
    h1 {
      margin: 12px 0 8px;
      color: #0d2b5c;
      font-size: clamp(1.8rem, 3.2vw, 2.6rem);
      font-weight: 900;
      line-height: 1.15;
      letter-spacing: -0.02em;
      word-break: break-word;
    }
    p { margin: 0; color: #475569; font-size: 0.98rem; font-weight: 500; line-height: 1.5; }
    .status { display: inline-flex; width: fit-content; border-radius: 999px; padding: 7px 14px; background: rgba(255,255,255,.9); color: #c20067; font-size: .8rem; font-weight: 800; border: 1px solid rgba(244,114,182,.3); }
    .status.done { color: #0072ce; background: #e3f2fd; border-color: #bbdefb; }
    .status.closed { color: #475569; background: #f1f5f9; border-color: #cbd5e1; }
    button { font: inherit; cursor: pointer; }
    button:disabled { opacity: .5; cursor: not-allowed; box-shadow: none; }
    .edit-btn { border: 1px solid rgba(244,114,182,.3); border-radius: 999px; background: rgba(255,255,255,.9); color: #c20067; padding: 8px 15px; font-weight: 800; transition: all .15s; }
    .edit-btn:hover { background: #fff0f6; }
    .amount-row { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; margin-top: 24px; }
    .amount-row div, .quick-stats div, .panel, .action-panel, .closed-panel { background: #fff; border: 1px solid #fce4ec; box-shadow: 0 8px 24px rgba(194,0,103,.04); }
    .amount-row div { border-radius: 18px; padding: 16px; transition: all .2s ease; }
    .amount-row div:hover { border-color: #f8bbd0; }
    .amount-row span, .quick-stats span, .panel-head span, .closed-panel span { display: block; color: #64748b; font-weight: 800; font-size: .75rem; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.04em; }
    .amount-row strong { color: #c20067; font-size: clamp(1.25rem, 2.5vw, 1.7rem); font-weight: 900; letter-spacing: -0.01em; }
    .progress-track { height: 14px; background: #fce4ec; border-radius: 999px; overflow: hidden; margin: 22px 0 10px; }
    .progress-fill { height: 100%; border-radius: inherit; background: linear-gradient(90deg, #c20067, #0072ce); }
    .meta { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 10px; color: #64748b; font-size: .9rem; font-weight: 700; }
    .hero-art { display: flex; align-items: center; justify-content: center; min-height: 220px; }
    .hero-art svg { width: min(100%, 330px); filter: drop-shadow(0 16px 24px rgba(194,0,103,.12)); }
    .quick-stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
    .quick-stats div { border-radius: 18px; padding: 18px; transition: all .2s ease; }
    .quick-stats div:hover { border-color: #f8bbd0; }
    .quick-stats strong { color: #0d2b5c; font-size: 1.25rem; font-weight: 900; letter-spacing: -0.01em; }
    .action-dock { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
    .dock-btn { min-height: 96px; border: 0; border-radius: 22px; padding: 20px; text-align: left; color: #fff; box-shadow: 0 12px 28px rgba(194,0,103,.12); transition: all .2s cubic-bezier(.16,1,.3,1); }
    .dock-btn:hover { transform: translateY(-2px); }
    .dock-btn span { display: block; font-weight: 800; opacity: .92; margin-bottom: 8px; font-size: 0.85rem; letter-spacing: 0.03em; text-transform: uppercase; }
    .dock-btn strong { display: block; font-size: 1.55rem; font-weight: 900; line-height: 1.1; letter-spacing: -0.01em; }
    .dock-btn.deposit { background: linear-gradient(135deg, #c20067, #0072ce); }
    .dock-btn.withdraw { background: linear-gradient(135deg, #0d2b5c, #0072ce); }
    .action-panel, .closed-panel { border-radius: 22px; padding: 22px; }
    .panel-head, .closed-panel { display: flex; justify-content: space-between; align-items: center; gap: 16px; }
    h2 { margin: 0; color: #0d2b5c; font-size: 1.35rem; font-weight: 900; line-height: 1.25; letter-spacing: -0.01em; }
    .icon-btn { width: 38px; height: 38px; border: 1px solid #fce4ec; border-radius: 50%; background: #fffafc; color: #c20067; font-size: 1.4rem; line-height: 1; box-shadow: none; cursor: pointer; }
    .icon-btn:hover { background: #fff0f6; }
    .form-grid { display: grid; grid-template-columns: minmax(0, .45fr) minmax(0, .55fr); gap: 12px; margin: 18px 0 14px; }
    .edit-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; margin: 18px 0 14px; }
    label { display: flex; flex-direction: column; gap: 8px; color: #0d2b5c; font-weight: 800; }
    input, textarea { width: 100%; box-sizing: border-box; border: 1px solid #f3c2da; border-radius: 14px; padding: 13px 14px; font: inherit; color: #0f172a; background: #fffafd; }
    textarea { resize: vertical; min-height: 96px; }
    input:focus, textarea:focus { outline: 3px solid rgba(194,0,103,.12); border-color: #c20067; background: #fff; }
    .submit-btn, .closed-panel button { width: 100%; border: 0; border-radius: 15px; min-height: 46px; background: linear-gradient(135deg, #c20067 0%, #0072ce 100%); color: white; padding: 12px 18px; font-weight: 800; box-shadow: 0 8px 22px rgba(194,0,103,.25); transition: all .2s ease; }
    .submit-btn:hover:not(:disabled), .closed-panel button:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 12px 28px rgba(194,0,103,.35); }
    .withdraw-submit { background: linear-gradient(135deg, #0d2b5c, #0072ce); }
    .closed-panel button { width: auto; min-width: 170px; background: linear-gradient(135deg, #0072ce, #c20067); }
    .close-btn { align-self: flex-start; border: 1px solid #fecaca; border-radius: 15px; min-height: 46px; background: #fef2f2; color: #dc2626; padding: 12px 18px; font-weight: 800; box-shadow: none; transition: all .15s; }
    .close-btn:hover { background: #fee2e2; }
    .panel { border-radius: 18px; padding: 24px; color: #64748b; font-weight: 800; }
    @media (max-width: 900px) { .detail-hero, .action-dock { grid-template-columns: 1fr; } .quick-stats { grid-template-columns: 1fr; } }
    @media (max-width: 620px) { .detail-hero { border-radius: 20px; padding: 22px; } .amount-row, .form-grid, .edit-grid { grid-template-columns: 1fr; } .meta, .panel-head, .closed-panel { flex-direction: column; align-items: flex-start; } .close-btn, .closed-panel button { width: 100%; } }
  `]
})
export class VaultDetailComponent implements OnInit {
  vault: VaultResponse | null = null;
  activeAction: 'deposit' | 'withdraw' | 'edit' | null = null;
  loading = true;
  submitting = false;

  editForm = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    targetAmount: [1, [Validators.required, Validators.min(1)]],
    deadline: [''],
    description: ['', [Validators.maxLength(500)]]
  });
  depositForm = this.fb.group({
    amount: [500000, [Validators.required, Validators.min(1)]],
    description: ['']
  });
  withdrawForm = this.fb.group({
    amount: [200000, [Validators.required, Validators.min(1)]],
    description: ['']
  });

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private vaultService: VaultService,
    private notification: NotificationService
  ) {}

  get id(): number {
    return Number(this.route.snapshot.paramMap.get('id'));
  }

  get barProgress(): number {
    return Math.min(Number(this.vault?.progress || 0), 100);
  }

  get remaining(): number {
    return Math.max(Number(this.vault?.targetAmount || 0) - Number(this.vault?.currentBalance || 0), 0);
  }

  get daysLeft(): string {
    if (!this.vault?.deadline) return 'No deadline';
    const end = new Date(this.vault.deadline);
    const today = new Date();
    end.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    const days = Math.ceil((end.getTime() - today.getTime()) / 86400000);
    if (days < 0) return 'Overdue';
    if (days === 0) return 'Today';
    return `${days} days`;
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.vaultService.getById(this.id).subscribe({
      next: res => {
        this.vault = res.data || null;
        this.patchEditForm();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.router.navigate(['/vaults']);
      }
    });
  }

  openEdit(): void {
    this.patchEditForm();
    this.activeAction = 'edit';
  }

  saveEdit(): void {
    if (this.editForm.invalid) return;
    this.submitting = true;
    const raw = this.editForm.getRawValue();
    this.vaultService.update(this.id, {
      name: raw.name || '',
      targetAmount: Number(raw.targetAmount || 0),
      deadline: raw.deadline || undefined,
      description: raw.description || undefined
    }).subscribe({
      next: () => {
        this.notification.success('Vault updated');
        this.submitting = false;
        this.activeAction = null;
        this.load();
      },
      error: err => this.fail(err)
    });
  }

  deposit(): void {
    this.move('deposit');
  }

  withdraw(): void {
    this.move('withdraw');
  }

  close(): void {
    this.submitting = true;
    this.vaultService.close(this.id).subscribe({
      next: () => {
        this.notification.success('Vault closed');
        this.submitting = false;
        this.activeAction = null;
        this.load();
      },
      error: err => this.fail(err)
    });
  }

  reopen(): void {
    this.submitting = true;
    this.vaultService.reopen(this.id).subscribe({
      next: () => {
        this.notification.success('Vault reopened');
        this.submitting = false;
        this.load();
      },
      error: err => this.fail(err)
    });
  }

  statusLabel(status: VaultResponse['status']): string {
    return { ACTIVE: 'Active', COMPLETED: 'Completed', CLOSED: 'Closed' }[status];
  }

  private patchEditForm(): void {
    if (!this.vault) return;
    this.editForm.patchValue({
      name: this.vault.name,
      targetAmount: Number(this.vault.targetAmount || 0),
      deadline: this.vault.deadline || '',
      description: this.vault.description || ''
    });
  }

  private move(type: 'deposit' | 'withdraw'): void {
    const form = type === 'deposit' ? this.depositForm : this.withdrawForm;
    if (form.invalid) return;
    this.submitting = true;
    const raw = form.getRawValue();
    const req = { amount: Number(raw.amount || 0), description: raw.description || undefined };
    const call = type === 'deposit' ? this.vaultService.deposit(this.id, req) : this.vaultService.withdraw(this.id, req);
    call.subscribe({
      next: () => {
        this.notification.success(type === 'deposit' ? 'Deposit successful' : 'Withdrawal successful');
        this.submitting = false;
        this.activeAction = null;
        this.load();
      },
      error: err => this.fail(err)
    });
  }

  private fail(err: any): void {
    this.submitting = false;
    this.notification.error(err.error?.message || 'Vault action failed');
  }
}
