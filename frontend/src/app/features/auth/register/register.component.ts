import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { InputComponent } from '../../../shared/components';

@Component({
  selector: 'app-register',
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
            <span class="version-chip">Free Account</span>
          </div>

          <div class="showcase-main-content">
            <h2 class="showcase-title">Join Thousands of Businesses & Digital Wallet Users</h2>
            <p class="showcase-desc">Create your free PayGate account to access instant multi-bank linking, top-ups, and automated merchant APIs.</p>

            <!-- Feature Card Preview (Generic Mock Card) -->
            <div class="metallic-card-preview shimmer-effect">
              <div class="preview-top-row">
                <span class="preview-brand">PayGate <i>STARTER</i></span>
                <span class="preview-chip-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fef08a" stroke-width="2">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                </span>
              </div>
              <div class="preview-num">₫0 Zero Maintenance Fee</div>
              <div class="preview-bottom-row">
                <div>
                  <span class="lbl">CARD HOLDER</span>
                  <span class="val">PAYGATE USER</span>
                </div>
                <div>
                  <span class="lbl">SECURITY</span>
                  <span class="status-badge">PROTECTED</span>
                </div>
              </div>
            </div>

            <!-- Highlights List (SVG Icons) -->
            <div class="showcase-highlights">
              <div class="highlight-item">
                <div class="h-icon-box">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a7f3d0" stroke-width="2.2">
                    <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                    <line x1="1" y1="10" x2="23" y2="10"/>
                  </svg>
                </div>
                <div class="h-text">
                  <strong>Digital Visa Wallet Card</strong>
                  <span>Auto-generated virtual debit card for quick payments</span>
                </div>
              </div>

              <div class="highlight-item">
                <div class="h-icon-box">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a7f3d0" stroke-width="2.2">
                    <line x1="3" y1="21" x2="21" y2="21"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                    <polyline points="12 3 2 10 22 10 12 3"/>
                  </svg>
                </div>
                <div class="h-text">
                  <strong>Multi-Bank Linking</strong>
                  <span>Link MB Bank, Vietcombank, Techcombank, MoMo instantly</span>
                </div>
              </div>

              <div class="highlight-item">
                <div class="h-icon-box">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a7f3d0" stroke-width="2.2">
                    <line x1="18" y1="20" x2="18" y2="10"/>
                    <line x1="12" y1="20" x2="12" y2="4"/>
                    <line x1="6" y1="20" x2="6" y2="14"/>
                  </svg>
                </div>
                <div class="h-text">
                  <strong>Transparent Transaction Logs</strong>
                  <span>Clear bank name tags and instant ledger entries</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Footer Trust Badges -->
          <div class="showcase-footer">
            <span>256-Bit SSL Encrypted</span>
            <span>•</span>
            <span>Zero Annual Fees</span>
          </div>
        </div>

        <!-- RIGHT COLUMN: Modern Register Form -->
        <div class="auth-form-panel">
          <div class="form-panel-header">
            <div class="auth-header-tag">GET STARTED FREE</div>
            <h1 class="form-title">Create your PayGate Account</h1>
            <p class="form-subtitle">Fill in your details below to open your digital wallet.</p>
          </div>

          <form [formGroup]="form" (ngSubmit)="onSubmit()" class="auth-form-content">
            <div class="form-row-2col">
              <div class="form-group">
                <pg-input
                  label="Username"
                  placeholder="Choose username..."
                  formControlName="username"
                  type="text"
                  autocomplete="username"
                  [error]="usernameError()"
                  [prefixIcon]="userIcon"
                ></pg-input>
              </div>

              <div class="form-group">
                <pg-input
                  label="Email Address"
                  placeholder="Enter email..."
                  formControlName="email"
                  type="email"
                  autocomplete="email"
                  [error]="emailError()"
                  [prefixIcon]="emailIcon"
                ></pg-input>
              </div>
            </div>

            <div class="form-group">
              <pg-input
                label="Full Name"
                placeholder="Enter your full name..."
                formControlName="fullName"
                type="text"
                autocomplete="name"
                [error]="fullNameError()"
                [prefixIcon]="nameIcon"
              ></pg-input>
            </div>

            <div class="form-row-2col">
              <div class="form-group">
                <pg-input
                  label="Password"
                  placeholder="Create password..."
                  formControlName="password"
                  type="password"
                  autocomplete="new-password"
                  [error]="passwordError()"
                  [prefixIcon]="lockIcon"
                  [showPasswordToggle]="true"
                ></pg-input>
              </div>

              <div class="form-group">
                <pg-input
                  label="Confirm Password"
                  placeholder="Re-enter password..."
                  formControlName="confirmPassword"
                  type="password"
                  autocomplete="new-password"
                  [error]="confirmPasswordError()"
                  [prefixIcon]="lockIcon"
                  [showPasswordToggle]="true"
                ></pg-input>
              </div>
            </div>

            <div class="form-terms mt-4">
              <label class="checkbox-wrapper">
                <input type="checkbox" formControlName="terms" required />
                <span class="checkbox-custom"></span>
                <span class="checkbox-label">
                  I agree to the <a href="#" class="terms-link">Terms of Service</a> and <a href="#" class="terms-link">Privacy Policy</a>
                </span>
              </label>
            </div>

            <button
              type="submit"
              class="btn-emerald-primary pulse-glow mt-8"
              [disabled]="form.invalid || loading()"
            >
              <span *ngIf="!loading()" class="btn-text-content">
                Create PayGate Account ➔
              </span>
              <span *ngIf="loading()" class="btn-text-content">
                <span class="btn-spinner"></span>
                Creating account...
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
            <p>Already have an account? <a routerLink="/login" class="link-emerald">Sign in here ➔</a></p>
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
      min-height: 85vh;
      padding: 36px 0;
      font-family: 'Inter', system-ui, sans-serif;
    }

    .auth-split-card {
      display: grid;
      grid-template-columns: 1fr 1.2fr;
      width: 100%;
      max-width: 1180px;
      background: #ffffff;
      border-radius: 32px;
      border: 1px solid #e2e8f0;
      overflow: hidden;
      box-shadow: 0 25px 60px -12px rgba(15, 23, 42, 0.12);
    }

    /* Left Column Showcase */
    .auth-showcase-panel {
      background: linear-gradient(135deg, #064e3b 0%, #047857 50%, #065f46 100%);
      color: #ffffff;
      padding: 54px 48px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
      overflow: hidden;
    }

    .showcase-header { display: flex; justify-content: space-between; align-items: center; }
    .brand-logo-group { display: flex; align-items: center; gap: 14px; }
    .brand-icon { width: 42px; height: 42px; background: rgba(255,255,255,0.15); border-radius: 12px; display: flex; align-items: center; justify-content: center; color: #a7f3d0; border: 1px solid rgba(255,255,255,0.2); }
    .brand-icon svg { width: 24px; height: 24px; }
    .brand-name { font-size: 1.5rem; font-weight: 900; letter-spacing: -0.02em; }
    .version-chip { font-size: 0.75rem; font-weight: 800; background: rgba(255,255,255,0.12); color: #a7f3d0; padding: 5px 12px; border-radius: 14px; border: 1px solid rgba(167, 243, 208, 0.2); }

    .showcase-main-content { display: flex; flex-direction: column; gap: 24px; margin: 36px 0; }
    .showcase-title { font-size: 1.85rem; font-weight: 800; line-height: 1.35; margin: 0; letter-spacing: -0.02em; }
    .showcase-desc { font-size: 0.975rem; color: #a7f3d0; opacity: 0.92; margin: 0; line-height: 1.6; }

    /* Metallic Glass Card Preview */
    .metallic-card-preview {
      background: rgba(255, 255, 255, 0.14);
      backdrop-filter: blur(14px);
      border: 1px solid rgba(255, 255, 255, 0.28);
      border-radius: 20px;
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      box-shadow: 0 12px 30px rgba(0,0,0,0.16);
    }
    .preview-top-row { display: flex; justify-content: space-between; align-items: center; }
    .preview-brand { font-weight: 800; font-size: 1.1rem; }
    .preview-brand i { font-style: italic; color: #fef08a; }
    .preview-num { font-family: monospace; font-size: 1.25rem; font-weight: 800; letter-spacing: 0.08em; color: #ffffff; }
    .preview-bottom-row { display: flex; justify-content: space-between; }
    .preview-bottom-row .lbl { font-size: 0.675rem; font-weight: 700; color: #a7f3d0; display: block; margin-bottom: 2px; }
    .preview-bottom-row .val { font-size: 0.9rem; font-weight: 800; letter-spacing: 0.04em; }
    .status-badge { font-size: 0.725rem; font-weight: 800; color: #10b981; background: #dcfce7; padding: 3px 10px; border-radius: 10px; }

    .showcase-highlights { display: flex; flex-direction: column; gap: 16px; margin-top: 12px; }
    .highlight-item { display: flex; align-items: flex-start; gap: 14px; }
    .h-icon-box { width: 36px; height: 36px; border-radius: 10px; background: rgba(255,255,255,0.14); display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 2px; }
    .h-text { display: flex; flex-direction: column; gap: 2px; }
    .h-text strong { font-size: 0.925rem; font-weight: 800; color: #ffffff; }
    .h-text span { font-size: 0.825rem; color: #a7f3d0; opacity: 0.88; line-height: 1.4; }

    .showcase-footer { font-size: 0.825rem; color: #a7f3d0; opacity: 0.85; display: flex; gap: 14px; align-items: center; }

    /* Right Column Form */
    .auth-form-panel { padding: 54px 58px; display: flex; flex-direction: column; justify-content: center; }
    .auth-header-tag { font-size: 0.75rem; font-weight: 800; color: #059669; letter-spacing: 0.08em; margin-bottom: 6px; }
    .form-title { font-size: 1.9rem; font-weight: 800; color: #0f172a; margin: 0 0 8px 0; letter-spacing: -0.025em; }
    .form-subtitle { font-size: 0.95rem; color: #64748b; margin: 0 0 24px 0; line-height: 1.5; }

    .auth-form-content { display: flex; flex-direction: column; gap: 18px; }
    .form-row-2col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

    .form-terms { margin-top: 2px; }
    .checkbox-wrapper { display: flex; align-items: flex-start; gap: 8px; cursor: pointer; color: #475569; font-size: 0.825rem; line-height: 1.4; user-select: none; }
    .checkbox-wrapper input { position: absolute; opacity: 0; pointer-events: none; }
    .checkbox-custom { width: 18px; height: 18px; border: 1.5px solid #cbd5e1; border-radius: 5px; background: #ffffff; display: flex; align-items: center; justify-content: center; margin-top: 1px; flex-shrink: 0; }
    .checkbox-wrapper input:checked + .checkbox-custom { background: #059669; border-color: #059669; }
    .checkbox-custom::after { content: ''; width: 4px; height: 8px; border: solid white; border-width: 0 2px 2px 0; transform: rotate(45deg) translateY(-1px); opacity: 0; }
    .checkbox-wrapper input:checked + .checkbox-custom::after { opacity: 1; }

    .terms-link { color: #059669; font-weight: 700; text-decoration: none; }
    .terms-link:hover { text-decoration: underline; }

    .btn-emerald-primary { width: 100%; height: 48px; border: none; border-radius: 12px; background: linear-gradient(135deg, #059669 0%, #047857 100%); color: #ffffff; font-size: 0.975rem; font-weight: 800; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 14px rgba(5, 150, 105, 0.35); }
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
      .form-row-2col { grid-template-columns: 1fr; }
    }
  `]
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private notification = inject(NotificationService);

  loading = signal(false);
  submitError = signal('');

  form = this.fb.group({
    username: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50)]],
    email: ['', [Validators.required, Validators.email]],
    fullName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    password: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(100)]],
    confirmPassword: ['', [Validators.required]],
    terms: [false, [Validators.requiredTrue]]
  });

  userIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>`;
  emailIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>`;
  nameIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>`;
  lockIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>`;

  usernameError = computed(() => {
    const control = this.form.get('username');
    if (control?.invalid && (control?.dirty || control?.touched)) {
      if (control?.errors?.['required']) return 'Username is required';
      if (control?.errors?.['minlength']) return 'Username must be at least 3 characters';
    }
    return '';
  });

  emailError = computed(() => {
    const control = this.form.get('email');
    if (control?.invalid && (control?.dirty || control?.touched)) {
      if (control?.errors?.['required']) return 'Email is required';
      if (control?.errors?.['email']) return 'Please enter a valid email address';
    }
    return '';
  });

  fullNameError = computed(() => {
    const control = this.form.get('fullName');
    if (control?.invalid && (control?.dirty || control?.touched)) {
      if (control?.errors?.['required']) return 'Full name is required';
    }
    return '';
  });

  passwordError = computed(() => {
    const control = this.form.get('password');
    if (control?.invalid && (control?.dirty || control?.touched)) {
      if (control?.errors?.['required']) return 'Password is required';
      if (control?.errors?.['minlength']) return 'Password must be at least 6 characters';
    }
    return '';
  });

  confirmPasswordError = computed(() => {
    const control = this.form.get('confirmPassword');
    const password = this.form.get('password')?.value;
    if (control?.invalid && (control?.dirty || control?.touched)) {
      if (control?.errors?.['required']) return 'Please confirm your password';
    }
    if (control?.value && control?.value !== password) {
      return 'Passwords do not match';
    }
    return '';
  });

  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.submitError.set('');

    const { username, email, password, fullName } = this.form.getRawValue();

    this.authService.register({ username: username!, email: email!, password: password!, fullName: fullName! }).subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res.success) {
          this.notification.success('Registration successful');
          this.router.navigate(['/accounts/dashboard']);
        } else {
          this.submitError.set(res.message || 'Registration failed');
        }
      },
      error: (err) => {
        this.loading.set(false);
        const errMsg = err.error?.message || 'Registration failed. Please check your details and try again.';
        this.submitError.set(errMsg);
        this.notification.error(errMsg);
      }
    });
  }
}