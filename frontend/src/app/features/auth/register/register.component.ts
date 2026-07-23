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
    <div class="auth-card-container fade-in-up">
      <div class="auth-glass-card">
        <!-- Header -->
        <div class="auth-card-header">
          <div class="auth-header-icon-box">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <h1 class="auth-card-title">Create account</h1>
          <p class="auth-card-subtitle">Join PayGate to manage your digital wallet seamlessly</p>
        </div>

        <!-- Registration Form -->
        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="auth-form">
          <pg-input
            label="Username"
            placeholder="Choose a username"
            formControlName="username"
            type="text"
            autocomplete="username"
            [error]="usernameError()"
            [prefixIcon]="userIcon"
          ></pg-input>

          <pg-input
            label="Email"
            placeholder="Enter your email address"
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
            placeholder="Create a strong password"
            formControlName="password"
            type="password"
            autocomplete="new-password"
            [error]="passwordError()"
            [prefixIcon]="lockIcon"
            [showPasswordToggle]="true"
          ></pg-input>

          <pg-input
            label="Confirm Password"
            placeholder="Re-enter your password"
            formControlName="confirmPassword"
            type="password"
            autocomplete="new-password"
            [error]="confirmPasswordError()"
            [prefixIcon]="lockIcon"
            [showPasswordToggle]="true"
          ></pg-input>

          <!-- Terms Checkbox -->
          <div class="auth-form-terms">
            <label class="checkbox-wrapper">
              <input type="checkbox" formControlName="terms" required />
              <span class="checkbox-custom"></span>
              <span class="checkbox-label">
                I agree to the <a href="#" class="terms-link">Terms of Service</a> and <a href="#" class="terms-link">Privacy Policy</a>
              </span>
            </label>
          </div>

          <!-- Submit Button -->
          <button
            type="submit"
            class="btn-submit-emerald"
            [disabled]="form.invalid || loading()"
          >
            <span *ngIf="!loading()">Create PayGate Account</span>
            <span *ngIf="loading()" class="loading-spinner-wrapper">
              <span class="btn-spinner"></span>
              <span>Creating account...</span>
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
            Already have an account?
            <a routerLink="/login" class="auth-footer-link">Sign in here</a>
          </p>
        </div>
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
      max-width: 460px;
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
    }

    .dark .auth-glass-card {
      background: rgba(15, 23, 42, 0.92);
      border-color: rgba(51, 65, 85, 0.8);
      box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.5);
    }

    /* Card Header */
    .auth-card-header {
      padding: 28px 32px 18px;
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
      margin-bottom: 14px;
      box-shadow: 0 4px 12px rgba(5, 150, 105, 0.15);
    }

    .auth-header-icon-box svg {
      width: 24px;
      height: 24px;
    }

    .auth-card-title {
      font-size: 1.55rem;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 4px 0;
      letter-spacing: -0.02em;
    }

    .dark .auth-card-title {
      color: #f8fafc;
    }

    .auth-card-subtitle {
      font-size: 0.85rem;
      color: #64748b;
      margin: 0;
    }

    /* Auth Form */
    .auth-form {
      padding: 0 32px 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    /* Terms */
    .auth-form-terms {
      margin-top: 2px;
    }

    .checkbox-wrapper {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      cursor: pointer;
      font-size: 0.825rem;
      color: #475569;
      line-height: 1.4;
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
      margin-top: 1px;
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

    .terms-link {
      color: #059669;
      font-weight: 600;
      text-decoration: none;
    }

    .terms-link:hover {
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
      margin-top: 4px;
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