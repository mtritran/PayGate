import { Component } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { VaultService } from '../vault.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-vault-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, CurrencyPipe],
  template: `
    <div class="vault-form-page fade-in-up">
      <a routerLink="/vaults" class="back-link">← Savings Vaults</a>

      <section class="create-shell">
        <aside class="preview-panel">
          <div class="eyebrow">Create New Vault</div>
          <h1>{{ form.value.name || 'Your goal' }}</h1>
          <p>{{ form.value.description || 'Set a clear target so every deposit feels more motivating.' }}</p>

          <div class="pig-stage" aria-hidden="true">
            <svg viewBox="0 0 320 220">
              <defs>
                <linearGradient id="createPig2" x1="20" y1="20" x2="280" y2="190">
                  <stop offset="0%" stop-color="#ffd6e7"/>
                  <stop offset="50%" stop-color="#ffb8d0"/>
                  <stop offset="100%" stop-color="#f48fb1"/>
                </linearGradient>
                <radialGradient id="createBelly" cx="0.5" cy="0.45" r="0.5">
                  <stop offset="0%" stop-color="#fff5f9" stop-opacity="0.85"/>
                  <stop offset="100%" stop-color="#ffb8d0" stop-opacity="0"/>
                </radialGradient>
                <linearGradient id="createCoin" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stop-color="#ffe68f"/>
                  <stop offset="100%" stop-color="#f59e0b"/>
                </linearGradient>
                <linearGradient id="createNose" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#f06292"/>
                  <stop offset="100%" stop-color="#c20067"/>
                </linearGradient>
              </defs>
              <!-- Ears -->
              <ellipse cx="84" cy="64" rx="22" ry="26" fill="#f48fb1" transform="rotate(-18 84 64)"/>
              <ellipse cx="84" cy="68" rx="12" ry="16" fill="#ec407a" opacity="0.5" transform="rotate(-18 84 68)"/>
              <ellipse cx="216" cy="64" rx="22" ry="26" fill="#f48fb1" transform="rotate(18 216 64)"/>
              <ellipse cx="216" cy="68" rx="12" ry="16" fill="#ec407a" opacity="0.5" transform="rotate(18 216 68)"/>
              <!-- Body -->
              <path d="M62 120c0-44 40-74 100-74 50 0 88 18 104 48 10-4 20 2 22 12 1 13-10 22-26 22-16 32-54 50-102 50-14 0-28-2-40-5l-18 18h-28l6-30c-18-14-26-32-26-48z" fill="url(#createPig2)"/>
              <!-- Belly -->
              <ellipse cx="155" cy="116" rx="68" ry="26" fill="url(#createBelly)"/>
              <!-- Tail -->
              <path d="M44 112c-10-5-16 10-4 14 8 4 14-1 12-7" fill="none" stroke="#f48fb1" stroke-width="7" stroke-linecap="round"/>
              <!-- Legs -->
              <rect x="96" y="184" width="26" height="14" rx="7" fill="url(#createPig2)"/>
              <rect x="182" y="184" width="26" height="14" rx="7" fill="url(#createPig2)"/>
              <ellipse cx="109" cy="200" rx="18" ry="6" fill="#e88ba8"/>
              <ellipse cx="195" cy="200" rx="18" ry="6" fill="#e88ba8"/>
              <!-- Coin -->
              <rect x="118" y="14" width="64" height="20" rx="10" fill="url(#createCoin)"/>
              <text x="150" y="28" font-family="Arial,sans-serif" font-size="12" font-weight="900" fill="#92400e" text-anchor="middle">$</text>
              <!-- Eye -->
              <ellipse cx="198" cy="98" rx="7" ry="9" fill="#fff"/>
              <circle cx="200" cy="98" r="4.5" fill="#380e1f"/>
              <circle cx="202" cy="95.5" r="1.8" fill="#fff"/>
              <!-- Blush -->
              <ellipse cx="186" cy="112" rx="10" ry="5" fill="#ec407a" opacity="0.12"/>
              <!-- Snout -->
              <ellipse cx="240" cy="118" rx="16" ry="13" fill="url(#createNose)"/>
              <circle cx="233" cy="117" r="3" fill="#380e1f" opacity="0.5"/>
              <circle cx="247" cy="117" r="3" fill="#380e1f" opacity="0.5"/>
              <ellipse cx="240" cy="114" rx="9" ry="3" fill="#fff" opacity="0.15"/>
            </svg>
          </div>

          <div class="preview-amount">
            <span>Target</span>
            <strong>{{ targetAmount | currency:'VND':'symbol':'1.0-0' }}</strong>
          </div>
        </aside>

        <form class="form-card" [formGroup]="form" (ngSubmit)="submit()">
          <label>
            Vault name
            <input formControlName="name" placeholder="Da Lat trip">
          </label>

          <label>
            Savings target
            <input type="number" formControlName="targetAmount" min="1" placeholder="5000000">
          </label>

          <div class="preset-row">
            <button type="button" *ngFor="let amount of presets" (click)="setTarget(amount)">
              {{ amount | currency:'VND':'symbol':'1.0-0' }}
            </button>
          </div>

          <label>
            Deadline
            <input type="date" formControlName="deadline">
          </label>

          <label>
            Note
            <textarea formControlName="description" rows="4" placeholder="Saving for a year-end trip"></textarea>
          </label>

          <button class="primary-btn" type="submit" [disabled]="form.invalid || submitting">
            {{ submitting ? 'Creating...' : 'Create Vault' }}
          </button>
        </form>
      </section>
    </div>
  `,
  styles: [`
    .vault-form-page {
      font-family: 'Roboto', 'Inter', system-ui, -apple-system, sans-serif;
      display: flex;
      flex-direction: column;
      gap: 18px;
      color: #0f172a;
    }
    .back-link { width: fit-content; color: #c20067; text-decoration: none; font-weight: 800; }
    .back-link:hover { color: #e00077; }
    .create-shell { display: grid; grid-template-columns: minmax(290px, .9fr) minmax(0, 1.1fr); gap: 22px; align-items: stretch; }
    .preview-panel, .form-card { border: 1px solid #fce4ec; border-radius: 26px; background: #fff; box-shadow: 0 12px 40px rgba(194,0,103,.04); }
    .preview-panel { overflow: hidden; padding: 28px; background: radial-gradient(circle at 80% 15%, rgba(255,255,255,.95), transparent 30%), linear-gradient(135deg, #fff7fb 0%, #ffe1ef 40%, #fff5f9 70%, #f0f4ff 100%); }
    .eyebrow { color: #c20067; font-size: .78rem; font-weight: 900; text-transform: uppercase; letter-spacing: .08em; }
    h1 {
      margin: 10px 0 8px;
      color: #0d2b5c;
      font-size: clamp(1.8rem, 3.2vw, 2.6rem);
      font-weight: 900;
      line-height: 1.15;
      letter-spacing: -0.02em;
      word-break: break-word;
    }
    p { margin: 0; color: #475569; font-size: 0.98rem; font-weight: 500; line-height: 1.5; }
    .pig-stage { display: flex; justify-content: center; align-items: center; min-height: 210px; margin: 10px 0 18px; }
    .pig-stage svg { width: min(100%, 320px); filter: drop-shadow(0 16px 24px rgba(194,0,103,.12)); }
    .preview-amount { display: flex; justify-content: space-between; gap: 14px; align-items: flex-end; border-radius: 18px; padding: 16px; background: rgba(255,255,255,.9); border: 1px solid rgba(244,114,182,.25); }
    .preview-amount span { color: #64748b; font-weight: 800; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.03em; }
    .preview-amount strong { color: #c20067; font-size: 1.35rem; font-weight: 900; letter-spacing: -0.01em; text-align: right; }
    .form-card { display: flex; flex-direction: column; gap: 16px; padding: 26px; }
    label { display: flex; flex-direction: column; gap: 8px; font-weight: 800; color: #0d2b5c; font-size: 0.9rem; }
    input, textarea { width: 100%; box-sizing: border-box; border: 1px solid #f3c2da; border-radius: 14px; padding: 13px 14px; font: inherit; color: #0f172a; background: #fffafd; }
    input:focus, textarea:focus { outline: 3px solid rgba(194,0,103,.12); border-color: #c20067; background: #fff; }
    .preset-row { display: flex; flex-wrap: wrap; gap: 10px; margin-top: -6px; }
    .preset-row button { border: 1px solid #f8bbd0; background: #fff0f6; color: #c20067; border-radius: 999px; padding: 9px 12px; font-weight: 800; cursor: pointer; transition: all .15s; }
    .preset-row button:hover { background: #ffe1ef; border-color: #ec407a; }
    .primary-btn { border: 0; border-radius: 16px; min-height: 48px; background: linear-gradient(135deg, #c20067 0%, #0072ce 100%); color: white; padding: 13px 18px; font-weight: 800; cursor: pointer; box-shadow: 0 8px 22px rgba(194,0,103,.25); transition: all .2s ease; }
    .primary-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 12px 28px rgba(194,0,103,.35); }
    .primary-btn:disabled { opacity: .5; cursor: not-allowed; box-shadow: none; }
    @media (max-width: 900px) { .create-shell { grid-template-columns: 1fr; } }
    @media (max-width: 520px) { .preview-panel, .form-card { border-radius: 20px; padding: 20px; } .preview-amount { flex-direction: column; align-items: flex-start; } .preview-amount strong { text-align: left; } }
  `]
})
export class VaultCreateComponent {
  submitting = false;
  presets = [1000000, 5000000, 10000000];
  form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    targetAmount: [5000000, [Validators.required, Validators.min(1)]],
    deadline: [''],
    description: ['', [Validators.maxLength(500)]]
  });

  constructor(
    private fb: FormBuilder,
    private vaultService: VaultService,
    private notification: NotificationService,
    private router: Router
  ) {}

  get targetAmount(): number {
    return Number(this.form.value.targetAmount || 0);
  }

  setTarget(amount: number): void {
    this.form.patchValue({ targetAmount: amount });
  }

  submit(): void {
    if (this.form.invalid) return;
    this.submitting = true;
    const raw = this.form.getRawValue();
    this.vaultService.create({
      name: raw.name || '',
      targetAmount: Number(raw.targetAmount || 0),
      deadline: raw.deadline || undefined,
      description: raw.description || undefined
    }).subscribe({
      next: res => {
        this.notification.success('Savings vault created');
        this.router.navigate(['/vaults', res.data?.id]);
      },
      error: err => {
        this.submitting = false;
        this.notification.error(err.error?.message || 'Cannot create vault');
      }
    });
  }
}
