import { Component, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AccountService } from '../../../core/services/account.service';
import { AuthService } from '../../../core/services/auth.service';
import { ProfileService } from '../../../core/services/profile.service';
import { AccountResponse } from '../../../core/models/account.model';
import { TransactionResponse } from '../../../core/models/transaction.model';


@Component({
  selector: 'app-my-account',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
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
    <div class="my-account-page">
      <!-- Header -->
      <div class="page-header">
        <div>
          <span class="header-badge">PAYGATE WALLET</span>
          <h2>My Account</h2>
          <p class="subtitle">Manage your balance, transaction statement, wallet profile, and account details.</p>
        </div>
      </div>

      <div *ngIf="loading" class="spinner-box">
        <mat-spinner diameter="40" strokeWidth="3"></mat-spinner>
      </div>

      <div *ngIf="!loading">
        <section class="profile-panel">
          <div class="profile-main">
            <label class="profile-avatar" title="Change avatar">
              <img *ngIf="avatarDataUrl" [src]="avatarDataUrl" alt="Avatar" />
              <span *ngIf="!avatarDataUrl">{{ profileInitials() }}</span>
              <input type="file" accept="image/*" (change)="onAvatarSelected($event)" />
              <em><mat-icon>photo_camera</mat-icon></em>
            </label>
            <div class="profile-heading">
              <span class="profile-kicker">PayGate Profile</span>
              <h3>{{ profileName || getFallbackName() }}</h3>
              <p>{{ profileEmail || 'user@paygate.dev' }}</p>
              <div class="profile-badges">
                <span><mat-icon>verified_user</mat-icon>{{ userRole || 'USER' }}</span>
                <span><mat-icon>account_balance_wallet</mat-icon>{{ account?.accountNumber || 'PAY0000000001' }}</span>
              </div>
            </div>
          </div>

          <form class="profile-form" (ngSubmit)="saveProfile()">
            <label>
              <span>Display name</span>
              <input name="profileName" [(ngModel)]="profileName" placeholder="Your name" />
            </label>
            <label>
              <span>Email</span>
              <input name="profileEmail" [(ngModel)]="profileEmail" type="email" placeholder="email@example.com" />
            </label>
            <label>
              <span>Phone number</span>
              <input name="profilePhone" [(ngModel)]="profilePhone" placeholder="09xx xxx xxx" />
            </label>
            <button type="submit" class="profile-save">
              <mat-icon>save</mat-icon>
              <span>Save profile</span>
            </button>
          </form>
        </section>

        <!-- Top Row -->
        <div class="top-account-grid">
          <!-- Wallet Card (pink-blue gradient) -->
          <div class="wallet-card">
            <div class="wallet-bg">
              <div class="wallet-orb w1"></div>
              <div class="wallet-orb w2"></div>
            </div>
            <div class="card-upper">
              <div>
                <div class="field-label">AVAILABLE BALANCE</div>
                <div class="balance-large">{{ (account?.balance || 0) | currency:'VND':'symbol':'1.0-0' }}</div>
              </div>
              <div class="wallet-icon-box">
                <mat-icon>account_balance_wallet</mat-icon>
              </div>
            </div>

            <div class="card-mid">
              <div class="field-label">ACCOUNT NUMBER</div>
              <div class="account-number-row">
                <span class="acc-num-text">{{ account?.accountNumber || 'PAY0000000001' }}</span>
                <mat-icon class="copy-icon" (click)="copyAccountNumber()" title="Copy">content_copy</mat-icon>
              </div>
            </div>

            <div class="card-bottom-meta grid-3">
              <div>
                <div class="field-label">CURRENCY</div>
                <div class="meta-val">{{ account?.currency || 'VND' }}</div>
              </div>
              <div>
                <div class="field-label">STATUS</div>
                <span class="status-pill pill-active">{{ account?.status || 'ACTIVE' }}</span>
              </div>
              <div>
                <div class="field-label">OWNER</div>
                <div class="meta-val">{{ account?.ownerType || 'USER' }}</div>
              </div>
            </div>
          </div>

          <!-- Quick Actions -->
          <div class="quick-card">
            <div class="card-title">
              <mat-icon style="font-size:18px;width:18px;height:18px;color:#c20067">flash_on</mat-icon>
              Quick actions
            </div>
            <div class="actions-list">
              <a class="q-action primary" routerLink="/transactions/pay">
                <span class="q-ico" style="background:#fff0f6;color:#c20067">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
                  </svg>
                </span>
                <span class="q-lbl">Transfer</span>
                <svg class="q-arr" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </a>
              <a class="q-action" routerLink="/accounts/topup">
                <span class="q-ico" style="background:#eef6ff;color:#0072ce">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                </span>
                <span class="q-lbl">Top up</span>
                <svg class="q-arr" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </a>
              <a class="q-action" routerLink="/transactions/history">
                <span class="q-ico" style="background:#f3e8ff;color:#7c3aed">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                  </svg>
                </span>
                <span class="q-lbl">Transaction history</span>
                <svg class="q-arr" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </a>
              <a class="q-action" routerLink="/vaults">
                <span class="q-ico" style="background:#fef3c7;color:#d97706">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
                  </svg>
                </span>
                <span class="q-lbl">Savings Vault</span>
                <svg class="q-arr" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </a>
            </div>
          </div>
        </div>

        <!-- Activity Table -->
        <div class="activity-card">
          <div class="card-title">
            <mat-icon style="font-size:18px;width:18px;height:18px;color:#c20067">receipt_long</mat-icon>
            Transaction history
            <span class="tx-count">({{ transactions.length }} transactions)</span>
          </div>

          <div class="table-wrap">
            <table class="tx-table">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Type</th>
                  <th>Counterparty</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let tx of transactions">
                  <td class="font-mono tx-ref" [title]="tx.transactionRef">
                    {{ (tx.transactionRef || '').slice(0, 10) }}...
                  </td>
                  <td>
                    <span class="tx-type-badge" [class.tx-in]="tx.type === 'TOPUP'" [class.tx-out]="tx.type !== 'TOPUP'">
                      {{ txLabel(tx.type) }}
                    </span>
                  </td>
                  <td>
                    <span *ngIf="tx.type === 'TOPUP'" class="counterparty">Internal</span>
                    <span *ngIf="tx.type !== 'TOPUP'" class="counterparty mono">{{ (tx.destAccountId || '...') }}</span>
                  </td>
                  <td class="amount" [class.green]="tx.type === 'TOPUP' || tx.type === 'REFUND'" [class.red]="tx.type !== 'TOPUP' && tx.type !== 'REFUND'">
                    {{ tx.type === 'TOPUP' || tx.type === 'REFUND' ? '+' : '-' }}{{ tx.amount | currency:'VND':'symbol':'1.0-0' }}
                  </td>
                  <td>
                    <span class="status-pill" [class.pill-completed]="tx.status === 'COMPLETED'" [class.pill-failed]="tx.status === 'FAILED'" [class.pill-pending]="tx.status === 'PENDING'">
                      {{ tx.status === 'COMPLETED' ? 'Completed' : tx.status === 'FAILED' ? 'Failed' : tx.status }}
                    </span>
                  </td>
                  <td class="date-cell">{{ tx.createdAt | date:'dd/MM/yyyy HH:mm' }}</td>
                </tr>
                <tr *ngIf="transactions.length === 0">
                  <td colspan="6" class="empty-row">No transactions yet</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .my-account-page { display: flex; flex-direction: column; gap: 28px; color: #0f172a; }

    /* Header */
    .page-header { display:flex; flex-direction:column; gap:4px; }
    .header-badge {
      display:inline-block; width:fit-content;
      font-size:.7rem; font-weight:800; letter-spacing:.06em;
      color:#c20067; background:#fff0f6; border:1px solid #f8bbd0;
      padding:4px 14px; border-radius:999px; margin-bottom:6px;
    }
    .page-header h2 { font-size:1.6rem; font-weight:900; margin:0; color:#0d2b5c; letter-spacing:-.01em; }
    .subtitle { font-size:.88rem; color:#a6a6b8; margin:4px 0 0; }
    .spinner-box { display: flex; justify-content: center; padding: 48px; }

    .profile-panel {
      display:grid; grid-template-columns:minmax(0,.95fr) minmax(320px,1.05fr); gap:24px;
      align-items:center; background:linear-gradient(135deg,#fff0f6 0%,#eef6ff 52%,#ffffff 100%);
      border:1px solid #f3d6e5; border-radius:24px; padding:26px;
      box-shadow:0 12px 34px rgba(194,0,103,.07);
    }
    .profile-main { display:flex; align-items:center; gap:20px; min-width:0; }
    .profile-avatar {
      position:relative; width:96px; height:96px; border-radius:28px; flex-shrink:0;
      display:flex; align-items:center; justify-content:center; overflow:hidden; cursor:pointer;
      background:linear-gradient(135deg,#c20067,#0072ce); color:#fff;
      box-shadow:0 16px 32px rgba(194,0,103,.18);
    }
    .profile-avatar img { width:100%; height:100%; object-fit:cover; }
    .profile-avatar > span { font-size:1.55rem; font-weight:900; letter-spacing:.03em; }
    .profile-avatar input { display:none; }
    .profile-avatar em {
      position:absolute; right:8px; bottom:8px; width:28px; height:28px; border-radius:10px;
      background:#ffffff; color:#c20067; display:flex; align-items:center; justify-content:center;
      box-shadow:0 8px 18px rgba(15,23,42,.16); font-style:normal;
    }
    .profile-avatar em mat-icon { font-size:17px; width:17px; height:17px; }
    .profile-heading { min-width:0; }
    .profile-kicker { font-size:.7rem; font-weight:900; color:#c20067; text-transform:uppercase; letter-spacing:.08em; }
    .profile-heading h3 { margin:5px 0 3px; font-size:1.35rem; line-height:1.18; color:#0d2b5c; font-weight:900; }
    .profile-heading p { margin:0; color:#64748b; font-size:.86rem; overflow:hidden; text-overflow:ellipsis; }
    .profile-badges { display:flex; gap:8px; flex-wrap:wrap; margin-top:12px; }
    .profile-badges span {
      display:inline-flex; align-items:center; gap:6px; min-height:30px; padding:0 10px;
      border-radius:999px; background:#fff; border:1px solid #e5edf7;
      color:#334155; font-size:.72rem; font-weight:800;
    }
    .profile-badges mat-icon { font-size:16px; width:16px; height:16px; color:#0072ce; }
    .profile-form { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:14px; }
    .profile-form label { display:flex; flex-direction:column; gap:7px; min-width:0; }
    .profile-form label span { font-size:.72rem; color:#64748b; font-weight:800; }
    .profile-form input {
      height:42px; border:1px solid #e2e8f0; border-radius:14px; padding:0 13px;
      outline:none; background:#fff; color:#0f172a; font-size:.86rem; font-weight:600;
      transition:border-color .18s, box-shadow .18s;
    }
    .profile-form input:focus { border-color:#f48fb1; box-shadow:0 0 0 3px rgba(244,143,177,.16); }
    .profile-save {
      align-self:end; height:42px; border:0; border-radius:14px; cursor:pointer;
      background:#c20067; color:#fff; font-weight:900; display:flex; align-items:center; justify-content:center; gap:8px;
      box-shadow:0 12px 24px rgba(194,0,103,.18);
    }
    .profile-save mat-icon { font-size:18px; width:18px; height:18px; }

    .top-account-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 24px; }

    /* ===== Wallet Card (hồng gradient) ===== */
    .wallet-card {
      position:relative; overflow:hidden;
      background: radial-gradient(circle at 80% 10%, rgba(255,255,255,.15), transparent 35%),
                  linear-gradient(160deg, #c20067 0%, #a00055 30%, #0d2b5c 70%, #0a1f45 100%);
      border-radius:24px; padding:32px; color:#fff;
      box-shadow: 0 20px 50px rgba(194,0,103,.15);
    }
    .wallet-bg { position:absolute; inset:0; pointer-events:none; overflow:hidden; }
    .wallet-orb { position:absolute; border-radius:50%; filter:blur(70px); opacity:.15; }
    .w1 { width:350px; height:350px; top:-120px; right:-60px; background:#f8bbd0; }
    .w2 { width:280px; height:280px; bottom:-100px; left:-80px; background:#bbdefb; }

    .card-upper { display:flex; justify-content:space-between; align-items:flex-start; position:relative; z-index:1; }
    .field-label { font-size:.62rem; font-weight:700; letter-spacing:.08em; color:rgba(255,255,255,.45); text-transform:uppercase; }
    .balance-large { font-size:2.4rem; font-weight:900; margin-top:6px; letter-spacing:-.02em; }
    .wallet-icon-box mat-icon { font-size:30px; width:30px; height:30px; color:rgba(255,255,255,.25); }

    .card-mid { margin-top:24px; position:relative; z-index:1; }
    .account-number-row { display:flex; align-items:center; gap:12px; margin-top:6px; }
    .acc-num-text { font-size:1.15rem; font-weight:700; font-family:monospace; letter-spacing:.04em; }
    .copy-icon { font-size:20px; width:20px; height:20px; color:rgba(255,255,255,.35); cursor:pointer; transition:all .2s; }
    .copy-icon:hover { color:#fff; transform:scale(1.15); }

    .card-bottom-meta { margin-top:28px; padding-top:24px; border-top:1px solid rgba(255,255,255,.06); position:relative; z-index:1; }
    .grid-3 { display:grid; grid-template-columns:repeat(3,1fr); gap:20px; }
    .meta-val { font-size:.92rem; font-weight:700; margin-top:4px; }
    .pill-active {
      display:inline-block; padding:4px 14px; border-radius:999px;
      background:rgba(16,185,129,.15); border:1px solid rgba(16,185,129,.25);
      font-size:.72rem; font-weight:800; color:#6ee7b7; text-transform:uppercase;
    }

    /* ===== Quick Actions (hồng, thoáng) ===== */
    .quick-card {
      background:#fff; border:1px solid #f3d6e5; border-radius:24px; padding:28px;
      box-shadow:0 6px 20px rgba(194,0,103,.03);
      display:flex; flex-direction:column;
    }
    .card-title {
      font-size:1rem; font-weight:800; color:#0d2b5c;
      display:flex; align-items:center; gap:8px;
    }
    .tx-count { font-size:.8rem; font-weight:600; color:#a6a6b8; }
    .actions-list { display:flex; flex-direction:column; gap:8px; margin-top:20px; }

    .q-action {
      display:flex; align-items:center; gap:14px;
      padding:14px 16px; border-radius:14px; text-decoration:none;
      transition:all .25s ease; color:#334155;
    }
    .q-action:hover { background:#fcf5f9; }
    .q-action.primary { background:linear-gradient(135deg,#fff0f6,#fff); border:1px solid #f3d6e5; }
    .q-action.primary:hover { border-color:#f48fb1; }
    .q-ico {
      width:40px; height:40px; border-radius:14px;
      display:flex; align-items:center; justify-content:center; flex-shrink:0;
    }
    .q-lbl { font-size:.9rem; font-weight:700; flex:1; }
    .q-arr { color:#a6a6b8; transition:all .25s ease; }
    .q-action:hover .q-arr { transform:translateX(6px); color:#c20067; }

    /* ===== Activity Table (thoáng, hồng) ===== */
    .activity-card {
      background:#fff; border:1px solid #f3d6e5; border-radius:24px; padding:28px;
      box-shadow:0 6px 20px rgba(194,0,103,.03);
    }
    .table-wrap { overflow-x:auto; margin-top:20px; }
    .tx-table { width:100%; border-collapse:collapse; font-size:.88rem; }
    .tx-table th { padding:12px 16px; font-size:.72rem; font-weight:700; color:#a6a6b8; text-transform:uppercase; letter-spacing:.06em; border-bottom:1px solid #f3d6e5; text-align:left; }
    .tx-table td { padding:14px 16px; border-bottom:1px solid #fcf5f9; color:#1e293b; }
    .tx-table tr:last-child td { border-bottom:none; }
    .tx-table tr:hover td { background:#fcf5f9; }

    .font-mono { font-family:monospace; }
    .tx-ref { font-size:.8rem; color:#a6a6b8; cursor:default; }

    .tx-type-badge {
      display:inline-block; padding:4px 12px; border-radius:8px;
      font-size:.72rem; font-weight:700;
    }
    .tx-type-badge.tx-in { background:#fff0f6; color:#c20067; }
    .tx-type-badge.tx-out { background:#f1f5f9; color:#64748b; }

    .counterparty { font-size:.82rem; }
    .counterparty.mono { font-family:monospace; font-size:.75rem; color:#a6a6b8; }

    .amount { font-weight:800; }
    .amount.green { color:#16a34a; }
    .amount.red { color:#dc2626; }

    .status-pill { display:inline-block; padding:4px 12px; border-radius:999px; font-size:.7rem; font-weight:700; }
    .pill-completed { background:#f0fdf4; color:#15803d; }
    .pill-failed { background:#fef2f2; color:#b91c1c; }
    .pill-pending { background:#fef3c7; color:#b45309; }

    .date-cell { font-size:.82rem; color:#a6a6b8; }
    .empty-row { text-align:center; padding:36px 16px !important; color:#a6a6b8; font-weight:600; }

    @media (max-width:1024px) {
      .profile-panel { grid-template-columns:1fr; }
      .top-account-grid { grid-template-columns:1fr; gap:20px; }
      .balance-large { font-size:2rem; }
    }
    @media (max-width:768px) {
      .profile-panel { border-radius:20px; padding:22px; }
      .profile-main { align-items:flex-start; }
      .profile-avatar { width:78px; height:78px; border-radius:22px; }
      .profile-form { grid-template-columns:1fr; }
      .wallet-card { border-radius:20px; padding:24px; }
      .quick-card { border-radius:20px; padding:22px; }
      .activity-card { border-radius:20px; padding:22px; }
      .balance-large { font-size:1.7rem; }
    }
  `]
})
export class MyAccountComponent implements OnInit {
  account: AccountResponse | null = null;
  transactions: TransactionResponse[] = [];
  loading = true;
  profileName = '';
  profileEmail = '';
  profilePhone = '';
  avatarDataUrl = '';
  userRole = '';

  constructor(
    private accountService: AccountService,
    private authService: AuthService,
    private profileService: ProfileService,
    private snackBar: MatSnackBar
  ) {}


  ngOnInit(): void {
    this.loadProfile();
    this.loadProfileFromDb();
    this.loadAccountData();
  }

  getFallbackName(): string {
    const username = this.authService.getUsername() || 'User';
    return username.split('@')[0];
  }

  profileInitials(): string {
    const source = this.profileName || this.getFallbackName();
    return source
      .split(/[\s._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('') || 'U';
  }

  onAvatarSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.snackBar.open('Avatar file must be an image.', 'OK', { duration: 2200 });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      this.avatarDataUrl = String(reader.result || '');
      localStorage.setItem('paygate_profile_avatar', this.avatarDataUrl);
      this.snackBar.open('Avatar updated.', 'OK', { duration: 1800 });
    };
    reader.readAsDataURL(file);
  }

  saveProfile(): void {
    localStorage.setItem('paygate_profile_phone', this.profilePhone.trim());
    this.profileService.updateMe({
      fullName: this.profileName.trim(),
      email: this.profileEmail.trim()
    }).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.applyProfile(res.data);
        }
        this.snackBar.open('Profile saved.', 'OK', { duration: 2000 });
      },
      error: (err) => {
        this.snackBar.open(err?.error?.message || 'Unable to save profile.', 'OK', { duration: 2500 });
      }
    });
  }

  copyAccountNumber(): void {
    const num = this.account?.accountNumber || 'PAY0000000001';
    navigator.clipboard.writeText(num);
    this.snackBar.open('Account number copied.', 'OK', { duration: 2000 });
  }

  txLabel(type: string): string {
    switch(type) {
      case 'TOPUP': return 'Top up';
      case 'TRANSFER_IN': return 'Transfer received';
      case 'TRANSFER_OUT': return 'Transfer sent';
      case 'PAYMENT': return 'Payment';
      case 'REFUND': return 'Refund';
      default: return type || 'GD';
    }
  }

  private loadAccountData(): void {
    this.loading = true;
    this.accountService.getAccountMe().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.account = res.data;
          this.loadHistory(res.data.id);
        } else {
          this.loading = false;
        }
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  private loadProfile(): void {
    const username = this.authService.getUsername() || '';
    this.userRole = this.authService.getRole() || 'USER';
    this.profileName = localStorage.getItem('paygate_profile_name') || this.getFallbackName();
    this.profileEmail = username.includes('@') ? username : '';
    this.profilePhone = localStorage.getItem('paygate_profile_phone') || '';
    this.avatarDataUrl = localStorage.getItem('paygate_profile_avatar') || '';
  }

  private loadProfileFromDb(): void {
    this.profileService.getMe().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.applyProfile(res.data);
        }
      },
      error: () => {}
    });
  }

  private applyProfile(profile: { fullName?: string; username?: string; email?: string; role?: string }): void {
    this.profileName = profile.fullName || profile.username || this.getFallbackName();
    this.profileEmail = profile.email || '';
    this.userRole = profile.role || this.userRole;
    localStorage.setItem('paygate_profile_name', this.profileName);
  }

  private loadHistory(accountId: number): void {
    this.accountService.getAccountHistory(accountId, 0, 10).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.transactions = res.data.content;
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }
}
