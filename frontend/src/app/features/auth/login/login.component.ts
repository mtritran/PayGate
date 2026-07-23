import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { InputComponent, ButtonComponent, CardComponent } from '../../../shared/components';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    InputComponent,
    ButtonComponent,
    CardComponent
  ],
  template: `
    <div class="auth-card-container fade-in-up">
      <div class="auth-glass-card">
        <!-- Card Top Icon & Title Header -->
        <div class="auth-card-header">
          <div class="auth-header-icon-box">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <h1 class="auth-card-title">Welcome back</h1>
          <p class="auth-card-subtitle">Sign in to access your PayGate wallet & payments</p>
        </div>

        <!-- Login Form -->
        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="auth-form">
          <div class="form-field-group">
            <pg-input
              label="Username or Email"
              placeholder="Enter your username or email"
              formControlName="username"
              type="text"
              autocomplete="username"
              [error]="usernameError()"
              [prefixIcon]="userIcon"
            ></pg-input>
          </div>

          <div class="form-field-group">
            <pg-input
              label="Password"
              placeholder="Enter your password"
              formControlName="password"
              type="password"
              autocomplete="current-password"
              [error]="passwordError()"
              [prefixIcon]="lockIcon"
              [showPasswordToggle]="true"
            ></pg-input>
          </div>

          <!-- Options Row (Remember Me + Forgot Password) -->
          <div class="auth-form-options">
            <label class="checkbox-wrapper">
              <input type="checkbox" formControlName="rememberMe" />
              <span class="checkbox-custom"></span>
              <span class="checkbox-label">Remember me</span>
            </label>

            <a routerLink="/auth/forgot-password" class="forgot-password-link">
              Forgot password?
            </a>
          </div>

          <!-- Submit Button -->
          <button
            type="submit"
            class="btn-submit-emerald"
            [disabled]="form.invalid || loading()"
          >
            <span *ngIf="!loading()">Sign In to PayGate</span>
            <span *ngIf="loading()" class="loading-spinner-wrapper">
              <span class="btn-spinner"></span>
              <span>Signing in...</span>
            </span>
          </button>

          <!-- Error Alert Banner -->
          <div class="auth-form-error" *ngIf="submitError()" role="alert">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{{ submitError() }}</span>
          </div>
        </form>

        <!-- Footer -->
        <div class="auth-card-footer">
          <p class="auth-footer-text">
            Don't have an account?
            <a routerLink="/register" class="auth-footer-link">Create one now ↗</a>
          </p>
        </div>
      </div>

      <!-- Quick Fill Demo Credentials Hint Badge -->
      <div class="auth-demo-badge" (click)="fillDemoCredentials()">
        <div class="demo-badge-left">
          <span class="demo-dot"></span>
          <span class="demo-title">Quick Demo Login:</span>
          <code class="demo-code">user / password</code>
        </div>
        <span class="demo-action">Click to fill ⚡</span>
      </div>
    </div>
  `,
  styles: [`
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(16px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .fade-in-up { animation: fadeInUp 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards; }

    .auth-card-container {
      width: 100%;
      max-width: 440px;
      margin: 0 auto;
      font-family: 'Inter', system-ui, sans-serif;
    }

    /* Glassmorphism Card Design */
    .auth-glass-card {
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(226, 232, 240, 0.8);
      border-radius: 20px;
      box-shadow: 0 20px 40px -15px rgba(15, 23, 42, 0.08), 0 0 0 1px rgba(16, 185, 129, 0.05);
      overflow: hidden;
      transition: all 0.3s ease;
    }

    .dark .auth-glass-card {
      background: rgba(15, 23, 42, 0.92);
      border-color: rgba(51, 65, 85, 0.8);
      box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.5);
    }

    /* Card Header */
    .auth-card-header {
      padding: 32px 32px 20px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .auth-header-icon-box {
      width: 48px;
      height: 48px;
      border-radius: 14px;
      background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
      color: #059669;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 16px;
      box-shadow: 0 4px 12px rgba(5, 150, 105, 0.15);
    }

    .auth-header-icon-box svg {
      width: 24px;
      height: 24px;
    }

    .auth-card-title {
      font-size: 1.6rem;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 6px 0;
      letter-spacing: -0.02em;
    }

    .dark .auth-card-title {
      color: #f8fafc;
    }

    .auth-card-subtitle {
      font-size: 0.875rem;
      color: #64748b;
      margin: 0;
    }

    /* Auth Form */
    .auth-form {
      padding: 0 32px 28px;
      display: flex;
      flex-direction: column;
      gap: 18px;
    }

    .form-field-group {
      display: flex;
      flex-direction: column;
    }

    /* Options Row */
    .auth-form-options {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: 4px;
      margin-bottom: 4px;
    }

    .checkbox-wrapper {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      font-size: 0.85rem;
      color: #475569;
      user-select: none;
    }

    .checkbox-wrapper input {
      position: absolute;
      opacity: 0;
      pointer-events: none;
    }

    .checkbox-custom {
      width: 18px;
      height: 18px;
      border: 1.5px solid #cbd5e1;
      border-radius: 5px;
      background-color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      flex-shrink: 0;
    }

    .checkbox-wrapper input:checked + .checkbox-custom {
      background-color: #059669;
      border-color: #059669;
    }

    .checkbox-custom::after {
      content: '';
      width: 4px;
      height: 8px;
      border: solid white;
      border-width: 0 2px 2px 0;
      transform: rotate(45deg) translateY(-1px);
      opacity: 0;
      transition: opacity 0.15s;
    }

    .checkbox-wrapper input:checked + .checkbox-custom::after {
      opacity: 1;
    }

    .forgot-password-link {
      font-size: 0.85rem;
      color: #059669;
      text-decoration: none;
      font-weight: 600;
      transition: color 0.15s;
    }

    .forgot-password-link:hover {
      color: #047857;
      text-decoration: underline;
    }

    /* Vibrant Emerald Button */
    .btn-submit-emerald {
      width: 100%;
      height: 46px;
      border: none;
      border-radius: 12px;
      background: linear-gradient(135deg, #059669 0%, #047857 100%);
      color: #ffffff;
      font-size: 0.95rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      box-shadow: 0 4px 14px rgba(5, 150, 105, 0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-top: 6px;
    }

    .btn-submit-emerald:hover:not(:disabled) {
      transform: translateY(-1.5px);
      box-shadow: 0 6px 18px rgba(5, 150, 105, 0.4);
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    }

    .btn-submit-emerald:disabled {
      opacity: 0.65;
      cursor: not-allowed;
      box-shadow: none;
    }

    .loading-spinner-wrapper {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .btn-spinner {
      width: 18px;
      height: 18px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: #ffffff;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }

    /* Form Error Banner */
    .auth-form-error {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 14px;
      background-color: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 10px;
      color: #dc2626;
      font-size: 0.825rem;
      font-weight: 500;
    }

    .auth-form-error svg {
      width: 16px;
      height: 16px;
      flex-shrink: 0;
    }

    /* Card Footer */
    .auth-card-footer {
      padding: 16px 32px;
      background-color: #f8fafc;
      border-top: 1px solid #f1f5f9;
      text-align: center;
    }

    .dark .auth-card-footer {
      background-color: rgba(30, 41, 59, 0.5);
      border-color: rgba(51, 65, 85, 0.5);
    }

    .auth-footer-text {
      font-size: 0.875rem;
      color: #64748b;
      margin: 0;
    }

    .auth-footer-link {
      color: #059669;
      font-weight: 700;
      text-decoration: none;
      margin-left: 4px;
    }

    .auth-footer-link:hover {
      text-decoration: underline;
    }

    /* Demo Credentials Quick Badge */
    .auth-demo-badge {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 12px 16px;
      margin-top: 16px;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.02);
    }

    .auth-demo-badge:hover {
      border-color: #a7f3d0;
      background: #ecfdf5;
      transform: translateY(-1px);
    }

    .demo-badge-left {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .demo-dot {
      width: 8px;
      height: 8px;
      background-color: #10b981;
      border-radius: 50%;
    }

    .demo-title {
      font-size: 0.8rem;
      font-weight: 600;
      color: #475569;
    }

    .demo-code {
      font-family: monospace;
      font-size: 0.8rem;
      font-weight: 700;
      color: #059669;
      background: #f1f5f9;
      padding: 2px 6px;
      border-radius: 6px;
    }

    .demo-action {
      font-size: 0.75rem;
      font-weight: 700;
      color: #059669;
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
    username: ['', [Validators.required]],
    password: ['', [Validators.required]],
    rememberMe: [false]
  });

  // Icons
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

  fillDemoCredentials(): void {
    this.form.patchValue({
      username: 'user',
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