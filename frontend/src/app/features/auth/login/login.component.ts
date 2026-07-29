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
        
        <!-- LEFT COLUMN: Clean Minimalist Login Form -->
        <div class="auth-form-side">
          <div class="brand-header">
            <div class="logo-box">
              <img src="assets/PayGate_Logo.jpg" alt="PayGate" class="logo-img">
            </div>
            <span class="brand-title">PayGate <span class="brand-tag">PRO</span></span>
          </div>

          <div class="form-body">
            <h1 class="main-title">Login</h1>
            <p class="sub-text">Don't have an account? <a routerLink="/register" class="highlight-link">Register PayGate Now</a></p>

            <!-- Quick Demo Login Buttons -->
            <div class="quick-demo-row mt-16">
              <span class="demo-tag">Quick Demo:</span>
              <button type="button" class="btn-demo-pill" (click)="fillDemoUser()">👤 User</button>
              <button type="button" class="btn-demo-pill admin" (click)="fillDemoAdmin()">🛡️ Admin</button>
            </div>

            <form [formGroup]="form" (ngSubmit)="onSubmit()" class="pure-form mt-20">
              <div class="form-field">
                <pg-input
                  label="Email Address or Username"
                  placeholder="Enter email or username..."
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
                  placeholder="Enter password..."
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
                  <span>Remember Me</span>
                </label>
                <a routerLink="/auth/forgot-password" class="forgot-link">Forgot Your Password?</a>
              </div>

              <button type="submit" class="btn-rocket-submit" [disabled]="form.invalid || loading()">
                <span *ngIf="!loading()">Log In 🚀</span>
                <span *ngIf="loading()" class="loading-span"><span class="spinner"></span> Authenticating...</span>
              </button>

              <div class="error-msg-banner" *ngIf="submitError()">
                ⚠️ {{ submitError() }}
              </div>
            </form>
          </div>

          <div class="form-footer">
            <p>© 2026 PayGate Inc. All rights reserved. <br> <a routerLink="/terms" class="legal-link">Terms of Service</a> | <a routerLink="/privacy" class="legal-link">Privacy Policy</a></p>
          </div>
        </div>

        <!-- RIGHT COLUMN: Animated Space Rocket Launch Graphics -->
        <div class="space-illustration-side">
          <svg class="space-scene" viewBox="0 0 500 600" preserveAspectRatio="xMidYMid slice" role="img">
            <defs>
              <!-- Space Sky Gradient -->
              <linearGradient id="spaceSky" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#0b0726"/>
                <stop offset="40%" stop-color="#190e4f"/>
                <stop offset="75%" stop-color="#4a154b"/>
                <stop offset="100%" stop-color="#932b26"/>
              </linearGradient>

              <!-- Mountain Sunset Gradients -->
              <linearGradient id="mountainFront" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#ea580c"/>
                <stop offset="50%" stop-color="#c2410c"/>
                <stop offset="100%" stop-color="#7c2d12"/>
              </linearGradient>
              <linearGradient id="mountainBack" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#c026d3"/>
                <stop offset="100%" stop-color="#4c1d95"/>
              </linearGradient>

              <!-- Rocket Body Gradients -->
              <linearGradient id="rocketBody" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#fdba74"/>
                <stop offset="50%" stop-color="#f97316"/>
                <stop offset="100%" stop-color="#c2410c"/>
              </linearGradient>
              <linearGradient id="rocketWing" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#ea580c"/>
                <stop offset="100%" stop-color="#7c2d12"/>
              </linearGradient>
              <linearGradient id="fireGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#fef08a"/>
                <stop offset="40%" stop-color="#f97316"/>
                <stop offset="100%" stop-color="#dc2626"/>
              </linearGradient>
            </defs>

            <!-- Sky Background -->
            <rect width="500" height="600" fill="url(#spaceSky)"/>

            <!-- Twinkling Stars -->
            <g class="stars-group">
              <circle cx="60" cy="80" r="1.5" fill="#fff" opacity="0.8"/>
              <circle cx="120" cy="40" r="2" fill="#fff" opacity="0.9"/>
              <circle cx="210" cy="90" r="1.2" fill="#fff" opacity="0.7"/>
              <circle cx="340" cy="50" r="2.5" fill="#fff" opacity="0.95"/>
              <circle cx="420" cy="110" r="1.8" fill="#fff" opacity="0.85"/>
              <circle cx="450" cy="30" r="1" fill="#fff" opacity="0.6"/>
              <circle cx="90" cy="180" r="2" fill="#fff" opacity="0.9"/>
              <circle cx="390" cy="190" r="1.5" fill="#fff" opacity="0.75"/>
            </g>

            <!-- Drifting Clouds -->
            <g class="drifting-clouds" opacity="0.4">
              <path d="M 30 110 Q 50 90 80 100 Q 110 80 140 100 Q 160 120 130 130 Z" fill="#c084fc"/>
              <path d="M 320 140 Q 340 120 370 130 Q 400 110 430 130 Q 450 150 420 160 Z" fill="#e879f9"/>
              <path d="M 180 50 Q 200 35 220 45 Q 240 30 260 50 Z" fill="#a855f7"/>
            </g>

            <!-- Background Mountains -->
            <path d="M 0 450 L 100 320 L 220 440 L 380 290 L 500 420 L 500 600 L 0 600 Z" fill="url(#mountainBack)"/>

            <!-- Foreground Mountains -->
            <path d="M 0 480 L 140 360 L 280 500 L 440 340 L 500 410 L 500 600 L 0 600 Z" fill="url(#mountainFront)"/>

            <!-- Rocket Launching Group -->
            <g class="rocket-launch-group">
              <!-- Rocket Fire Trail -->
              <path class="rocket-flame" d="M 235 340 Q 250 420 250 480 Q 250 420 265 340 Z" fill="url(#fireGrad)"/>

              <!-- Rocket Tail Wings -->
              <path d="M 215 310 L 235 290 L 235 340 Z" fill="url(#rocketWing)"/>
              <path d="M 285 310 L 265 290 L 265 340 Z" fill="url(#rocketWing)"/>

              <!-- Rocket Main Body -->
              <path d="M 235 240 Q 250 160 250 160 Q 250 160 265 240 L 265 330 L 235 330 Z" fill="url(#rocketBody)"/>
              
              <!-- Rocket Tip Nose Cone -->
              <path d="M 238 230 Q 250 150 250 150 Q 250 150 262 230 Z" fill="#ea580c"/>

              <!-- Rocket Window Porthole -->
              <circle cx="250" cy="235" r="14" fill="#1e293b" stroke="#ea580c" stroke-width="3"/>
              <circle cx="250" cy="235" r="10" fill="#38bdf8"/>
              <circle cx="247" cy="232" r="3" fill="#ffffff"/>

              <!-- Rocket Metal Stripes -->
              <line x1="235" y1="280" x2="265" y2="280" stroke="#7c2d12" stroke-width="4"/>
            </g>

            <!-- Rolling Launch Smoke Clouds at Bottom -->
            <g class="launch-smoke">
              <circle cx="160" cy="530" r="65" fill="#f8fafc" opacity="0.95"/>
              <circle cx="230" cy="510" r="75" fill="#ffffff"/>
              <circle cx="310" cy="520" r="70" fill="#f1f5f9" opacity="0.95"/>
              <circle cx="100" cy="550" r="60" fill="#e2e8f0" opacity="0.9"/>
              <circle cx="380" cy="540" r="65" fill="#e2e8f0" opacity="0.9"/>
            </g>

            <!-- Bottom Ocean Water Blend -->
            <path d="M 0 550 Q 250 530 500 550 L 500 600 L 0 600 Z" fill="#1e1b4b" opacity="0.8"/>
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
      width: 100%; min-height: 88vh; padding: 20px 0;
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
    }

    /* 2-Column Split Card matching SeedProd Layout */
    .space-auth-card {
      display: grid; grid-template-columns: 460px 1fr;
      width: 100%; max-width: 1080px; min-height: 600px;
      background: #ffffff; border-radius: 20px;
      border: 1px solid #e2e8f0; overflow: hidden;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.12);
    }

    /* Left Form Panel (Pure Clean White) */
    .auth-form-side {
      padding: 44px 48px; display: flex; flex-direction: column;
      justify-content: space-between; background: #ffffff;
    }

    .brand-header { display: flex; align-items: center; gap: 10px; margin-bottom: 24px; }
    .logo-box { width: 36px; height: 36px; border-radius: 10px; overflow: hidden; border: 1px solid #f48fb1; }
    .logo-img { width: 100%; height: 100%; object-fit: cover; }
    .brand-title { font-size: 1.3rem; font-weight: 900; color: #0f172a; display: flex; align-items: center; gap: 6px; }
    .brand-tag { font-size: 0.65rem; font-weight: 800; background: #c20067; color: #fff; padding: 2px 6px; border-radius: 6px; }

    .form-body { display: flex; flex-direction: column; }
    .main-title { font-size: 2rem; font-weight: 900; color: #0f172a; margin: 0 0 6px 0; letter-spacing: -0.02em; }
    .sub-text { font-size: 0.88rem; color: #64748b; margin: 0 0 16px 0; }
    .highlight-link { color: #ea580c; font-weight: 800; text-decoration: none; }
    .highlight-link:hover { text-decoration: underline; }

    .quick-demo-row { display: flex; align-items: center; gap: 8px; background: #fff7ed; border: 1px solid #ffedd5; padding: 8px 12px; border-radius: 10px; }
    .demo-tag { font-size: 0.75rem; font-weight: 800; color: #c2410c; }
    .btn-demo-pill { background: #ffffff; border: 1px solid #fdba74; border-radius: 6px; padding: 4px 10px; font-size: 0.75rem; font-weight: 800; color: #ea580c; cursor: pointer; transition: all 0.15s; }
    .btn-demo-pill:hover { background: #ea580c; color: #fff; }
    .btn-demo-pill.admin { color: #0284c7; border-color: #7dd3fc; }
    .btn-demo-pill.admin:hover { background: #0284c7; color: #fff; }

    .pure-form { display: flex; flex-direction: column; gap: 16px; }
    .form-field { display: flex; flex-direction: column; }

    .form-actions { display: flex; justify-content: space-between; align-items: center; font-size: 0.82rem; margin-top: 4px; }
    .remember-label { display: flex; align-items: center; gap: 6px; cursor: pointer; color: #475569; font-weight: 600; }
    .remember-label input { accent-color: #ea580c; width: 16px; height: 16px; cursor: pointer; }
    .forgot-link { color: #ea580c; font-weight: 700; text-decoration: none; }
    .forgot-link:hover { text-decoration: underline; }

    /* Orange Rocket Launch Submit Button */
    .btn-rocket-submit {
      height: 48px; width: 100%; border: none; border-radius: 10px;
      background: linear-gradient(135deg, #ea580c 0%, #dc2626 100%);
      color: #ffffff; font-weight: 900; font-size: 1rem; cursor: pointer;
      box-shadow: 0 8px 20px rgba(234, 88, 12, 0.35);
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1); margin-top: 8px;
    }
    .btn-rocket-submit:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 12px 26px rgba(234, 88, 12, 0.45); }
    .btn-rocket-submit:disabled { opacity: 0.6; cursor: not-allowed; }

    .loading-span { display: flex; align-items: center; justify-content: center; gap: 8px; }
    .spinner { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.4); border-top-color: #fff; border-radius: 50%; animation: spin 0.6s linear infinite; }
    .error-msg-banner { background: #fef2f2; border: 1px solid #fca5a5; color: #991b1b; padding: 10px 14px; border-radius: 8px; font-size: 0.82rem; font-weight: 700; margin-top: 10px; }

    .form-footer { font-size: 0.75rem; color: #94a3b8; line-height: 1.5; margin-top: 20px; }
    .legal-link { color: #64748b; text-decoration: none; }

    /* Right Space Illustration Panel */
    .space-illustration-side {
      position: relative; width: 100%; height: 100%; overflow: hidden; background: #0b0726;
    }
    .space-scene { width: 100%; height: 100%; object-fit: cover; display: block; }

    /* CSS Animations for Space Scene */
    .rocket-launch-group {
      animation: rocketHover 3s ease-in-out infinite alternate;
    }
    .rocket-flame {
      animation: flameFlicker 0.15s ease-in-out infinite alternate;
      transform-origin: center top;
    }
    .launch-smoke {
      animation: smokePuff 2s ease-in-out infinite alternate;
    }
    .stars-group circle {
      animation: starTwinkle 2s ease-in-out infinite alternate;
    }
    .drifting-clouds {
      animation: cloudDrift 20s linear infinite;
    }

    @keyframes rocketHover {
      0% { transform: translateY(0); }
      100% { transform: translateY(-14px); }
    }
    @keyframes flameFlicker {
      0% { transform: scaleY(1) scaleX(1); opacity: 0.9; }
      100% { transform: scaleY(1.15) scaleX(0.92); opacity: 1; }
    }
    @keyframes smokePuff {
      0% { transform: scale(1); opacity: 0.9; }
      100% { transform: scale(1.04); opacity: 1; }
    }
    @keyframes starTwinkle {
      0% { opacity: 0.3; }
      100% { opacity: 1; }
    }
    @keyframes cloudDrift {
      0% { transform: translateX(0); }
      100% { transform: translateX(-60px); }
    }

    .mt-16 { margin-top: 16px; }
    .mt-20 { margin-top: 20px; }

    @media (max-width: 860px) {
      .space-auth-card { grid-template-columns: 1fr; }
      .space-illustration-side { display: none; }
      .auth-form-side { padding: 32px 24px; }
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
      if (ctrl.errors['required']) return 'Email address or username is required';
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