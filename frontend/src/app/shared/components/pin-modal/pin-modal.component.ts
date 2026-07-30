import { Component, EventEmitter, Input, Output, signal, HostListener, inject, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OtpService } from '../../../core/services/otp.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-pin-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="pin-modal-overlay" *ngIf="isOpen">
      <div class="pin-modal-card" [class.shake-error]="isError()">
        <button class="btn-close-modal" (click)="closeModal()">✕</button>

        <div class="pin-header">
          <div class="otp-badge-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
          </div>
          <h3 class="pin-title">{{ title }}</h3>
          <p class="pin-subtitle">A 6-digit OTP has been sent to your email</p>
        </div>

        <!-- OTP Status Message Banner -->
        <div class="otp-sent-banner" *ngIf="otpMessage()">
          <span class="banner-icon">📩</span>
          <div class="banner-text">{{ otpMessage() }}</div>
        </div>

        <div class="otp-sent-banner loading-banner" *ngIf="isSendingOtp() && !otpMessage()">
          <span class="banner-icon">⏳</span>
          <div class="banner-text">Creating and sending OTP to email...</div>
        </div>

        <!-- 6-Digit Real Number Boxes Display -->
        <div class="otp-boxes-container">
          <div
            *ngFor="let i of [0,1,2,3,4,5]"
            class="otp-box"
            [class.active]="digits().length === i"
            [class.filled]="digits().length > i"
          >
            <span class="otp-num-val" *ngIf="digits().length > i">{{ digits()[i] }}</span>
            <span class="otp-cursor" *ngIf="digits().length === i"></span>
          </div>
        </div>

        <div class="error-msg" *ngIf="errorMessage()">⚠️ {{ errorMessage() }}</div>

        <!-- Keypad Numbers -->
        <div class="keypad-grid">
          <button *ngFor="let num of [1,2,3,4,5,6,7,8,9]" class="keypad-btn" (click)="appendDigit(num)">
            {{ num }}
          </button>
          <button class="keypad-btn btn-action" (click)="clearDigits()">C</button>
          <button class="keypad-btn" (click)="appendDigit(0)">0</button>
          <button class="keypad-btn btn-action" (click)="deleteDigit()">⌫</button>
        </div>

        <!-- Resend OTP Button -->
        <div class="resend-otp-box">
          <button
            class="btn-resend-otp"
            [disabled]="resendCountdown() > 0 || isSendingOtp()"
            (click)="requestEmailOtp()"
          >
            {{ isSendingOtp() ? 'Sending email...' : (resendCountdown() > 0 ? ('Resend OTP (' + resendCountdown() + 's)') : '🔄 Resend new OTP') }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .pin-modal-overlay {
      position: fixed; inset: 0;
      background: rgba(15, 23, 42, 0.65);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      z-index: 99999;
      display: flex; align-items: center; justify-content: center;
      padding: 20px; box-sizing: border-box;
    }
    .pin-modal-card {
      background: #ffffff;
      border: 1.5px solid #f3d6e5;
      border-radius: 28px; padding: 36px 32px;
      max-width: 440px; width: 100%;
      box-shadow: 0 25px 60px rgba(194, 0, 103, 0.15);
      position: relative;
      animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) both;
    }
    @keyframes slideUp { from { opacity: 0; transform: translateY(24px) scale(0.96); } to { opacity: 1; transform: translateY(0) scale(1); } }
    .shake-error { animation: shake 0.4s ease; }
    @keyframes shake { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-8px)} 40%,80%{transform:translateX(8px)} }

    .btn-close-modal {
      position: absolute; top: 18px; right: 18px;
      background: #f1f5f9; border: none; color: #64748b;
      width: 34px; height: 34px; border-radius: 50%; cursor: pointer;
      font-size: 14px; font-weight: 800;
      display: flex; align-items: center; justify-content: center;
      transition: all 0.2s;
    }
    .btn-close-modal:hover { background: #fee2e2; color: #ef4444; }

    .pin-header { text-align: center; margin-bottom: 22px; display: flex; flex-direction: column; align-items: center; }
    .otp-badge-icon {
      width: 52px; height: 52px; border-radius: 16px;
      background: #fff0f6; border: 1px solid #f8bbd0;
      color: #c20067; display: flex; align-items: center; justify-content: center;
      margin-bottom: 12px; box-shadow: 0 4px 14px rgba(194, 0, 103, 0.12);
    }
    .pin-title { font-size: 1.35rem; font-weight: 900; color: #0d2b5c; margin: 0 0 6px; letter-spacing: -0.01em; }
    .pin-subtitle { font-size: 0.88rem; color: #64748b; margin: 0; line-height: 1.4; }

    .otp-sent-banner {
      display: flex; align-items: center; gap: 10px;
      background: #fff0f6; border: 1px solid #f8bbd0;
      border-radius: 12px; padding: 10px 14px; margin-bottom: 20px;
    }
    .loading-banner { background: #eff6ff; border-color: #bfdbfe; }
    .banner-icon { font-size: 18px; }
    .banner-text { font-size: 0.82rem; color: #0d2b5c; font-weight: 700; line-height: 1.4; }

    /* 6-Digit Real Number Boxes */
    .otp-boxes-container {
      display: flex; gap: 10px; justify-content: center; margin-bottom: 22px;
    }
    .otp-box {
      width: 48px; height: 56px; border-radius: 14px;
      border: 2px solid #e2e8f0; background: #fffafd;
      display: flex; align-items: center; justify-content: center;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      position: relative;
    }
    .otp-box.active {
      border-color: #c20067; background: #ffffff;
      box-shadow: 0 0 0 4px rgba(194, 0, 103, 0.15);
      transform: translateY(-2px);
    }
    .otp-box.filled {
      border-color: #c20067; background: #ffffff;
      box-shadow: 0 4px 12px rgba(194, 0, 103, 0.12);
    }
    .otp-num-val {
      font-size: 1.6rem; font-weight: 900; color: #0d2b5c;
      animation: numPop 0.15s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes numPop { 0% { transform: scale(0.6); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }

    .otp-cursor {
      width: 2px; height: 22px; background: #c20067;
      animation: blinkCursor 0.8s infinite;
    }
    @keyframes blinkCursor { 0%,100%{opacity:1} 50%{opacity:0} }

    .error-msg { color: #dc2626; font-size: 0.85rem; font-weight: 800; text-align: center; margin-bottom: 16px; }

    /* Keypad Grid */
    .keypad-grid {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 20px;
    }
    .keypad-btn {
      background: #f8fafc; border: 1.5px solid #e2e8f0;
      color: #0d2b5c; font-size: 1.35rem; font-weight: 800; height: 54px; border-radius: 14px;
      cursor: pointer; transition: all 0.15s; user-select: none;
    }
    .keypad-btn:hover {
      background: #fff0f6; border-color: #f8bbd0; color: #c20067;
      transform: translateY(-1px); box-shadow: 0 4px 12px rgba(194, 0, 103, 0.1);
    }
    .keypad-btn:active { transform: translateY(1px); }
    .keypad-btn.btn-action { color: #64748b; font-size: 1.1rem; background: #f1f5f9; }
    .keypad-btn.btn-action:hover { background: #fee2e2; color: #ef4444; border-color: #fca5a5; }

    /* Resend OTP Button */
    .resend-otp-box { text-align: center; }
    .btn-resend-otp {
      background: transparent; border: none; color: #c20067;
      font-size: 0.88rem; font-weight: 800; cursor: pointer; padding: 6px 12px;
      border-radius: 8px; transition: all 0.15s;
    }
    .btn-resend-otp:hover:not(:disabled) { text-decoration: underline; background: #fff0f6; }
    .btn-resend-otp:disabled { color: #94a3b8; cursor: not-allowed; text-decoration: none; }
  `]
})
export class PinModalComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() title = 'OTP Verification';
  @Input() pinLength = 6;
  @Input() userEmail: string | null = null;
  @Output() confirmed = new EventEmitter<string>();
  @Output() pinComplete = new EventEmitter<string>();
  @Output() cancelled = new EventEmitter<void>();

  private otpService = inject(OtpService);
  private notificationService = inject(NotificationService);

  digits = signal<number[]>([]);
  isError = signal(false);
  errorMessage = signal<string | null>(null);
  otpMessage = signal<string | null>(null);
  isSendingOtp = signal(false);
  resendCountdown = signal(0);

  private countdownTimer: any = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && this.isOpen) {
      this.resetModal();
      this.requestEmailOtp();
    }
  }

  requestEmailOtp(): void {
    this.isSendingOtp.set(true);
    this.otpMessage.set(null);
    this.errorMessage.set(null);

    this.otpService.sendOtp(this.userEmail || undefined).subscribe({
      next: (res: any) => {
        this.isSendingOtp.set(false);
        if (res.success) {
          this.otpMessage.set(res.message || 'OTP has been sent to your email.');
          this.startResendCountdown(60);
        } else {
          this.errorMessage.set(res.message || 'Unable to send OTP.');
        }
      },
      error: (err: any) => {
        this.isSendingOtp.set(false);
        const msg = err.error?.message || 'Connection error while sending OTP.';
        this.errorMessage.set(msg);
      }
    });
  }

  private startResendCountdown(seconds: number): void {
    this.resendCountdown.set(seconds);
    if (this.countdownTimer) clearInterval(this.countdownTimer);
    this.countdownTimer = setInterval(() => {
      const cur = this.resendCountdown();
      if (cur <= 1) {
        clearInterval(this.countdownTimer);
        this.resendCountdown.set(0);
      } else {
        this.resendCountdown.set(cur - 1);
      }
    }, 1000);
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent): void {
    if (!this.isOpen) return;

    if (event.key >= '0' && event.key <= '9') {
      this.appendDigit(parseInt(event.key, 10));
    } else if (event.key === 'Backspace') {
      this.deleteDigit();
    } else if (event.key === 'Escape') {
      this.closeModal();
    }
  }

  appendDigit(num: number): void {
    if (this.digits().length >= this.pinLength) return;
    this.isError.set(false);
    this.errorMessage.set(null);

    const next = [...this.digits(), num];
    this.digits.set(next);

    if (next.length === this.pinLength) {
      const otpCode = next.join('');
      this.verifyOtp(otpCode);
    }
  }

  verifyOtp(code: string): void {
    this.otpService.verifyOtp(code).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.confirmed.emit(code);
          this.pinComplete.emit(code);
        } else {
          this.handleVerifyFailure(res.message || 'Invalid OTP code');
        }
      },
      error: (err: any) => {
        const msg = err.error?.message || 'OTP is invalid or expired';
        this.handleVerifyFailure(msg);
      }
    });
  }

  private handleVerifyFailure(msg: string): void {
    this.isError.set(true);
    this.errorMessage.set(msg);
    setTimeout(() => {
      this.isError.set(false);
      this.digits.set([]);
    }, 600);
  }

  deleteDigit(): void {
    if (this.digits().length > 0) {
      this.digits.set(this.digits().slice(0, -1));
      this.isError.set(false);
      this.errorMessage.set(null);
    }
  }

  clearDigits(): void {
    this.digits.set([]);
    this.isError.set(false);
    this.errorMessage.set(null);
  }

  closeModal(): void {
    this.isOpen = false;
    this.cancelled.emit();
    this.resetModal();
  }

  private resetModal(): void {
    this.digits.set([]);
    this.isError.set(false);
    this.errorMessage.set(null);
    this.otpMessage.set(null);
    if (this.countdownTimer) clearInterval(this.countdownTimer);
    this.resendCountdown.set(0);
  }
}
