import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { InputComponent, ButtonComponent, CardComponent } from '../../../shared/components';

@Component({
  selector: 'app-register',
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
          <h1 class="auth-card-title">Create account</h1>
          <p class="auth-card-subtitle">Join PayGate and start managing your wallet</p>
        </div>

        <!-- Form -->
        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="auth-form">
          <pg-input
            label="Username"
            placeholder="Choose a username"
            formControlName="username"
            type="text"
            autocomplete="username"
            [error]="usernameError()"
            [prefixIcon]="userIcon"
            [helperText]="usernameHelper()"
          ></pg-input>

          <pg-input
            label="Email"
            placeholder="Enter your email"
            formControlName="email"
            type="email"
            autocomplete="email"
            [error]="emailError()"
            [prefixIcon]="emailIcon"
          ></pg-input>

          <pg-input
            label="Full Name"
            placeholder="Enter your full name"
            formControlName="fullName"
            type="text"
            autocomplete="name"
            [error]="fullNameError()"
            [prefixIcon]="nameIcon"
          ></pg-input>

          <pg-input
            label="Password"
            placeholder="Create a password"
            formControlName="password"
            type="password"
            autocomplete="new-password"
            [error]="passwordError()"
            [prefixIcon]="lockIcon"
            [showPasswordToggle]="true"
            [helperText]="passwordHelper()"
          ></pg-input>

          <pg-input
            label="Confirm Password"
            placeholder="Confirm your password"
            formControlName="confirmPassword"
            type="password"
            autocomplete="new-password"
            [error]="confirmPasswordError()"
            [prefixIcon]="lockIcon"
            [showPasswordToggle]="true"
          ></pg-input>

          <div class="auth-form-terms">
            <label class="checkbox-wrapper">
              <input type="checkbox" formControlName="terms" required />
              <span class="checkbox-custom"></span>
              <span class="checkbox-label">
                I agree to the <a href="#" class="terms-link">Terms of Service</a> and <a href="#" class="terms-link">Privacy Policy</a>
              </span>
            </label>
          </div>

          <pg-button
            variant="primary"
            size="lg"
            [block]="true"
            type="submit"
            [loading]="loading()"
            [disabled]="form.invalid"
            loadingText="Creating account..."
          >
            Create Account
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
            Already have an account?
            <a routerLink="/login" class="auth-footer-link">Sign in</a>
          </p>
        </div>
      </pg-card>
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

    .auth-form-terms {
      margin-top: var(--space-2);
    }

    .checkbox-wrapper {
      display: flex;
      align-items: flex-start;
      gap: var(--space-2);
      cursor: pointer;
      font-size: var(--font-size-sm);
      color: var(--color-text-secondary);
      line-height: 1.5;
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
      margin-top: 2px;
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

    .terms-link {
      color: var(--color-text-brand);
      text-decoration: none;
      font-weight: var(--font-weight-medium);
    }

    .terms-link:hover {
      text-decoration: underline;
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

  // Icons
  userIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>`;
  emailIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>`;
  nameIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>`;
  lockIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>`;

  usernameError = computed(() => {
    const control = this.form.get('username');
    if (control?.invalid && (control?.dirty || control?.touched)) {
      if (control?.errors?.['required']) return 'Username is required';
      if (control?.errors?.['minlength']) return 'Username must be at least 3 characters';
      if (control?.errors?.['maxlength']) return 'Username must be at most 50 characters';
    }
    return '';
  });

  usernameHelper = computed(() => {
    return '3-50 characters, letters, numbers, underscores';
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
      if (control?.errors?.['minlength']) return 'Full name must be at least 2 characters';
      if (control?.errors?.['maxlength']) return 'Full name must be at most 100 characters';
    }
    return '';
  });

  passwordError = computed(() => {
    const control = this.form.get('password');
    if (control?.invalid && (control?.dirty || control?.touched)) {
      if (control?.errors?.['required']) return 'Password is required';
      if (control?.errors?.['minlength']) return 'Password must be at least 6 characters';
      if (control?.errors?.['maxlength']) return 'Password must be at most 100 characters';
    }
    return '';
  });

  passwordHelper = computed(() => {
    return 'At least 6 characters';
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
        this.submitError.set(err.error?.message || 'Registration failed. Please try again.');
      }
    });
  }
}