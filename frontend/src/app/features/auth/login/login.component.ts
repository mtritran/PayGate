import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
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
            <h1 class="main-title">Sign In</h1>
            <p class="sub-text">Don't have an account yet? <a routerLink="/register" class="highlight-link">Create PayGate Account ➔</a></p>

            <form [formGroup]="form" (ngSubmit)="onSubmit()" class="pure-form mt-16">
              <div class="form-field">
                <pg-input
                  label="Email Address or Username"
                  placeholder="Enter your username or email..."
                  formControlName="username"
                  type="text"
                  autocomplete="username"
                  [error]="usernameError()"
                  [prefixIcon]="userIcon"
                ></pg-input>
              </div>

              <div class="form-field">
                <pg-input
                  label="Password"
                  placeholder="Enter your password..."
                  formControlName="password"
                  type="password"
                  autocomplete="current-password"
                  [error]="passwordError()"
                  [prefixIcon]="lockIcon"
                  [showPasswordToggle]="true"
                ></pg-input>
              </div>

              <div class="form-actions">
                <label class="remember-label">
                  <input type="checkbox" formControlName="rememberMe" />
                  <span>Remember session for 30 days</span>
                </label>
                <a routerLink="/auth/forgot-password" class="forgot-link">Forgot password?</a>
              </div>

              <button type="submit" class="btn-paygate-submit" [disabled]="form.invalid || loading()">
                <span *ngIf="!loading()">Sign In to PayGate Wallet ↗</span>
                <span *ngIf="loading()" class="loading-span"><span class="spinner"></span> Authenticating credentials...</span>
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
              <linearGradient id="paygateSky" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#0b1329"/>
                <stop offset="35%" stop-color="#0d2b5c"/>
                <stop offset="75%" stop-color="#4a0e4e"/>
                <stop offset="100%" stop-color="#831843"/>
              </linearGradient>

              <linearGradient id="waveFront" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#c20067"/>
                <stop offset="50%" stop-color="#e11d48"/>
                <stop offset="100%" stop-color="#7c2d12"/>
              </linearGradient>
              <linearGradient id="waveBack" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#0072ce"/>
                <stop offset="100%" stop-color="#3b82f6"/>
              </linearGradient>

              <linearGradient id="goldCoin" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#fef08a"/>
                <stop offset="50%" stop-color="#eab308"/>
                <stop offset="100%" stop-color="#854d0e"/>
              </linearGradient>

              <linearGradient id="visaCardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#ffdeeb" stop-opacity="0.95"/>
                <stop offset="35%" stop-color="#c20067" stop-opacity="0.9"/>
                <stop offset="80%" stop-color="#0d2b5c" stop-opacity="0.95"/>
                <stop offset="100%" stop-color="#0072ce" stop-opacity="1"/>
              </linearGradient>
            </defs>

            <rect width="700" height="750" fill="url(#paygateSky)"/>

            <!-- Particles Network -->
            <g class="stars-group">
              <circle cx="100" cy="110" r="3" fill="#f472b6" opacity="0.9"/>
              <circle cx="200" cy="70" r="3.5" fill="#60a5fa" opacity="0.85"/>
              <circle cx="340" cy="120" r="2.5" fill="#fef08a" opacity="0.95"/>
              <circle cx="520" cy="80" r="4" fill="#f472b6" opacity="0.9"/>
              <circle cx="620" cy="160" r="2.5" fill="#60a5fa" opacity="0.8"/>
              <circle cx="150" cy="240" r="3" fill="#ffffff" opacity="0.75"/>
              <circle cx="560" cy="260" r="3.5" fill="#fef08a" opacity="0.9"/>
            </g>

            <!-- Background Waves -->
            <path d="M 0 580 Q 200 450 380 540 T 700 510 L 700 750 L 0 750 Z" fill="url(#waveBack)" opacity="0.4"/>
            <path d="M 0 620 Q 240 510 460 580 T 700 550 L 700 750 L 0 750 Z" fill="url(#waveFront)" opacity="0.65"/>

            <!-- Floating 3D PayGate Card -->
            <g class="card-float-group">
              <rect x="145" y="295" width="410" height="250" rx="26" fill="#000" opacity="0.38" filter="blur(14px)"/>
              <rect x="135" y="265" width="410" height="250" rx="26" fill="url(#visaCardGrad)" stroke="rgba(255,255,255,0.45)" stroke-width="2.5"/>

              <rect x="180" y="320" width="52" height="40" rx="9" fill="#fef08a" stroke="#ca8a04" stroke-width="2"/>
              <line x1="180" y1="340" x2="232" y2="340" stroke="#ca8a04" stroke-width="1.5"/>
              <line x1="206" y1="320" x2="206" y2="360" stroke="#ca8a04" stroke-width="1.5"/>

              <path d="M 255 330 A 14 14 0 0 1 255 350 M 264 325 A 20 20 0 0 1 264 355" fill="none" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round"/>

              <text x="180" y="415" font-family="monospace" font-size="24" font-weight="900" fill="#ffffff" letter-spacing="4">4532 •••• •••• 8892</text>

              <text x="180" y="462" font-family="system-ui, sans-serif" font-size="12" font-weight="800" fill="#fbcfe8" letter-spacing="1">PAYGATE MEMBER</text>
              <text x="180" y="484" font-family="system-ui, sans-serif" font-size="15" font-weight="900" fill="#ffffff">PAYGATE PRO USER</text>

              <text x="445" y="478" font-family="system-ui, sans-serif" font-size="26" font-weight="900" font-style="italic" fill="#ffffff">VISA</text>
            </g>

            <!-- Floating 3D Gold Coins -->
            <g class="coin-float-1">
              <circle cx="120" cy="190" r="32" fill="url(#goldCoin)" stroke="#fef08a" stroke-width="2.5"/>
              <text x="120" y="199" font-family="sans-serif" font-size="24" font-weight="900" fill="#713f12" text-anchor="middle">₫</text>
            </g>

            <g class="coin-float-2">
              <circle cx="560" cy="200" r="38" fill="url(#goldCoin)" stroke="#fef08a" stroke-width="3"/>
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

    /* Spacious 2-Column Split Card */
    .space-auth-card {
      display: grid; grid-template-columns: 560px 1fr;
      width: 96vw; max-width: 1380px; min-height: 760px; height: 86vh;
      background: #ffffff; border-radius: 32px;
      border: 1.5px solid #f3d6e5; overflow: hidden;
      box-shadow: 0 30px 80px rgba(194, 0, 103, 0.14);
    }

    /* Left Form Panel - Generous Spacing */
    .auth-form-side {
      padding: 60px 64px; display: flex; flex-direction: column;
      justify-content: space-between; background: #ffffff;
    }

    .brand-header { display: flex; align-items: center; gap: 14px; margin-bottom: 32px; }
    .logo-box { width: 46px; height: 46px; display: flex; align-items: center; justify-content: center; }
    .logo-img { width: 100%; height: 100%; object-fit: contain; }
    .brand-title { font-size: 1.65rem; font-weight: 900; color: #0d2b5c; display: flex; align-items: center; gap: 8px; }
    .brand-tag { font-size: 0.72rem; font-weight: 900; background: linear-gradient(135deg, #c20067, #0072ce); color: #fff; padding: 4px 10px; border-radius: 8px; }

    .form-body { display: flex; flex-direction: column; }
    .main-title { font-size: 2.5rem; font-weight: 900; color: #0d2b5c; margin: 0 0 8px 0; letter-spacing: -0.03em; }
    .sub-text { font-size: 1rem; color: #64748b; margin: 0 0 24px 0; line-height: 1.5; }
    .highlight-link { color: #c20067; font-weight: 800; text-decoration: none; }
    .highlight-link:hover { text-decoration: underline; }

    .pure-form { display: flex; flex-direction: column; gap: 22px; }
    .form-field { display: flex; flex-direction: column; }

    .form-actions { display: flex; justify-content: space-between; align-items: center; font-size: 0.92rem; margin-top: 4px; }
    .remember-label { display: flex; align-items: center; gap: 8px; cursor: pointer; color: #475569; font-weight: 600; }
    .remember-label input { accent-color: #c20067; width: 18px; height: 18px; cursor: pointer; }
    .forgot-link { color: #c20067; font-weight: 700; text-decoration: none; }
    .forgot-link:hover { text-decoration: underline; }

    /* Grand Pink-Blue Submit Button */
    .btn-paygate-submit {
      height: 56px; width: 100%; border: none; border-radius: 16px;
      background: linear-gradient(135deg, #c20067 0%, #0072ce 100%);
      color: #ffffff; font-weight: 900; font-size: 1.1rem; cursor: pointer;
      box-shadow: 0 12px 28px rgba(194, 0, 103, 0.3);
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1); margin-top: 10px;
    }
    .btn-paygate-submit:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 16px 36px rgba(194, 0, 103, 0.42); }
    .btn-paygate-submit:disabled { opacity: 0.5; cursor: not-allowed; }

    .loading-span { display: flex; align-items: center; justify-content: center; gap: 10px; }
    .spinner { width: 20px; height: 20px; border: 2.5px solid rgba(255,255,255,0.4); border-top-color: #fff; border-radius: 50%; animation: spin 0.6s linear infinite; }
    .error-msg-banner { background: #fee2e2; border: 1.5px solid #fca5a5; color: #b91c1c; padding: 14px 18px; border-radius: 12px; font-size: 0.92rem; font-weight: 700; margin-top: 12px; }

    .form-footer { font-size: 0.85rem; color: #94a3b8; line-height: 1.6; margin-top: 28px; }
    .legal-link { color: #64748b; text-decoration: none; font-weight: 600; }
    .legal-link:hover { color: #c20067; text-decoration: underline; }

    /* Right PayGate Illustration Panel */
    .space-illustration-side {
      position: relative; width: 100%; height: 100%; overflow: hidden; background: #0b1329;
    }
    .space-scene { width: 100%; height: 100%; object-fit: cover; display: block; }

    .card-float-group { animation: cardBobbing 4.5s ease-in-out infinite alternate; }
    .coin-float-1 { animation: coinFloat 3s ease-in-out infinite alternate; }
    .coin-float-2 { animation: coinFloat 3.6s ease-in-out 0.6s infinite alternate; }
    .stars-group circle { animation: starTwinkle 2.5s ease-in-out infinite alternate; }

    @keyframes cardBobbing {
      0% { transform: translateY(0) rotate(0deg); }
      100% { transform: translateY(-18px) rotate(1.5deg); }
    }
    @keyframes coinFloat {
      0% { transform: translateY(0) scale(1); }
      100% { transform: translateY(-14px) scale(1.06); }
    }
    @keyframes starTwinkle {
      0% { opacity: 0.2; }
      100% { opacity: 1; }
    }

    @media (max-width: 1080px) {
      .space-auth-card { grid-template-columns: 1fr; height: auto; min-height: auto; }
      .space-illustration-side { display: none; }
      .auth-form-side { padding: 40px 32px; }
    }
  `]
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  loading = signal(false);
  submitError = signal<string | null>(null);

  form = this.fb.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.required]],
    rememberMe: [false]
  });

  userIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
  lockIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>`;

  usernameError = computed(() => {
    const ctrl = this.form.get('username');
    if (ctrl?.touched && ctrl?.errors) {
      if (ctrl.errors['required']) return 'Username or email is required';
    }
    return '';
  });

  passwordError = computed(() => {
    const ctrl = this.form.get('password');
    if (ctrl?.touched && ctrl?.errors) {
      if (ctrl.errors['required']) return 'Password is required';
    }
    return '';
  });

  fillDemoUser(): void {
    this.form.patchValue({
      username: 'vinhhaha',
      password: 'User@123456!'
    });
    this.form.markAllAsTouched();
  }

  fillDemoAdmin(): void {
    this.form.patchValue({
      username: 'admin',
      password: 'Admin@123456!'
    });
    this.form.markAllAsTouched();
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.submitError.set(null);

    const val = this.form.value;

    this.authService.login({
      username: val.username!,
      password: val.password!
    }).subscribe({
      next: (res: any) => {
        this.loading.set(false);
        if (res.success) {
          this.notificationService.success('Login successful!');
          const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/accounts/dashboard';
          this.router.navigateByUrl(returnUrl);
        } else {
          this.submitError.set(res.message || 'Login failed.');
        }
      },
      error: (err: any) => {
        this.loading.set(false);
        const msg = err.error?.message || 'Invalid username or password.';
        this.submitError.set(msg);
      }
    });
  }
}