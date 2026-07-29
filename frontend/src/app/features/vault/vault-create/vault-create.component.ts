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
                <linearGradient id="createPig" x1="35" y1="25" x2="285" y2="200">
                  <stop stop-color="#ff95cb"/>
                  <stop offset="1" stop-color="#e91e63"/>
                </linearGradient>
              </defs>
              <rect x="126" y="16" width="68" height="20" rx="10" fill="#ffce55"/>
              <path d="M55 119c0-50 48-83 117-83 57 0 100 25 116 63 15-5 26 2 27 17 1 16-12 27-31 27-16 37-57 59-112 59-16 0-30-2-43-6l-21 23H77l6-38c-18-15-28-36-28-62z" fill="url(#createPig)"/>
              <path d="M79 87c-6-26 4-49 27-64l24 39" fill="#ff78b9"/>
              <circle cx="224" cy="104" r="7" fill="#65143e"/>
              <ellipse cx="275" cy="125" rx="22" ry="17" fill="#ffb0d3"/>
              <circle cx="268" cy="125" r="4" fill="#65143e"/>
              <circle cx="282" cy="125" r="4" fill="#65143e"/>
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
      color: #24142f;
    }
    .back-link { width: fit-content; color: #be185d; text-decoration: none; font-weight: 900; }
    .create-shell { display: grid; grid-template-columns: minmax(290px, .9fr) minmax(0, 1.1fr); gap: 22px; align-items: stretch; }
    .preview-panel, .form-card { border: 1px solid #f3d6e5; border-radius: 26px; background: #fff; box-shadow: 0 18px 48px rgba(99, 24, 75, .08); }
    .preview-panel { overflow: hidden; padding: 28px; background: linear-gradient(150deg, #fff7fb, #ffe1ef 55%, #e9fbf1); }
    .eyebrow { color: #be185d; font-size: .78rem; font-weight: 900; text-transform: uppercase; letter-spacing: .08em; }
    h1 { margin: 10px 0 8px; color: #2b1238; font-size: clamp(2rem, 4vw, 3.15rem); line-height: 1.06; letter-spacing: 0; word-break: break-word; }
    p { margin: 0; color: #74425d; line-height: 1.6; }
    .pig-stage { display: flex; justify-content: center; align-items: center; min-height: 210px; margin: 10px 0 18px; }
    .pig-stage svg { width: min(100%, 320px); filter: drop-shadow(0 22px 30px rgba(190, 24, 93, .22)); }
    .preview-amount { display: flex; justify-content: space-between; gap: 14px; align-items: flex-end; border-radius: 18px; padding: 16px; background: rgba(255,255,255,.72); border: 1px solid rgba(244,114,182,.22); }
    .preview-amount span { color: #7b5870; font-weight: 800; }
    .preview-amount strong { color: #be185d; font-size: 1.25rem; text-align: right; }
    .form-card { display: flex; flex-direction: column; gap: 16px; padding: 26px; }
    label { display: flex; flex-direction: column; gap: 8px; font-weight: 900; color: #4b2540; }
    input, textarea { width: 100%; box-sizing: border-box; border: 1px solid #edc6d9; border-radius: 14px; padding: 13px 14px; font: inherit; color: #24142f; background: #fffafd; }
    input:focus, textarea:focus { outline: 3px solid rgba(233,30,99,.16); border-color: #e91e63; background: #fff; }
    .preset-row { display: flex; flex-wrap: wrap; gap: 10px; margin-top: -6px; }
    .preset-row button { border: 1px solid #f3c2da; background: #fff1f7; color: #be185d; border-radius: 999px; padding: 9px 12px; font-weight: 900; cursor: pointer; }
    .preset-row button:hover { background: #ffe1ef; }
    .primary-btn { border: 0; border-radius: 16px; min-height: 48px; background: linear-gradient(135deg, #e91e63, #b5179e); color: white; padding: 13px 18px; font-weight: 900; cursor: pointer; box-shadow: 0 12px 26px rgba(233, 30, 99, .26); }
    .primary-btn:disabled { opacity: .6; cursor: not-allowed; box-shadow: none; }
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
