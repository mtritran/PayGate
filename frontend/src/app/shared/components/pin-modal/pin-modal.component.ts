import { Component, EventEmitter, Input, Output, signal, HostListener, inject, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PinService } from '../../../core/services/pin.service';
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

        <!-- Auth Mode Toggle Bar (Only when not in Setup Mode) -->
        <div class="auth-mode-toggle" *ngIf="!isSetupMode">
          <button
            class="toggle-tab"
            [class.active]="authMode() === 'PIN'"
            (click)="switchAuthMode('PIN')"
          >
            🔑 Mã PIN
          </button>
          <button
            class="toggle-tab"
            [class.active]="authMode() === 'OTP'"
            (click)="switchAuthMode('OTP')"
          >
            📧 OTP Gmail
          </button>
        </div>

        <div class="pin-header">
          <div class="lock-icon">{{ authMode() === 'PIN' ? '🔒' : '📧' }}</div>
          <h3 class="pin-title">{{ authMode() === 'OTP' ? 'Xác thực Mã OTP qua Email' : title }}</h3>
          <p class="pin-subtitle">
            {{ authMode() === 'OTP' ? 'Nhập Mã OTP 6 chữ số vừa được gửi về Gmail của bạn' : subtitle }}
          </p>
        </div>

        <!-- OTP Sent Status Banner -->
        <div class="otp-sent-banner" *ngIf="authMode() === 'OTP' && otpMessage()">
          <span class="banner-icon">📩</span>
          <div class="banner-text">{{ otpMessage() }}</div>
        </div>

        <!-- 6-digit Dots Display -->
        <div class="pin-dots-container">
          <div
            *ngFor="let i of [0,1,2,3,4,5]"
            class="pin-dot"
            [class.filled]="digits().length > i"
            [class.otp-dot]="authMode() === 'OTP'"
          ></div>
        </div>

        <div class="error-msg" *ngIf="errorMessage()">{{ errorMessage() }}</div>

        <!-- Keypad Numbers -->
        <div class="keypad-grid">
          <button *ngFor="let num of [1,2,3,4,5,6,7,8,9]" class="keypad-btn" (click)="appendDigit(num)">
            {{ num }}
          </button>
          <button class="keypad-btn btn-action" (click)="clearDigits()">C</button>
          <button class="keypad-btn" (click)="appendDigit(0)">0</button>
          <button class="keypad-btn btn-action" (click)="deleteDigit()">⌫</button>
        </div>

        <!-- Resend OTP Action for Email Mode -->
        <div class="resend-otp-box" *ngIf="authMode() === 'OTP'">
          <button
            class="btn-resend-otp"
            [disabled]="resendCountdown() > 0 || isSendingOtp()"
            (click)="requestEmailOtp()"
          >
            {{ isSendingOtp() ? 'Đang gửi Email...' : (resendCountdown() > 0 ? ('Gửi lại OTP (' + resendCountdown() + 's)') : '🔄 Gửi lại mã OTP về Gmail') }}
          </button>
        </div>

        <div class="pin-footer-note" *ngIf="isSetupMode">
          Mã PIN 6 số dùng để bảo mật cho mọi giao dịch Chuyển tiền & Thanh toán của bạn.
        </div>
      </div>
    </div>
  `,
  styles: [`
    .pin-modal-overlay {
      position: fixed; inset: 0; background: rgba(15, 23, 42, 0.7); backdrop-filter: blur(6px);
      z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 20px;
    }
    .pin-modal-card {
      background: #ffffff; width: 100%; max-width: 400px; border-radius: 28px; padding: 28px 24px;
      box-shadow: 0 25px 60px -15px rgba(0,0,0,0.3); text-align: center; position: relative;
      animation: popIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes popIn {
      from { transform: scale(0.92); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
    .shake-error {
      animation: shake 0.4s ease-in-out;
    }
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      20%, 60% { transform: translateX(-10px); }
      40%, 80% { transform: translateX(10px); }
    }

    .auth-mode-toggle {
      display: flex; background: #f1f5f9; border-radius: 14px; padding: 4px; margin-bottom: 20px; gap: 4px;
    }
    .toggle-tab {
      flex: 1; padding: 8px 12px; border: none; background: transparent; border-radius: 10px;
      font-size: 0.85rem; font-weight: 700; color: #64748b; cursor: pointer; transition: all 0.2s;
    }
    .toggle-tab.active {
      background: #ffffff; color: #4f46e5; box-shadow: 0 2px 6px rgba(0,0,0,0.06);
    }

    .btn-close-modal {
      position: absolute; top: 20px; right: 20px; background: #f1f5f9; border: none;
      width: 32px; height: 32px; border-radius: 50%; color: #64748b; font-size: 1rem;
      cursor: pointer; transition: all 0.15s; display: flex; align-items: center; justify-content: center;
    }
    .btn-close-modal:hover { background: #e2e8f0; color: #0f172a; }

    .lock-icon {
      width: 54px; height: 54px; background: #eeef2e4; color: #4f46e5; border-radius: 18px;
      font-size: 1.5rem; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px;
      border: 1px solid #c7d2fe;
    }
    .pin-title { font-size: 1.2rem; font-weight: 800; color: #0f172a; margin: 0 0 6px 0; }
    .pin-subtitle { font-size: 0.82rem; color: #64748b; margin: 0 0 20px 0; line-height: 1.4; }

    .otp-sent-banner {
      background: #e0e7ff; border: 1px solid #c7d2fe; border-radius: 14px; padding: 10px 14px;
      margin-bottom: 20px; font-size: 0.8rem; color: #3730a3; display: flex; align-items: center; gap: 8px; text-align: left;
    }
    .banner-icon { font-size: 1.2rem; }
    .banner-text { font-weight: 600; line-height: 1.35; }

    /* Dots */
    .pin-dots-container {
      display: flex; justify-content: center; gap: 14px; margin-bottom: 20px;
    }
    .pin-dot {
      width: 18px; height: 18px; border-radius: 50%; border: 2px solid #cbd5e1;
      transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .pin-dot.filled {
      background: #059669; border-color: #059669; transform: scale(1.15);
      box-shadow: 0 0 10px rgba(5,150,105,0.4);
    }
    .pin-dot.otp-dot.filled {
      background: #4f46e5; border-color: #4f46e5;
      box-shadow: 0 0 10px rgba(79,70,229,0.4);
    }

    .error-msg {
      color: #dc2626; font-size: 0.82rem; font-weight: 700; margin-bottom: 16px; min-height: 20px;
    }

    /* Keypad Grid */
    .keypad-grid {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; max-width: 280px; margin: 0 auto;
    }
    .keypad-btn {
      height: 56px; border-radius: 16px; border: 1px solid #f1f5f9; background: #f8fafc;
      font-size: 1.35rem; font-weight: 700; color: #0f172a; cursor: pointer; transition: all 0.12s;
      display: flex; align-items: center; justify-content: center; user-select: none;
    }
    .keypad-btn:hover { background: #e2e8f0; border-color: #cbd5e1; }
    .keypad-btn:active { transform: scale(0.94); background: #cbd5e1; }
    .btn-action { font-size: 1.1rem; color: #64748b; background: #ffffff; border-color: #e2e8f0; }

    .resend-otp-box { margin-top: 18px; }
    .btn-resend-otp {
      background: none; border: none; color: #4f46e5; font-size: 0.82rem; font-weight: 700;
      cursor: pointer; padding: 6px 12px; border-radius: 8px; transition: background 0.15s;
    }
    .btn-resend-otp:hover:not(:disabled) { background: #e0e7ff; }
    .btn-resend-otp:disabled { color: #94a3b8; cursor: not-allowed; }

    .pin-footer-note {
      font-size: 0.76rem; color: #94a3b8; margin-top: 20px; line-height: 1.4;
    }
  `]
})
export class PinModalComponent implements OnChanges {
  private pinService = inject(PinService);
  private otpService = inject(OtpService);
  private notification = inject(NotificationService);

  @Input() isOpen = false;
  @Input() title = 'Xác thực Mã PIN';
  @Input() subtitle = 'Nhập Mã PIN 6 số để xác nhận giao dịch';
  @Input() isSetupMode = false;

  @Output() confirmed = new EventEmitter<string>();
  @Output() cancelled = new EventEmitter<void>();

  authMode = signal<'PIN' | 'OTP'>('PIN');
  digits = signal<number[]>([]);
  isError = signal(false);
  errorMessage = signal('');

  otpMessage = signal('');
  isSendingOtp = signal(false);
  resendCountdown = signal(0);
  private timer: any;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && this.isOpen) {
      this.clearDigits();
      if (this.authMode() === 'OTP') {
        this.requestEmailOtp();
      }
    }
  }

  switchAuthMode(mode: 'PIN' | 'OTP'): void {
    this.authMode.set(mode);
    this.clearDigits();
    if (mode === 'OTP' && !this.otpMessage()) {
      this.requestEmailOtp();
    }
  }

  requestEmailOtp(): void {
    this.isSendingOtp.set(true);
    this.errorMessage.set('');

    this.otpService.sendOtp(this.title).subscribe({
      next: (res) => {
        this.isSendingOtp.set(false);
        if (res.data) {
          this.otpMessage.set(res.data.message);
          this.notification.success('Đã gửi mã OTP 6 số về Gmail của bạn!');
          this.startCountdown(60);
        }
      },
      error: (err) => {
        this.isSendingOtp.set(false);
        this.errorMessage.set(err?.error?.message || 'Không thể gửi mã OTP về Email');
      }
    });
  }

  private startCountdown(seconds: number): void {
    this.resendCountdown.set(seconds);
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => {
      if (this.resendCountdown() > 0) {
        this.resendCountdown.update(v => v - 1);
      } else {
        clearInterval(this.timer);
      }
    }, 1000);
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if (!this.isOpen) return;

    if (event.key >= '0' && event.key <= '9') {
      this.appendDigit(parseInt(event.key, 10));
    } else if (event.key === 'Backspace') {
      this.deleteDigit();
    } else if (event.key === 'Escape') {
      this.closeModal();
    }
  }

  appendDigit(digit: number): void {
    if (this.digits().length < 6) {
      this.digits.update(d => [...d, digit]);
      this.errorMessage.set('');

      if (this.digits().length === 6) {
        this.processSubmit();
      }
    }
  }

  deleteDigit(): void {
    if (this.digits().length > 0) {
      this.digits.update(d => d.slice(0, -1));
      this.errorMessage.set('');
    }
  }

  clearDigits(): void {
    this.digits.set([]);
    this.errorMessage.set('');
  }

  closeModal(): void {
    this.clearDigits();
    if (this.timer) clearInterval(this.timer);
    this.cancelled.emit();
  }

  private processSubmit(): void {
    const codeStr = this.digits().join('');

    if (this.authMode() === 'OTP') {
      // Verify OTP via Email OTP API
      this.otpService.verifyOtp(codeStr, this.title).subscribe({
        next: (res) => {
          if (res.data) {
            this.notification.success('Xác thực Mã OTP Email thành công!');
            this.confirmed.emit(codeStr);
            this.clearDigits();
          } else {
            this.triggerError('Mã OTP không chính xác. Vui lòng kiểm tra Gmail.');
          }
        },
        error: (err) => {
          this.triggerError(err?.error?.message || 'Mã OTP không chính xác hoặc đã hết hạn.');
        }
      });
      return;
    }
    
    if (this.isSetupMode) {
      // In setup mode, pass codeStr directly back
      this.confirmed.emit(codeStr);
      this.clearDigits();
      return;
    }

    // Verify PIN mode via Backend API
    this.pinService.verifyPin(codeStr).subscribe({
      next: (res) => {
        if (res.data) {
          this.confirmed.emit(codeStr);
          this.clearDigits();
        } else {
          this.triggerError('Mã PIN giao dịch không chính xác');
        }
      },
      error: (err) => {
        this.triggerError(err?.error?.message || 'Mã PIN giao dịch không chính xác');
      }
    });
  }

  private triggerError(msg: string): void {
    this.isError.set(true);
    this.errorMessage.set(msg);
    setTimeout(() => {
      this.isError.set(false);
      this.clearDigits();
    }, 400);
  }
}
