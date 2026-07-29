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
              <span class="brand-name">PayGate <span class="badge-pro">PRO</span></span>
            </div>
            <span class="version-chip">Free Account</span>
          </div>

          <div class="showcase-main-content">
            <h2 class="showcase-title">Gia Nhập Hàng Ngàn Người Dùng & Doanh Nghiệp</h2>
            <p class="showcase-desc">Mở tài khoản Ví PayGate miễn phí để trải nghiệm liên kết ngân hàng, nạp tiền nhanh và tích hợp API Cổng thanh toán.</p>

            <!-- Metallic Glass Card Preview -->
            <div class="metallic-card-preview shimmer-effect">
              <div class="preview-top-row">
                <span class="preview-brand">PayGate <i>STARTER</i></span>
                <span class="preview-chip-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fde047" stroke-width="2">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                </span>
              </div>
              <div class="preview-num">₫0 Phí Duy Trì Tài Khoản</div>
              <div class="preview-bottom-row">
                <div>
                  <span class="lbl">LOẠI TÀI KHOẢN</span>
                  <span class="val">VÍ CAO CẤP</span>
                </div>
                <div>
                  <span class="lbl">BẢO MẬT</span>
                  <span class="status-badge">PROTECTED</span>
                </div>
              </div>
            </div>

            <!-- Highlights List -->
            <div class="showcase-highlights">
              <div class="highlight-item">
                <div class="h-icon-box">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f472b6" stroke-width="2.2">
                    <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                    <line x1="1" y1="10" x2="23" y2="10"/>
                  </svg>
                </div>
                <div class="h-text">
                  <strong>Thẻ Ví Điện Tử Thật</strong>
                  <span>Tự động cấp số tài khoản ví và thẻ ảo thanh toán trực tuyến</span>
                </div>
              </div>

              <div class="highlight-item">
                <div class="h-icon-box">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" stroke-width="2.2">
                    <line x1="3" y1="21" x2="21" y2="21"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                    <polyline points="12 3 2 10 22 10 12 3"/>
                  </svg>
                </div>
                <div class="h-text">
                  <strong>Liên Kết Ngân Hàng Linh Hoạt</strong>
                  <span>Kết nối MB Bank, Vietcombank, Techcombank, MoMo tức thì</span>
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

        <!-- RIGHT COLUMN: Modern Form Panel -->
        <div class="auth-form-panel">
          <div class="form-panel-header">
            <div class="auth-header-tag">GET STARTED FREE</div>
            <h1 class="form-title">Đăng Ký Ví PayGate</h1>
            <p class="form-subtitle">Điền thông tin bên dưới để khởi tạo tài khoản ví mới.</p>
          </div>

          <form [formGroup]="form" (ngSubmit)="onSubmit()" class="auth-form-content mt-20">
            <div class="form-group">
              <pg-input
                label="Họ và Tên Hợp Lệ"
                placeholder="Nhập họ và tên đầy đủ..."
                formControlName="fullName"
                type="text"
                autocomplete="name"
                [error]="fullNameError()"
                [prefixIcon]="userIcon"
              ></pg-input>
            </div>

            <div class="form-row-2col">
              <div class="form-group">
                <pg-input
                  label="Tên đăng nhập (Username)"
                  placeholder="Chọn tên đăng nhập..."
                  formControlName="username"
                  type="text"
                  autocomplete="username"
                  [error]="usernameError()"
                  [prefixIcon]="userIcon"
                ></pg-input>
              </div>

              <div class="form-group">
                <pg-input
                  label="Địa chỉ Email (Nhận OTP)"
                  placeholder="Nhập email..."
                  formControlName="email"
                  type="email"
                  autocomplete="email"
                  [error]="emailError()"
                  [prefixIcon]="emailIcon"
                ></pg-input>
              </div>
            </div>

            <div class="form-row-2col">
              <div class="form-group">
                <pg-input
                  label="Mật khẩu"
                  placeholder="Tạo mật khẩu..."
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
                  label="Xác nhận mật khẩu"
                  placeholder="Nhập lại mật khẩu..."
                  formControlName="confirmPassword"
                  type="password"
                  autocomplete="new-password"
                  [error]="confirmPasswordError()"
                  [prefixIcon]="lockIcon"
                  [showPasswordToggle]="true"
                ></pg-input>
              </div>
            </div>

            <div class="form-options">
              <label class="checkbox-wrapper">
                <input type="checkbox" formControlName="agreeTerms" />
                <span class="checkbox-custom"></span>
                <span class="checkbox-label">Tôi đồng ý với <a href="javascript:void(0)" class="link-terms">Điều khoản sử dụng PayGate</a></span>
              </label>
            </div>

            <button
              type="submit"
              class="btn-pink-primary pulse-glow"
              [disabled]="form.invalid || loading()"
            >
              <span *ngIf="!loading()" class="btn-text-content">
                Tạo Tài Khoản Ví Ngay ↗
              </span>
              <span *ngIf="loading()" class="btn-text-content">
                <span class="btn-spinner"></span>
                Đang tạo tài khoản...
              </span>
            </button>

            <!-- Error Banner -->
            <div class="error-banner mt-12" *ngIf="submitError()">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" />
                <line x1="12" y1="16" x2="12.01" y2="17" />
              </svg>
              <span>{{ submitError() }}</span>
            </div>
          </form>

          <div class="form-panel-footer mt-24">
            <p>Đã có tài khoản Ví PayGate? <a routerLink="/login" class="link-pink">Đăng nhập tại đây ➔</a></p>
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

    .auth-form-content { display: flex; flex-direction: column; gap: 14px; }
    .form-row-2col { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .form-group { display: flex; flex-direction: column; }

    .form-options { display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem; margin-top: 4px; }
    .checkbox-wrapper { display: flex; align-items: center; gap: 8px; cursor: pointer; }
    .checkbox-wrapper input { display: none; }
    .checkbox-custom { width: 18px; height: 18px; border: 1.5px solid #cbd5e1; border-radius: 5px; display: inline-block; position: relative; transition: all 0.15s; }
    .checkbox-wrapper input:checked + .checkbox-custom { background: #c20067; border-color: #c20067; }
    .checkbox-wrapper input:checked + .checkbox-custom::after { content: '✓'; color: #fff; position: absolute; top: -1px; left: 4px; font-size: 12px; font-weight: 900; }
    .checkbox-label { color: #475569; font-weight: 600; }
    .link-terms { color: #c20067; text-decoration: none; font-weight: 700; }

    /* Unified Pink Primary Button */
    .btn-pink-primary {
      height: 48px; width: 100%; border: none; border-radius: 12px;
      background: linear-gradient(135deg, #c20067 0%, #0072ce 100%);
      color: #ffffff; font-weight: 900; font-size: 0.95rem; cursor: pointer;
      box-shadow: 0 8px 22px rgba(194, 0, 103, 0.25); transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      margin-top: 6px;
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
      .form-row-2col { grid-template-columns: 1fr; gap: 14px; }
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
    confirmPassword: ['', [Validators.required]],
    agreeTerms: [true, [Validators.requiredTrue]]
  });

  userIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
  emailIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>`;
  lockIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>`;

  fullNameError = computed(() => {
    const ctrl = this.form.get('fullName');
    if (ctrl?.touched && ctrl?.errors) {
      if (ctrl.errors['required']) return 'Họ và tên là bắt buộc';
    }
    return '';
  });

  usernameError = computed(() => {
    const ctrl = this.form.get('username');
    if (ctrl?.touched && ctrl?.errors) {
      if (ctrl.errors['required']) return 'Tên đăng nhập là bắt buộc';
      if (ctrl.errors['minlength']) return 'Tên đăng nhập tối thiểu 3 ký tự';
    }
    return '';
  });

  emailError = computed(() => {
    const ctrl = this.form.get('email');
    if (ctrl?.touched && ctrl?.errors) {
      if (ctrl.errors['required']) return 'Email là bắt buộc';
      if (ctrl.errors['email']) return 'Email không hợp lệ';
    }
    return '';
  });

  passwordError = computed(() => {
    const ctrl = this.form.get('password');
    if (ctrl?.touched && ctrl?.errors) {
      if (ctrl.errors['required']) return 'Mật khẩu là bắt buộc';
      if (ctrl.errors['minlength']) return 'Mật khẩu tối thiểu 6 ký tự';
    }
    return '';
  });

  confirmPasswordError = computed(() => {
    const ctrl = this.form.get('confirmPassword');
    const pass = this.form.get('password')?.value;
    if (ctrl?.touched) {
      if (ctrl.errors?.['required']) return 'Xác nhận mật khẩu là bắt buộc';
      if (ctrl.value !== pass) return 'Mật khẩu nhập lại không khớp';
    }
    return '';
  });

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const val = this.form.value;
    if (val.password !== val.confirmPassword) {
      this.submitError.set('Mật khẩu xác nhận không khớp');
      return;
    }

    this.loading.set(true);
    this.submitError.set(null);

    this.authService.register({
      username: val.username!,
      email: val.email!,
      password: val.password!,
      fullName: val.fullName!
    }).subscribe({
      next: (res: any) => {
        this.loading.set(false);
        if (res.success) {
          this.notificationService.success('Đăng ký tài khoản Ví thành công!');
          this.router.navigate(['/accounts/dashboard']);
        } else {
          this.submitError.set(res.message || 'Đăng ký thất bại.');
        }
      },
      error: (err: any) => {
        this.loading.set(false);
        const msg = err.error?.message || 'Đăng ký không thành công. Vui lòng thử lại.';
        this.submitError.set(msg);
      }
    });
  }
}