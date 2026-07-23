import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { InputComponent } from '../../../shared/components';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    InputComponent
  ],
  template: `
    <div class="auth-split-wrapper fade-in-up">
      <div class="auth-split-card">
        <!-- LEFT COLUMN: High-Tech Showcase Panel -->
        <div class="auth-showcase-panel">
          <div class="showcase-header">
            <div class="brand-logo-group">
              <div class="brand-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
              </div>
              <span class="brand-name">PayGate</span>
            </div>
            <span class="version-chip">v2.5 Enterprise</span>
          </div>

          <div class="showcase-main-content">
            <h2 class="showcase-title">Next-Gen Payment Infrastructure & Digital Wallet</h2>
            <p class="showcase-desc">Experience lightning-fast transactions, real-time double-entry ledgers, and seamless multi-bank integrations.</p>

            <!-- Floating Metallic Glass Card Preview -->
            <div class="metallic-card-preview shimmer-effect">
              <div class="preview-top-row">
                <span class="preview-brand">PayGate <i>VISA</i></span>
                <span class="preview-chip-icon">💳</span>
              </div>
              <div class="preview-num">4532 •••• •••• 8892</div>
              <div class="preview-bottom-row">
                <div>
                  <span class="lbl">CARD HOLDER</span>
                  <span class="val">VINH NGUYEN</span>
                </div>
                <div>
                  <span class="lbl">STATUS</span>
                  <span class="status-badge">ACTIVE</span>
                </div>
              </div>
            </div>

            <!-- Highlights List -->
            <div class="showcase-highlights">
              <div class="highlight-item">
                <span class="h-icon">⚡</span>
                <div class="h-text">
                  <strong>Instant Settlements</strong>
                  <span>Real-time transaction processing under 200ms</span>
                </div>
              </div>
              <div class="highlight-item">
                <span class="h-icon">🔒</span>
                <div class="h-text">
                  <strong>Bank-Grade Encryption</strong>
                  <span>PCI-DSS compliant double-entry ledger security</span>
                </div>
              </div>
              <div class="highlight-item">
                <span class="h-icon">🏦</span>
                <div class="h-text">
                  <strong>Multi-Bank Linking</strong>
                  <span>Custom brand themes & instant balance sync</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Footer Trust Badges -->
          <div class="showcase-footer">
            <span>🛡️ ISO 27001 Certified</span>
            <span>•</span>
            <span>99.99% Uptime SLA</span>
          </div>
        </div>

        <!-- RIGHT COLUMN: Modern Spacious Login Form -->
        <div class="auth-form-panel">
          <div class="form-panel-header">
            <div class="auth-header-tag">WELCOME BACK</div>
            <h1 class="form-title">Sign In to PayGate</h1>
            <p class="form-subtitle">Enter your credentials to access your wallet dashboard.</p>
          </div>

          <!-- Quick Fill Demo Buttons -->
          <div class="demo-quick-bar mb-20">
            <span class="demo-label">Quick Demo Logins:</span>
            <div class="demo-btn-group">
              <button type="button" class="btn-demo-pill" (click)="fillDemoUser()">
                👤 User Login
              </button>
              <button type="button" class="btn-demo-pill admin" (click)="fillDemoAdmin()">
                ⚡ Admin Login
              </button>
            </div>
          </div>

          <form [formGroup]="form" (ngSubmit)="onSubmit()" class="auth-form-content">
            <div class="form-group">
              <pg-input
                label="Username or Email"
                placeholder="Enter username or email..."
                formControlName="username"
                type="text"
                autocomplete="username"
                [error]="usernameError()"
                [prefixIcon]="userIcon"
              ></pg-input>
            </div>

            <div class="form-group">
              <pg-input
                label="Password"
                placeholder="Enter password..."
                formControlName="password"
                type="password"
                autocomplete="current-password"
                [error]="passwordError()"
                [prefixIcon]="lockIcon"
                [showPasswordToggle]="true"
              ></pg-input>
            </div>

            <div class="form-options">
              <label class="checkbox-wrapper">
                <input type="checkbox" formControlName="rememberMe" />
                <span class="checkbox-custom"></span>
                <span class="checkbox-label">Remember this session</span>
              </label>
              <a routerLink="/auth/forgot-password" class="forgot-link">Forgot password?</a>
            </div>

            <button
              type="submit"
              class="btn-emerald-primary pulse-glow"
              [disabled]="form.invalid || loading()"
            >
              <span *ngIf="!loading()" class="btn-text-content">
                Sign In to Account ↗
              </span>
              <span *ngIf="loading()" class="btn-text-content">
                <span class="btn-spinner"></span>
                Authenticating...
              </span>
            </button>

            <!-- Error Banner -->
            <div class="error-banner mt-12" *ngIf="submitError()">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="17" />
              </svg>
              <span>{{ submitError() }}</span>
            </div>
          </form>

          <div class="form-panel-footer mt-24">
            <p>Don't have a PayGate account yet? <a routerLink="/register" class="link-emerald">Create an account now ➔</a></p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(18px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .fade-in-up { animation: fadeInUp 0.45s ease-out forwards; }

    .auth-split-wrapper {
      display: flex;
      justify-content: center;
      align-items: center;
      width: 100%;
      min-height: 80vh;
      padding: 20px 0;
      font-family: 'Inter', system-ui, sans-serif;
    }

    .auth-split-card {
      display: grid;
      grid-template-columns: 1fr 1.15fr;
      width: 100%;
      max-width: 1060px;
      background: #ffffff;
      border-radius: 28px;
      border: 1px solid #e2e8f0;
      overflow: hidden;
      box-shadow: 0 20px 50px -10px rgba(15, 23, 42, 0.1);
    }

    /* Left Column Showcase */
    .auth-showcase-panel {
      background: linear-gradient(135deg, #064e3b 0%, #047857 50%, #065f46 100%);
      color: #ffffff;
      padding: 44px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
      overflow: hidden;
    }

    .showcase-header { display: flex; justify-content: space-between; align-items: center; }
    .brand-logo-group { display: flex; align-items: center; gap: 12px; }
    .brand-icon { width: 38px; height: 38px; background: rgba(255,255,255,0.15); border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #a7f3d0; border: 1px solid rgba(255,255,255,0.2); }
    .brand-icon svg { width: 22px; height: 22px; }
    .brand-name { font-size: 1.4rem; font-weight: 900; letter-spacing: -0.02em; }
    .version-chip { font-size: 0.72rem; font-weight: 800; background: rgba(255,255,255,0.12); color: #a7f3d0; padding: 4px 10px; border-radius: 12px; border: 1px solid rgba(167, 243, 208, 0.2); }

    .showcase-main-content { display: flex; flex-direction: column; gap: 20px; margin: 30px 0; }
    .showcase-title { font-size: 1.75rem; font-weight: 800; line-height: 1.3; margin: 0; letter-spacing: -0.02em; }
    .showcase-desc { font-size: 0.95rem; color: #a7f3d0; opacity: 0.9; margin: 0; line-height: 1.5; }

    /* Metallic Glass Card Preview */
    .metallic-card-preview {
      background: rgba(255, 255, 255, 0.12);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.25);
      border-radius: 18px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 14px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.15);
    }
    .preview-top-row { display: flex; justify-content: space-between; align-items: center; }
    .preview-brand { font-weight: 800; font-size: 1.05rem; }
    .preview-brand i { font-style: italic; color: #fef08a; }
    .preview-num { font-family: monospace; font-size: 1.15rem; font-weight: 800; letter-spacing: 0.06em; color: #ffffff; }
    .preview-bottom-row { display: flex; justify-content: space-between; }
    .preview-bottom-row .lbl { font-size: 0.65rem; font-weight: 700; color: #a7f3d0; display: block; }
    .preview-bottom-row .val { font-size: 0.85rem; font-weight: 800; }
    .status-badge { font-size: 0.7rem; font-weight: 800; color: #10b981; background: #dcfce7; padding: 2px 8px; border-radius: 8px; }

    .showcase-highlights { display: flex; flex-direction: column; gap: 14px; margin-top: 10px; }
    .highlight-item { display: flex; align-items: flex-start; gap: 12px; }
    .h-icon { font-size: 1.2rem; }
    .h-text { display: flex; flex-direction: column; gap: 1px; }
    .h-text strong { font-size: 0.9rem; font-weight: 800; color: #ffffff; }
    .h-text span { font-size: 0.8rem; color: #a7f3d0; opacity: 0.85; }

    .showcase-footer { font-size: 0.8rem; color: #a7f3d0; opacity: 0.8; display: flex; gap: 12px; align-items: center; }

    /* Right Column Form */
    .auth-form-panel { padding: 48px; display: flex; flex-direction: column; justify-content: center; }
    .auth-header-tag { font-size: 0.72rem; font-weight: 800; color: #059669; letter-spacing: 0.06em; margin-bottom: 4px; }
    .form-title { font-size: 1.85rem; font-weight: 800; color: #0f172a; margin: 0 0 6px 0; letter-spacing: -0.02em; }
    .form-subtitle { font-size: 0.925rem; color: #64748b; margin: 0 0 24px 0; }

    .demo-quick-bar { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 10px 14px; display: flex; align-items: center; justify-content: space-between; }
    .demo-label { font-size: 0.775rem; font-weight: 800; color: #475569; }
    .demo-btn-group { display: flex; gap: 8px; }
    .btn-demo-pill { background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 4px 10px; font-size: 0.775rem; font-weight: 800; color: #059669; cursor: pointer; transition: all 0.15s; }
    .btn-demo-pill:hover { background: #ecfdf5; border-color: #059669; }
    .btn-demo-pill.admin { color: #2563eb; }
    .btn-demo-pill.admin:hover { background: #eff6ff; border-color: #2563eb; }

    .auth-form-content { display: flex; flex-direction: column; gap: 18px; }
    .form-options { display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem; }

    .checkbox-wrapper { display: flex; align-items: center; gap: 8px; cursor: pointer; color: #475569; user-select: none; }
    .checkbox-wrapper input { position: absolute; opacity: 0; pointer-events: none; }
    .checkbox-custom { width: 18px; height: 18px; border: 1.5px solid #cbd5e1; border-radius: 5px; background: #ffffff; display: flex; align-items: center; justify-content: center; }
    .checkbox-wrapper input:checked + .checkbox-custom { background: #059669; border-color: #059669; }
    .checkbox-custom::after { content: ''; width: 4px; height: 8px; border: solid white; border-width: 0 2px 2px 0; transform: rotate(45deg) translateY(-1px); opacity: 0; }
    .checkbox-wrapper input:checked + .checkbox-custom::after { opacity: 1; }

    .forgot-link { color: #059669; font-weight: 700; text-decoration: none; }
    .forgot-link:hover { text-decoration: underline; }

    .btn-emerald-primary { width: 100%; height: 50px; border: none; border-radius: 12px; background: linear-gradient(135deg, #059669 0%, #047857 100%); color: #ffffff; font-size: 1rem; font-weight: 800; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 14px rgba(5, 150, 105, 0.35); }
    .btn-emerald-primary:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(5, 150, 105, 0.45); }
    .btn-emerald-primary:disabled { opacity: 0.6; cursor: not-allowed; }

    .btn-text-content { display: flex; align-items: center; justify-content: center; gap: 8px; }
    .btn-spinner { width: 20px; height: 20px; border: 2.5px solid rgba(255,255,255,0.3); border-top-color: #ffffff; border-radius: 50%; animation: spin 0.7s linear infinite; }

    .error-banner { background: #fef2f2; border: 1px solid #fecaca; border-radius: 10px; padding: 10px 14px; color: #dc2626; font-size: 0.85rem; font-weight: 700; display: flex; align-items: center; gap: 8px; }

    .form-panel-footer { font-size: 0.9rem; color: #64748b; text-align: center; }
    .link-emerald { color: #059669; font-weight: 800; text-decoration: none; }
    .link-emerald:hover { text-decoration: underline; }

    @media (max-width: 900px) {
      .auth-split-card { grid-template-columns: 1fr; }
      .auth-showcase-panel { display: none; }
    }
  `]
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private notification = inject(NotificationService);

  loading = signal(false);
  submitError = signal('');

  form = this.fb.group({
    username: ['user', [Validators.required]],
    password: ['password', [Validators.required]],
    rememberMe: [false]
  });

  userIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>`;
  lockIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>`;

  usernameError = computed(() => {
    const control = this.form.get('username');
    if (control?.invalid && (control?.dirty || control?.touched)) {
      return 'Username or email is required';
    }
    return '';
  });

  passwordError = computed(() => {
    const control = this.form.get('password');
    if (control?.invalid && (control?.dirty || control?.touched)) {
      return 'Password is required';
    }
    return '';
  });

  fillDemoUser(): void {
    this.form.patchValue({
      username: 'user',
      password: 'password'
    });
    this.form.markAsDirty();
  }

  fillDemoAdmin(): void {
    this.form.patchValue({
      username: 'admin',
      password: 'password'
    });
    this.form.markAsDirty();
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.submitError.set('');

    const credentials = this.form.getRawValue() as { username: string; password: string };

    this.authService.login(credentials).subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res.success) {
          this.notification.success('Login successful');
          this.router.navigate(['/accounts/dashboard']);
        } else {
          this.submitError.set(res.message || 'Login failed');
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.submitError.set(err.error?.message || 'Login failed. Please try again.');
      }
    });
  }
}