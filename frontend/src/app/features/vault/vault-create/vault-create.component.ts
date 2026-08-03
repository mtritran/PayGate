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
            <svg class="pig" viewBox="0 0 380 300" role="img">
              <defs>
                <!-- Premium 3D Piggy Gradient -->
                <linearGradient id="pig3dBodyCreate" x1="15%" y1="10%" x2="85%" y2="90%">
                  <stop offset="0%" stop-color="#ffdeeb"/>
                  <stop offset="40%" stop-color="#ffb3d1"/>
                  <stop offset="80%" stop-color="#f472b6"/>
                  <stop offset="100%" stop-color="#e11d48"/>
                </linearGradient>

                <!-- Inner Ear & Snout Deep Pink Gradient -->
                <linearGradient id="pigDeepPinkCreate" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stop-color="#fb7185"/>
                  <stop offset="100%" stop-color="#be123c"/>
                </linearGradient>

                <!-- 3D Belly Soft Highlight -->
                <radialGradient id="bellyHighlightCreate" cx="42%" cy="38%" r="62%">
                  <stop offset="0%" stop-color="#ffffff" stop-opacity="0.65"/>
                  <stop offset="60%" stop-color="#ffdbe9" stop-opacity="0.15"/>
                  <stop offset="100%" stop-color="#f472b6" stop-opacity="0"/>
                </radialGradient>

                <!-- Gold Coin Shiny 3D Gradient -->
                <linearGradient id="goldCoinGradCreate" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#fef08a"/>
                  <stop offset="35%" stop-color="#f59e0b"/>
                  <stop offset="100%" stop-color="#92400e"/>
                </linearGradient>

                <!-- Ground Soft Shadow -->
                <radialGradient id="groundShadowCreate" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stop-color="#9d174d" stop-opacity="0.22"/>
                  <stop offset="100%" stop-color="#9d174d" stop-opacity="0"/>
                </radialGradient>
              </defs>

              <!-- Ground Shadow -->
              <ellipse cx="190" cy="272" rx="125" ry="16" fill="url(#groundShadowCreate)"/>

              <!-- Left Ear (Back Layer) -->
              <g transform="rotate(-15, 125, 65)">
                <ellipse cx="125" cy="65" rx="22" ry="34" fill="#e11d48"/>
                <ellipse cx="125" cy="67" rx="14" ry="24" fill="#be123c" opacity="0.7"/>
              </g>

              <!-- Right Ear (Front Layer - Symmetrical) -->
              <g transform="rotate(15, 205, 65)">
                <ellipse cx="205" cy="65" rx="24" ry="36" fill="url(#pig3dBodyCreate)"/>
                <ellipse cx="205" cy="67" rx="15" ry="25" fill="url(#pigDeepPinkCreate)"/>
              </g>

              <!-- Back Legs -->
              <rect x="110" y="210" width="38" height="50" rx="19" fill="#be123c"/>
              <rect x="220" y="210" width="38" height="50" rx="19" fill="#be123c"/>

              <!-- Tail -->
              <path d="M 68 150 C 42 145 44 175 60 178 C 72 180 75 160 62 158" fill="none" stroke="#f472b6" stroke-width="7" stroke-linecap="round"/>

              <!-- Main Body -->
              <ellipse cx="185" cy="165" rx="120" ry="90" fill="url(#pig3dBodyCreate)"/>
              <ellipse cx="168" cy="145" rx="100" ry="72" fill="url(#bellyHighlightCreate)"/>

              <!-- Coin Slot -->
              <ellipse cx="165" cy="80" rx="34" ry="8" fill="#831843"/>
              <ellipse cx="165" cy="80" rx="28" ry="4.5" fill="#38020f"/>

              <!-- Floating Gold Coin Animation -->
              <g class="floating-coin">
                <ellipse cx="165" cy="38" rx="25" ry="25" fill="url(#goldCoinGradCreate)"/>
                <ellipse cx="165" cy="38" rx="19" ry="19" fill="none" stroke="#fef08a" stroke-width="2.5"/>
                <text x="165" y="45" font-family="system-ui, sans-serif" font-size="20" font-weight="900" fill="#78350f" text-anchor="middle">$</text>
              </g>

              <!-- Front Legs -->
              <g>
                <rect x="130" y="218" width="40" height="52" rx="20" fill="url(#pig3dBodyCreate)"/>
                <ellipse cx="150" cy="264" rx="17" ry="5.5" fill="#be123c" opacity="0.35"/>

                <rect x="230" y="218" width="40" height="52" rx="20" fill="url(#pig3dBodyCreate)"/>
                <ellipse cx="250" cy="264" rx="17" ry="5.5" fill="#be123c" opacity="0.35"/>
              </g>

              <!-- Cheerful Big Eye -->
              <g>
                <ellipse cx="245" cy="138" rx="12" ry="15" fill="#ffffff"/>
                <circle cx="247.5" cy="138" r="8" fill="#0f172a"/>
                <circle cx="250.5" cy="134.5" r="3" fill="#ffffff"/>
                <circle cx="244" cy="140.5" r="1.5" fill="#ffffff"/>
              </g>

              <!-- Rosy Cheek Blush -->
              <ellipse cx="232" cy="165" rx="18" ry="10" fill="#f43f5e" opacity="0.38"/>

              <!-- Snout / Nose -->
              <g>
                <ellipse cx="282" cy="160" rx="28" ry="20" fill="url(#pigDeepPinkCreate)"/>
                <ellipse cx="282" cy="153" rx="22" ry="7" fill="#ffffff" opacity="0.25"/>
                <ellipse cx="272" cy="160" rx="6" ry="8" fill="#38020f"/>
                <ellipse cx="292" cy="160" rx="6" ry="8" fill="#38020f"/>
              </g>
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
    .pig-stage { display: flex; justify-content: center; align-items: center; min-height: 240px; margin: 10px 0 18px; }
    .pig-stage .pig {
      width: min(100%, 340px);
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
