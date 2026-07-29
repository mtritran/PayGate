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
              <linearGradient id="detailPig" x1="40" y1="34" x2="280" y2="210">
                <stop stop-color="#ff9dce"/>
                <stop offset="1" stop-color="#df1f76"/>
              </linearGradient>
            </defs>
            <circle cx="73" cy="84" r="22" fill="#fff1f7"/>
            <rect x="130" y="26" width="76" height="22" rx="11" fill="#ffd166"/>
            <path d="M62 132c0-55 52-91 128-91 61 0 107 27 124 68 15-5 27 2 28 18 1 18-13 29-32 29-17 39-61 63-120 63-16 0-32-2-46-6l-22 25H89l7-40c-22-16-34-39-34-66z" fill="url(#detailPig)"/>
            <path d="M88 93c-7-28 5-53 29-70l26 42" fill="#ff7abb"/>
            <circle cx="239" cy="112" r="8" fill="#65143e"/>
            <ellipse cx="292" cy="137" rx="24" ry="19" fill="#ffb0d3"/>
            <circle cx="284" cy="137" r="4" fill="#65143e"/>
            <circle cx="300" cy="137" r="4" fill="#65143e"/>
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
      color: #24142f;
    }
    .back-link { width: fit-content; color: #be185d; text-decoration: none; font-weight: 900; }
    .detail-hero { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(250px, .8fr); gap: 20px; overflow: hidden; border-radius: 28px; padding: 30px; background: radial-gradient(circle at 84% 20%, rgba(255,255,255,.92), transparent 30%), linear-gradient(135deg, #fff7fb 0%, #ffe1ef 48%, #e9fbf1 100%); border: 1px solid rgba(244,114,182,.24); box-shadow: 0 24px 60px rgba(190, 24, 93, .12); }
    .hero-main { min-width: 0; }
    .hero-tools { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
    h1 { margin: 12px 0 8px; color: #2b1238; font-size: clamp(2rem, 4vw, 3.2rem); line-height: 1.05; letter-spacing: 0; word-break: break-word; }
    p { margin: 0; color: #74425d; line-height: 1.6; }
    .status { display: inline-flex; width: fit-content; border-radius: 999px; padding: 7px 12px; background: rgba(255,255,255,.72); color: #be185d; font-size: .78rem; font-weight: 900; border: 1px solid rgba(244,114,182,.25); }
    .status.done { color: #15803d; background: #dcfce7; }
    .status.closed { color: #64748b; background: #f1f5f9; }
    button { font: inherit; cursor: pointer; }
    button:disabled { opacity: .6; cursor: not-allowed; box-shadow: none; }
    .edit-btn { border: 1px solid rgba(190,24,93,.18); border-radius: 999px; background: rgba(255,255,255,.75); color: #be185d; padding: 8px 13px; font-weight: 900; box-shadow: 0 10px 20px rgba(190,24,93,.08); }
    .amount-row { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; margin-top: 24px; }
    .amount-row div, .quick-stats div, .panel, .action-panel, .closed-panel { background: #fff; border: 1px solid #f3d6e5; box-shadow: 0 14px 34px rgba(99, 24, 75, .07); }
    .amount-row div { border-radius: 18px; padding: 16px; }
    .amount-row span, .quick-stats span, .panel-head span, .closed-panel span { display: block; color: #7b5870; font-weight: 800; font-size: .82rem; margin-bottom: 8px; }
    .amount-row strong { color: #be185d; font-size: clamp(1.2rem, 2.5vw, 1.65rem); }
    .progress-track { height: 14px; background: rgba(248, 215, 231, .9); border-radius: 999px; overflow: hidden; margin: 22px 0 10px; }
    .progress-fill { height: 100%; border-radius: inherit; background: linear-gradient(90deg, #e91e63, #ffb020, #22c55e); }
    .meta { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 10px; color: #7b5870; font-size: .9rem; font-weight: 900; }
    .hero-art { display: flex; align-items: center; justify-content: center; min-height: 220px; }
    .hero-art svg { width: min(100%, 330px); filter: drop-shadow(0 22px 30px rgba(190, 24, 93, .22)); }
    .quick-stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
    .quick-stats div { border-radius: 18px; padding: 18px; }
    .quick-stats strong { color: #2b1238; font-size: 1.18rem; }
    .action-dock { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
    .dock-btn { min-height: 96px; border: 0; border-radius: 22px; padding: 20px; text-align: left; color: #fff; box-shadow: 0 18px 36px rgba(99, 24, 75, .12); }
    .dock-btn span { display: block; font-weight: 800; opacity: .88; margin-bottom: 8px; }
    .dock-btn strong { display: block; font-size: 1.45rem; line-height: 1.1; }
    .dock-btn.deposit { background: linear-gradient(135deg, #e91e63, #b5179e); }
    .dock-btn.withdraw { background: linear-gradient(135deg, #0f766e, #22c55e); }
    .action-panel, .closed-panel { border-radius: 22px; padding: 22px; }
    .panel-head, .closed-panel { display: flex; justify-content: space-between; align-items: center; gap: 16px; }
    h2 { margin: 0; color: #2b1238; font-size: 1.35rem; line-height: 1.25; }
    .icon-btn { width: 38px; height: 38px; border: 1px solid #f3d6e5; border-radius: 50%; background: #fff7fb; color: #be185d; font-size: 1.4rem; line-height: 1; box-shadow: none; }
    .form-grid { display: grid; grid-template-columns: minmax(0, .45fr) minmax(0, .55fr); gap: 12px; margin: 18px 0 14px; }
    .edit-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; margin: 18px 0 14px; }
    label { display: flex; flex-direction: column; gap: 8px; color: #4b2540; font-weight: 900; }
    input, textarea { width: 100%; box-sizing: border-box; border: 1px solid #edc6d9; border-radius: 14px; padding: 13px 14px; font: inherit; color: #24142f; background: #fffafd; }
    textarea { resize: vertical; min-height: 96px; }
    input:focus, textarea:focus { outline: 3px solid rgba(233,30,99,.16); border-color: #e91e63; background: #fff; }
    .submit-btn, .closed-panel button { width: 100%; border: 0; border-radius: 15px; min-height: 46px; background: linear-gradient(135deg, #e91e63, #b5179e); color: white; padding: 12px 18px; font-weight: 900; box-shadow: 0 12px 26px rgba(233, 30, 99, .22); }
    .withdraw-submit { background: linear-gradient(135deg, #0f766e, #22c55e); }
    .closed-panel button { width: auto; min-width: 170px; background: linear-gradient(135deg, #f59e0b, #e91e63); }
    .close-btn { align-self: flex-start; border: 1px solid #fecaca; border-radius: 15px; min-height: 46px; background: #fef2f2; color: #dc2626; padding: 12px 18px; font-weight: 900; box-shadow: none; }
    .panel { border-radius: 18px; padding: 24px; color: #7b5870; font-weight: 800; }
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
