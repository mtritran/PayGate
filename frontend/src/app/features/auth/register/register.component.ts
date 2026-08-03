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
    <div class="space-auth-container fade-in-up">
      <div class="space-auth-card">
        
        <!-- LEFT COLUMN: Clean Minimalist Spacious Form -->
        <div class="auth-form-side">
          <div class="brand-header">
            <div class="logo-box">
              <img src="assets/PayGate_Logo.png" alt="PayGate" class="logo-img">
            </div>
            <span class="brand-title">PayGate <span class="brand-tag">PRO</span></span>
          </div>

          <div class="form-body">
            <h1 class="main-title">Register</h1>
            <p class="sub-text">Already have an account? <a routerLink="/login" class="highlight-link">Sign In PayGate ➔</a></p>

            <form [formGroup]="form" (ngSubmit)="onSubmit()" class="pure-form mt-20">
              <div class="form-field">
                <pg-input
                  label="Full Name"
                  placeholder="Enter your full name..."
                  formControlName="fullName"
                  type="text"
                  autocomplete="name"
                  [error]="fullNameError()"
                  [prefixIcon]="userIcon"
                ></pg-input>
              </div>

              <div class="form-field">
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

              <div class="form-field">
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

              <div class="form-field">
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

              <div class="form-actions">
                <label class="remember-label">
                  <input type="checkbox" formControlName="agreeTerms" />
                  <span>I agree to <a routerLink="/terms" class="highlight-link">Terms of Service</a></span>
                </label>
              </div>

              <button type="submit" class="btn-paygate-submit" [disabled]="form.invalid || loading()">
                <span *ngIf="!loading()">Create PayGate Account ↗</span>
                <span *ngIf="loading()" class="loading-span"><span class="spinner"></span> Creating Account...</span>
              </button>

              <div class="error-msg-banner" *ngIf="submitError()">
                ⚠️ {{ submitError() }}
              </div>
            </form>
          </div>

          <div class="form-footer">
            <p>© 2026 PayGate Inc. Enterprise Payment Infrastructure. <br> <a routerLink="/terms" class="legal-link">Terms of Service</a> &nbsp;•&nbsp; <a routerLink="/privacy" class="legal-link">Privacy Policy</a></p>
          </div>
        </div>

        <!-- RIGHT COLUMN: Animated 3D FinTech PayGate Illustration -->
        <div class="space-illustration-side">
          <svg class="space-scene" viewBox="0 0 700 750" preserveAspectRatio="xMidYMid slice" role="img">
            <defs>
              <linearGradient id="paygateSkyReg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#0b1329"/>
                <stop offset="35%" stop-color="#0d2b5c"/>
                <stop offset="75%" stop-color="#4a0e4e"/>
                <stop offset="100%" stop-color="#831843"/>
              </linearGradient>

              <linearGradient id="waveFrontReg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#c20067"/>
                <stop offset="50%" stop-color="#e11d48"/>
                <stop offset="100%" stop-color="#7c2d12"/>
              </linearGradient>
              <linearGradient id="waveBackReg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#0072ce"/>
                <stop offset="100%" stop-color="#3b82f6"/>
              </linearGradient>

              <linearGradient id="goldCoinReg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#fef08a"/>
                <stop offset="50%" stop-color="#eab308"/>
                <stop offset="100%" stop-color="#854d0e"/>
              </linearGradient>

              <linearGradient id="visaCardGradReg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#ffdeeb" stop-opacity="0.95"/>
                <stop offset="35%" stop-color="#c20067" stop-opacity="0.9"/>
                <stop offset="80%" stop-color="#0d2b5c" stop-opacity="0.95"/>
                <stop offset="100%" stop-color="#0072ce" stop-opacity="1"/>
              </linearGradient>
            </defs>

            <rect width="700" height="750" fill="url(#paygateSkyReg)"/>

            <g class="stars-group">
              <circle cx="100" cy="110" r="3" fill="#f472b6" opacity="0.9"/>
              <circle cx="200" cy="70" r="3.5" fill="#60a5fa" opacity="0.85"/>
              <circle cx="340" cy="120" r="2.5" fill="#fef08a" opacity="0.95"/>
              <circle cx="520" cy="80" r="4" fill="#f472b6" opacity="0.9"/>
              <circle cx="620" cy="160" r="2.5" fill="#60a5fa" opacity="0.8"/>
              <circle cx="150" cy="240" r="3" fill="#ffffff" opacity="0.75"/>
              <circle cx="560" cy="260" r="3.5" fill="#fef08a" opacity="0.9"/>
            </g>

            <path d="M 0 580 Q 200 450 380 540 T 700 510 L 700 750 L 0 750 Z" fill="url(#waveBackReg)" opacity="0.4"/>
            <path d="M 0 620 Q 240 510 460 580 T 700 550 L 700 750 L 0 750 Z" fill="url(#waveFrontReg)" opacity="0.65"/>

            <g class="card-float-group">
              <rect x="145" y="295" width="410" height="250" rx="26" fill="#000" opacity="0.38" filter="blur(14px)"/>
              <rect x="135" y="265" width="410" height="250" rx="26" fill="url(#visaCardGradReg)" stroke="rgba(255,255,255,0.45)" stroke-width="2.5"/>
              <rect x="180" y="320" width="52" height="40" rx="9" fill="#fef08a" stroke="#ca8a04" stroke-width="2"/>
              <line x1="180" y1="340" x2="232" y2="340" stroke="#ca8a04" stroke-width="1.5"/>
              <line x1="206" y1="320" x2="206" y2="360" stroke="#ca8a04" stroke-width="1.5"/>
              <path d="M 255 330 A 14 14 0 0 1 255 350 M 264 325 A 20 20 0 0 1 264 355" fill="none" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round"/>
              <text x="180" y="415" font-family="monospace" font-size="24" font-weight="900" fill="#ffffff" letter-spacing="4">4532 •••• •••• 8892</text>
              <text x="180" y="462" font-family="system-ui, sans-serif" font-size="12" font-weight="800" fill="#fbcfe8" letter-spacing="1">PAYGATE MEMBER</text>
              <text x="180" y="484" font-family="system-ui, sans-serif" font-size="15" font-weight="900" fill="#ffffff">PAYGATE PRO USER</text>
              <text x="445" y="478" font-family="system-ui, sans-serif" font-size="26" font-weight="900" font-style="italic" fill="#ffffff">VISA</text>
            </g>

            <g class="coin-float-1">
              <circle cx="120" cy="190" r="32" fill="url(#goldCoinReg)" stroke="#fef08a" stroke-width="2.5"/>
              <text x="120" y="199" font-family="sans-serif" font-size="24" font-weight="900" fill="#713f12" text-anchor="middle">₫</text>
            </g>

            <g class="coin-float-2">
              <circle cx="560" cy="200" r="38" fill="url(#goldCoinReg)" stroke="#fef08a" stroke-width="3"/>
              <text x="560" y="211" font-family="sans-serif" font-size="28" font-weight="900" fill="#713f12" text-anchor="middle">$</text>
            </g>

            <g opacity="0.85">
              <path d="M 120 222 Q 150 275 210 265" fill="none" stroke="#60a5fa" stroke-width="3.5" stroke-dasharray="6,6"/>
              <path d="M 560 238 Q 520 295 460 265" fill="none" stroke="#f472b6" stroke-width="3.5" stroke-dasharray="6,6"/>
            </g>
          </svg>
        </div>

      </div>
    </div>
  `,
  styles: [`
    @keyframes fadeInUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes spin { to { transform: rotate(360deg); } }
    .fade-in-up { animation: fadeInUp 0.4s ease-out forwards; }

    .space-auth-container {
      display: flex; justify-content: center; align-items: center;
      width: 100%; min-height: 92vh; padding: 32px 20px; box-sizing: border-box;
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
    }

    .space-auth-card {
      display: grid; grid-template-columns: 560px 1fr;
      width: 96vw; max-width: 1380px; min-height: 760px; height: 86vh;
      background: #ffffff; border-radius: 32px;
      border: 1.5px solid #f3d6e5; overflow: hidden;
      box-shadow: 0 30px 80px rgba(194, 0, 103, 0.14);
    }

    .auth-form-side {
      padding: 54px 60px; display: flex; flex-direction: column;
      justify-content: space-between; background: #ffffff;
    }

    .brand-header { display: flex; align-items: center; gap: 14px; margin-bottom: 24px; }
    .logo-box { width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; }
    .logo-img { width: 100%; height: 100%; object-fit: contain; }
    .brand-title { font-size: 1.55rem; font-weight: 900; color: #0d2b5c; display: flex; align-items: center; gap: 8px; }
    .brand-tag { font-size: 0.72rem; font-weight: 900; background: linear-gradient(135deg, #c20067, #0072ce); color: #fff; padding: 4px 10px; border-radius: 8px; }

    .form-body { display: flex; flex-direction: column; }
    .main-title { font-size: 2.35rem; font-weight: 900; color: #0d2b5c; margin: 0 0 6px 0; letter-spacing: -0.03em; }
    .sub-text { font-size: 0.95rem; color: #64748b; margin: 0 0 18px 0; }
    .highlight-link { color: #c20067; font-weight: 800; text-decoration: none; }
    .highlight-link:hover { text-decoration: underline; }

    .pure-form { display: flex; flex-direction: column; gap: 16px; }
    .form-field { display: flex; flex-direction: column; }

    .form-actions { display: flex; justify-content: space-between; align-items: center; font-size: 0.88rem; margin-top: 4px; }
    .remember-label { display: flex; align-items: center; gap: 8px; cursor: pointer; color: #475569; font-weight: 600; }
    .remember-label input { accent-color: #c20067; width: 18px; height: 18px; cursor: pointer; }

    .btn-paygate-submit {
      height: 54px; width: 100%; border: none; border-radius: 16px;
      background: linear-gradient(135deg, #c20067 0%, #0072ce 100%);
      color: #ffffff; font-weight: 900; font-size: 1.05rem; cursor: pointer;
      box-shadow: 0 12px 28px rgba(194, 0, 103, 0.3);
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1); margin-top: 10px;
    }
    .btn-paygate-submit:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 16px 36px rgba(194, 0, 103, 0.42); }
    .btn-paygate-submit:disabled { opacity: 0.5; cursor: not-allowed; }

    .loading-span { display: flex; align-items: center; justify-content: center; gap: 10px; }
    .spinner { width: 20px; height: 20px; border: 2.5px solid rgba(255,255,255,0.4); border-top-color: #fff; border-radius: 50%; animation: spin 0.6s linear infinite; }
    .error-msg-banner { background: #fee2e2; border: 1.5px solid #fca5a5; color: #b91c1c; padding: 14px 18px; border-radius: 12px; font-size: 0.92rem; font-weight: 700; margin-top: 12px; }

    .form-footer { font-size: 0.85rem; color: #94a3b8; line-height: 1.6; margin-top: 24px; }
    .legal-link { color: #64748b; text-decoration: none; font-weight: 600; }
    .legal-link:hover { color: #c20067; text-decoration: underline; }

    .space-illustration-side {
      position: relative; width: 100%; height: 100%; overflow: hidden; background: #0b1329;
    }
    .space-scene { width: 100%; height: 100%; object-fit: cover; display: block; }

    .card-float-group { animation: cardBobbing 4.5s ease-in-out infinite alternate; }
    .coin-float-1 { animation: coinFloat 3s ease-in-out infinite alternate; }
    .coin-float-2 { animation: coinFloat 3.6s ease-in-out 0.6s infinite alternate; }
    .stars-group circle { animation: starTwinkle 2.5s ease-in-out infinite alternate; }

    @keyframes cardBobbing { 0% { transform: translateY(0) rotate(0deg); } 100% { transform: translateY(-18px) rotate(1.5deg); } }
    @keyframes coinFloat { 0% { transform: translateY(0) scale(1); } 100% { transform: translateY(-14px) scale(1.06); } }
    @keyframes starTwinkle { 0% { opacity: 0.2; } 100% { opacity: 1; } }

    .mt-20 { margin-top: 20px; }

    @media (max-width: 1080px) {
      .space-auth-card { grid-template-columns: 1fr; height: auto; min-height: auto; }
      .space-illustration-side { display: none; }
      .auth-form-side { padding: 40px 32px; }
    }
  `]
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);

  loading = signal(false);
  submitError = signal<string | null>(null);

  form = this.fb.group({
    fullName: ['', [Validators.required, Validators.maxLength(100)]],
    username: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    agreeTerms: [true, [Validators.requiredTrue]]
  });

  userIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
  emailIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>`;
  lockIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>`;

  fullNameError = computed(() => {
    const ctrl = this.form.get('fullName');
    if (ctrl?.touched && ctrl?.errors) {
      if (ctrl.errors['required']) return 'Full name is required';
    }
    return '';
  });

  usernameError = computed(() => {
    const ctrl = this.form.get('username');
    if (ctrl?.touched && ctrl?.errors) {
      if (ctrl.errors['required']) return 'Username is required';
      if (ctrl.errors['minlength']) return 'Min 3 characters';
    }
    return '';
  });

  emailError = computed(() => {
    const ctrl = this.form.get('email');
    if (ctrl?.touched && ctrl?.errors) {
      if (ctrl.errors['required']) return 'Email address is required';
      if (ctrl.errors['email']) return 'Invalid email address';
    }
    return '';
  });

  passwordError = computed(() => {
    const ctrl = this.form.get('password');
    if (ctrl?.touched && ctrl?.errors) {
      if (ctrl.errors['required']) return 'Password is required';
      if (ctrl.errors['minlength']) return 'Min 6 characters';
    }
    return '';
  });

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.submitError.set(null);
    const val = this.form.value;

    this.authService.register({
      username: val.username!,
      email: val.email!,
      password: val.password!,
      fullName: val.fullName!
    }).subscribe({
      next: (res: any) => {
        this.loading.set(false);
        if (res.success) {
          this.notificationService.success('Registration successful!');
          this.router.navigate(['/accounts/dashboard']);
        } else {
          this.submitError.set(res.message || 'Registration failed.');
        }
      },
      error: (err: any) => {
        this.loading.set(false);
        const msg = err.error?.message || 'Registration failed. Please try again.';
        this.submitError.set(msg);
      }
    });
  }
}