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
              <span class="brand-name">PayGate <span class="badge-pro">PRO</span></span>
            </div>
            <span class="version-chip">v2.5 Enterprise</span>
          </div>

          <div class="showcase-main-content">
            <h2 class="showcase-title">Cổng Thanh Toán & Ví Số Thông Minh</h2>
            <p class="showcase-desc">Trải nghiệm giao dịch tức thì 200ms, sổ cái đối ứng realtime và kết nối đa ngân hàng bảo mật tuyệt đối.</p>

            <!-- Metallic Glass Card Preview -->
            <div class="metallic-card-preview shimmer-effect">
              <div class="preview-top-row">
                <span class="preview-brand">PayGate <i>VISA</i></span>
                <span class="preview-chip-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fde047" stroke-width="2">
                    <rect x="2" y="5" width="20" height="14" rx="2"/>
                    <line x1="2" y1="10" x2="22" y2="10"/>
                  </svg>
                </span>
              </div>
              <div class="preview-num">4532 •••• •••• 8892</div>
              <div class="preview-bottom-row">
                <div>
                  <span class="lbl">CHỦ THẺ VÍ</span>
                  <span class="val">PAYGATE PREMIUM</span>
                </div>
                <div>
                  <span class="lbl">TRẠNG THÁI</span>
                  <span class="status-badge">ACTIVE</span>
                </div>
              </div>
            </div>

            <!-- Highlights List -->
            <div class="showcase-highlights">
              <div class="highlight-item">
                <div class="h-icon-box">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f472b6" stroke-width="2.2">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                  </svg>
                </div>
                <div class="h-text">
                  <strong>Thanh Toán Siêu Tốc</strong>
                  <span>Gạch nợ tức thì dưới 200ms với mã OTP Gmail</span>
                </div>
              </div>

              <div class="highlight-item">
                <div class="h-icon-box">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" stroke-width="2.2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </div>
                <div class="h-text">
                  <strong>Bảo Mật Chuẩn Bank-Grade</strong>
                  <span>Mã hóa SSL 256-bit & hệ thống Sổ cái kép</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Footer Trust Badges -->
          <div class="showcase-footer">
            <span>ISO 27001 Certified</span>
            <span>•</span>
            <span>99.99% Uptime SLA</span>
          </div>
        </div>

        <!-- RIGHT COLUMN: Modern Form Panel -->
        <div class="auth-form-panel">
          <div class="form-panel-header">
            <div class="auth-header-tag">WELCOME BACK</div>
            <h1 class="form-title">Đăng Nhập PayGate</h1>
            <p class="form-subtitle">Nhập tài khoản của bạn để truy cập Bảng điều khiển Ví.</p>
          </div>

          <!-- Quick Fill Demo Buttons -->
          <div class="demo-quick-bar">
            <span class="demo-label">Đăng nhập nhanh (Demo):</span>
            <div class="demo-btn-group">
              <button type="button" class="btn-demo-pill" (click)="fillDemoUser()">
                👤 User Demo
              </button>
              <button type="button" class="btn-demo-pill admin" (click)="fillDemoAdmin()">
                🛡️ Admin Demo
              </button>
            </div>
          </div>

          <form [formGroup]="form" (ngSubmit)="onSubmit()" class="auth-form-content mt-20">
            <div class="form-group">
              <pg-input
                label="Tên đăng nhập hoặc Email"
                placeholder="Nhập username hoặc email..."
                formControlName="username"
                type="text"
                autocomplete="username"
                [error]="usernameError()"
                [prefixIcon]="userIcon"
              ></pg-input>
            </div>

            <div class="form-group">
              <pg-input
                label="Mật khẩu"
                placeholder="Nhập mật khẩu..."
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
                <span class="checkbox-label">Ghi nhớ đăng nhập</span>
              </label>
              <a routerLink="/auth/forgot-password" class="forgot-link">Quên mật khẩu?</a>
            </div>

            <button
              type="submit"
              class="btn-pink-primary pulse-glow"
              [disabled]="form.invalid || loading()"
            >
              <span *ngIf="!loading()" class="btn-text-content">
                Đăng Nhập Ngay ↗
              </span>
              <span *ngIf="loading()" class="btn-text-content">
                <span class="btn-spinner"></span>
                Đang xác thực...
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
            <p>Chưa có tài khoản Ví PayGate? <a routerLink="/register" class="link-pink">Đăng ký tài khoản mới ➔</a></p>
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
    @keyframes spin { to { transform: rotate(360deg); } }
    .fade-in-up { animation: fadeInUp 0.4s ease-out forwards; }

    .auth-split-wrapper {
      display: flex; justify-content: center; align-items: center;
      width: 100%; min-height: 85vh; padding: 36px 0;
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
    }

    .auth-split-card {
      display: grid; grid-template-columns: 1fr 1.15fr;
      width: 100%; max-width: 1100px; background: #ffffff;
      border-radius: 28px; border: 1.5px solid #f3d6e5;
      overflow: hidden; box-shadow: 0 20px 60px rgba(194,0,103,0.08);
    }

    /* Left Showcase Panel - Unified Gradient Theme */
    .auth-showcase-panel {
      background: linear-gradient(145deg, #0d2b5c 0%, #1e1b4b 40%, #831843 80%, #c20067 100%);
      color: #ffffff; padding: 48px 44px;
      display: flex; flex-direction: column; justify-content: space-between;
      position: relative; overflow: hidden;
    }

    .showcase-header { display: flex; justify-content: space-between; align-items: center; }
    .brand-logo-group { display: flex; align-items: center; gap: 12px; }
    .brand-icon {
      width: 40px; height: 40px; background: rgba(255,255,255,0.15);
      border-radius: 12px; display: flex; align-items: center; justify-content: center;
      color: #f472b6; border: 1px solid rgba(255,255,255,0.25);
    }
    .brand-icon svg { width: 22px; height: 22px; }
    .brand-name { font-size: 1.4rem; font-weight: 900; letter-spacing: -0.02em; }
    .badge-pro { font-size: 0.65rem; background: linear-gradient(135deg, #c20067, #0072ce); padding: 2px 6px; border-radius: 6px; margin-left: 2px; }
    .version-chip { font-size: 0.75rem; font-weight: 800; background: rgba(255,255,255,0.12); color: #fbcfe8; padding: 4px 12px; border-radius: 14px; border: 1px solid rgba(251, 207, 232, 0.25); }

    .showcase-main-content { display: flex; flex-direction: column; gap: 20px; margin: 28px 0; }
    .showcase-title { font-size: 1.75rem; font-weight: 900; line-height: 1.3; margin: 0; letter-spacing: -0.02em; }
    .showcase-desc { font-size: 0.92rem; color: #fbcfe8; opacity: 0.92; margin: 0; line-height: 1.5; }

    /* Metallic Glass Card Preview */
    .metallic-card-preview {
      background: rgba(255, 255, 255, 0.12); backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.25); border-radius: 20px;
      padding: 22px; display: flex; flex-direction: column; gap: 14px;
      box-shadow: 0 14px 32px rgba(0,0,0,0.18);
    }
    .preview-top-row { display: flex; justify-content: space-between; align-items: center; }
    .preview-brand { font-weight: 900; font-size: 1.05rem; }
    .preview-brand i { font-style: italic; color: #fde047; }
    .preview-num { font-family: monospace; font-size: 1.2rem; font-weight: 800; letter-spacing: 0.08em; color: #ffffff; }
    .preview-bottom-row { display: flex; justify-content: space-between; }
    .preview-bottom-row .lbl { font-size: 0.65rem; font-weight: 800; color: #fbcfe8; display: block; margin-bottom: 2px; }
    .preview-bottom-row .val { font-size: 0.88rem; font-weight: 800; }
    .status-badge { font-size: 0.7rem; font-weight: 800; color: #047857; background: #dcfce7; padding: 3px 10px; border-radius: 10px; }

    .showcase-highlights { display: flex; flex-direction: column; gap: 14px; margin-top: 6px; }
    .highlight-item { display: flex; align-items: flex-start; gap: 12px; }
    .h-icon-box { width: 34px; height: 34px; border-radius: 10px; background: rgba(255,255,255,0.14); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .h-text { display: flex; flex-direction: column; gap: 2px; }
    .h-text strong { font-size: 0.9rem; font-weight: 800; color: #ffffff; }
    .h-text span { font-size: 0.8rem; color: #fbcfe8; opacity: 0.88; line-height: 1.35; }

    .showcase-footer { font-size: 0.8rem; color: #fbcfe8; opacity: 0.85; display: flex; gap: 12px; align-items: center; }

    /* Right Column Form */
    .auth-form-panel { padding: 48px 52px; display: flex; flex-direction: column; justify-content: center; }
    .auth-header-tag { font-size: 0.75rem; font-weight: 900; color: #c20067; letter-spacing: 0.08em; margin-bottom: 6px; }
    .form-title { font-size: 1.85rem; font-weight: 900; color: #0d2b5c; margin: 0 0 6px 0; letter-spacing: -0.025em; }
    .form-subtitle { font-size: 0.9rem; color: #64748b; margin: 0 0 24px 0; line-height: 1.5; }

    .demo-quick-bar { background: #fff0f6; border: 1px solid #f8bbd0; border-radius: 14px; padding: 10px 16px; display: flex; align-items: center; justify-content: space-between; }
    .demo-label { font-size: 0.78rem; font-weight: 800; color: #0d2b5c; }
    .demo-btn-group { display: flex; gap: 8px; }
    .btn-demo-pill { background: #ffffff; border: 1px solid #f48fb1; border-radius: 8px; padding: 5px 12px; font-size: 0.78rem; font-weight: 800; color: #c20067; cursor: pointer; transition: all 0.15s; }
    .btn-demo-pill:hover { background: #c20067; color: #ffffff; }
    .btn-demo-pill.admin { color: #0072ce; border-color: #93c5fd; }
    .btn-demo-pill.admin:hover { background: #0072ce; color: #ffffff; }

    .auth-form-content { display: flex; flex-direction: column; gap: 16px; }
    .form-group { display: flex; flex-direction: column; }

    .form-options { display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem; }
    .checkbox-wrapper { display: flex; align-items: center; gap: 8px; cursor: pointer; }
    .checkbox-wrapper input { display: none; }
    .checkbox-custom { width: 18px; height: 18px; border: 1.5px solid #cbd5e1; border-radius: 5px; display: inline-block; position: relative; transition: all 0.15s; }
    .checkbox-wrapper input:checked + .checkbox-custom { background: #c20067; border-color: #c20067; }
    .checkbox-wrapper input:checked + .checkbox-custom::after { content: '✓'; color: #fff; position: absolute; top: -1px; left: 4px; font-size: 12px; font-weight: 900; }
    .checkbox-label { color: #475569; font-weight: 600; }
    .forgot-link { color: #c20067; text-decoration: none; font-weight: 700; }
    .forgot-link:hover { text-decoration: underline; }

    /* Unified Pink Primary Button */
    .btn-pink-primary {
      height: 48px; width: 100%; border: none; border-radius: 12px;
      background: linear-gradient(135deg, #c20067 0%, #0072ce 100%);
      color: #ffffff; font-weight: 900; font-size: 0.95rem; cursor: pointer;
      box-shadow: 0 8px 22px rgba(194, 0, 103, 0.25); transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .btn-pink-primary:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 12px 28px rgba(194, 0, 103, 0.35); }
    .btn-pink-primary:disabled { opacity: 0.5; cursor: not-allowed; }

    .btn-text-content { display: flex; align-items: center; justify-content: center; gap: 8px; }
    .btn-spinner { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #ffffff; border-radius: 50%; animation: spin 0.6s linear infinite; }

    .error-banner { background: #fee2e2; border: 1px solid #fca5a5; color: #b91c1c; padding: 10px 14px; border-radius: 10px; font-size: 0.85rem; font-weight: 700; display: flex; align-items: center; gap: 8px; }
    .link-pink { color: #c20067; font-weight: 800; text-decoration: none; }
    .link-pink:hover { text-decoration: underline; }

    .mt-12 { margin-top: 12px; }
    .mt-20 { margin-top: 20px; }
    .mt-24 { margin-top: 24px; }

    @media (max-width: 960px) {
      .auth-split-card { grid-template-columns: 1fr; }
      .auth-showcase-panel { display: none; }
      .auth-form-panel { padding: 36px 28px; }
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
      if (ctrl.errors['required']) return 'Tên đăng nhập hoặc Email là bắt buộc';
    }
    return '';
  });

  passwordError = computed(() => {
    const ctrl = this.form.get('password');
    if (ctrl?.touched && ctrl?.errors) {
      if (ctrl.errors['required']) return 'Mật khẩu là bắt buộc';
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
          this.notificationService.success('Đăng nhập thành công!');
          const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/accounts/dashboard';
          this.router.navigateByUrl(returnUrl);
        } else {
          this.submitError.set(res.message || 'Đăng nhập thất bại.');
        }
      },
      error: (err: any) => {
        this.loading.set(false);
        const msg = err.error?.message || 'Tên đăng nhập hoặc mật khẩu không chính xác.';
        this.submitError.set(msg);
      }
    });
  }
}