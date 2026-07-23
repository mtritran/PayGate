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
    <div class="auth-card-container">
      <pg-card variant="elevated" class="auth-card">
        <!-- Header -->
        <div class="auth-card-header">
          <h1 class="auth-card-title">Welcome back</h1>
          <p class="auth-card-subtitle">Sign in to your PayGate account</p>
        </div>

        <!-- Form -->
        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="auth-form">
          <pg-input
            label="Username or Email"
            placeholder="Enter your username or email"
            formControlName="username"
            type="text"
            autocomplete="username"
            [error]="usernameError()"
            [prefixIcon]="userIcon"
          ></pg-input>

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

          <pg-button
            variant="primary"
            size="lg"
            [block]="true"
            type="submit"
            [loading]="loading()"
            [disabled]="form.invalid"
            loadingText="Signing in..."
          >
            Sign In
          </pg-button>

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
            <a routerLink="/register" class="auth-footer-link">Create one</a>
          </p>
        </div>
      </pg-card>

      <!-- Demo credentials hint -->
      <div class="auth-demo-hint" *ngIf="!loading()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
        <span>Demo: admin / Admin&#64;123456!</span>
      </div>
    </div>
  `,
  styles: [`
    .auth-card-container {
      width: 100%;
      max-width: 440px;
      animation: fadeInUp 0.5s ease-out;
    }

    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .auth-card {
      padding: 0;
      overflow: hidden;
    }

    .auth-card-header {
      padding: var(--space-8) var(--space-8) var(--space-4);
      text-align: center;
      border-bottom: 1px solid var(--color-border-primary);
    }

    .auth-card-title {
      font-size: var(--font-size-2xl);
      font-weight: var(--font-weight-bold);
      color: var(--color-text-primary);
      margin: 0 0 var(--space-2);
    }

    .auth-card-subtitle {
      font-size: var(--font-size-sm);
      color: var(--color-text-tertiary);
      margin: 0;
    }

    .auth-form {
      padding: var(--space-6) var(--space-8);
      display: flex;
      flex-direction: column;
      gap: var(--space-5);
    }

    :host ::ng-deep .form-field {
      margin-bottom: 0;
    }

    .auth-form-options {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: var(--space-2);
    }

    .checkbox-wrapper {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      cursor: pointer;
      font-size: var(--font-size-sm);
      color: var(--color-text-secondary);
    }

    .checkbox-wrapper input {
      position: absolute;
      opacity: 0;
      pointer-events: none;
    }

    .checkbox-custom {
      width: 18px;
      height: 18px;
      border: 2px solid var(--color-border-primary);
      border-radius: var(--radius-sm);
      background-color: var(--color-bg-secondary);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all var(--transition-fast);
      flex-shrink: 0;
    }

    .checkbox-wrapper input:checked + .checkbox-custom {
      background-color: var(--color-primary-500);
      border-color: var(--color-primary-500);
    }

    .checkbox-wrapper input:focus-visible + .checkbox-custom {
      box-shadow: 0 0 0 3px var(--color-primary-100);
    }

    .dark .checkbox-wrapper input:focus-visible + .checkbox-custom {
      box-shadow: 0 0 0 3px var(--color-primary-900);
    }

    .checkbox-custom::after {
      content: '';
      width: 5px;
      height: 9px;
      border: solid white;
      border-width: 0 2px 2px 0;
      transform: rotate(45deg) translateY(-1px);
      opacity: 0;
      transition: opacity var(--transition-fast);
    }

    .checkbox-wrapper input:checked + .checkbox-custom::after {
      opacity: 1;
    }

    .checkbox-label {
      user-select: none;
    }

    .forgot-password-link {
      font-size: var(--font-size-sm);
      color: var(--color-text-brand);
      text-decoration: none;
      font-weight: var(--font-weight-medium);
      transition: color var(--transition-fast);
    }

    .forgot-password-link:hover {
      color: var(--color-primary-700);
      text-decoration: underline;
    }

    .dark .forgot-password-link:hover {
      color: var(--color-primary-300);
    }

    .auth-form-error {
      display: flex;
      align-items: flex-start;
      gap: var(--space-2);
      padding: var(--space-3) var(--space-4);
      background-color: var(--color-error-50);
      border: 1px solid var(--color-error-200);
      border-radius: var(--radius-md);
      color: var(--color-error-700);
      font-size: var(--font-size-sm);
    }

    .dark .auth-form-error {
      background-color: var(--color-error-900);
      border-color: var(--color-error-800);
      color: var(--color-error-300);
    }

    .auth-form-error svg {
      width: 18px;
      height: 18px;
      flex-shrink: 0;
      margin-top: 2px;
    }

    .auth-card-footer {
      padding: var(--space-5) var(--space-8);
      border-top: 1px solid var(--color-border-primary);
      background-color: var(--color-bg-tertiary);
    }

    .auth-footer-text {
      text-align: center;
      font-size: var(--font-size-sm);
      color: var(--color-text-secondary);
      margin: 0;
    }

    .auth-footer-link {
      color: var(--color-text-brand);
      font-weight: var(--font-weight-semibold);
      text-decoration: none;
      transition: color var(--transition-fast);
    }

    .auth-footer-link:hover {
      color: var(--color-primary-700);
      text-decoration: underline;
    }

    .dark .auth-footer-link:hover {
      color: var(--color-primary-300);
    }

    .auth-demo-hint {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-2);
      padding: var(--space-4);
      font-size: var(--font-size-xs);
      color: var(--color-text-tertiary);
      background-color: var(--color-bg-tertiary);
      border-radius: var(--radius-md);
      margin: var(--space-4) var(--space-8) var(--space-8);
    }

    .auth-demo-hint svg {
      width: 14px;
      height: 14px;
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