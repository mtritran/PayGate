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
          <div class="lock-icon">📧</div>
          <h3 class="pin-title">{{ title }}</h3>
          <p class="pin-subtitle">Mã OTP 6 chữ số đã được gửi về Gmail của bạn</p>
        </div>

        <!-- OTP Sent Status Banner -->
        <div class="otp-sent-banner" *ngIf="otpMessage()">
          <span class="banner-icon">📩</span>
          <div class="banner-text">{{ otpMessage() }}</div>
        </div>

        <div class="otp-sent-banner loading-banner" *ngIf="isSendingOtp() && !otpMessage()">
          <span class="banner-icon">⏳</span>
          <div class="banner-text">Đang gửi mã OTP về Gmail...</div>
        </div>

        <!-- 6-digit Dots Display -->
        <div class="pin-dots-container">
          <div
            *ngFor="let i of [0,1,2,3,4,5]"
            class="pin-dot otp-dot"
            [class.filled]="digits().length > i"
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

        <!-- Resend OTP -->
        <div class="resend-otp-box">
          <button
            class="btn-resend-otp"
            [disabled]="resendCountdown() > 0 || isSendingOtp()"
            (click)="requestEmailOtp()"
          >
            {{ isSendingOtp() ? 'Đang gửi Email...' : (resendCountdown() > 0 ? ('Gửi lại OTP (' + resendCountdown() + 's)') : '🔄 Gửi lại mã OTP về Gmail') }}
          </button>
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
      background: #1e293b; border: 1px solid rgba(100, 116, 139, 0.3);
      border-radius: 20px; padding: 32px 28px; max-width: 380px; width: 100%;
      box-shadow: 0 25px 60px rgba(0,0,0,0.5); position: relative;
      animation: slideUp 0.25s ease;
    }
    @keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
    .shake-error { animation: shake 0.4s ease; }
    @keyframes shake { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-8px)} 40%,80%{transform:translateX(8px)} }
    .btn-close-modal {
      position: absolute; top: 14px; right: 14px;
      background: rgba(100,116,139,0.2); border: none; color: #94a3b8;
      width: 32px; height: 32px; border-radius: 50%; cursor: pointer; font-size: 14px;
      display: flex; align-items: center; justify-content: center; transition: all 0.2s;
    }
    .btn-close-modal:hover { background: rgba(239,68,68,0.2); color: #ef4444; }
    .pin-header { text-align: center; margin-bottom: 20px; }
    .lock-icon { font-size: 36px; margin-bottom: 10px; }
    .pin-title { font-size: 18px; font-weight: 700; color: #f1f5f9; margin: 0 0 6px; }
    .pin-subtitle { font-size: 13px; color: #64748b; margin: 0; }
    .otp-sent-banner {
      display: flex; align-items: center; gap: 10px;
      background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.3);
      border-radius: 10px; padding: 10px 14px; margin-bottom: 16px;
    }
    .loading-banner { background: rgba(59,130,246,0.1); border-color: rgba(59,130,246,0.3); }
    .banner-icon { font-size: 18px; }
    .banner-text { font-size: 12px; color: #94a3b8; line-height: 1.4; }
    .pin-dots-container {
      display: flex; gap: 10px; justify-content: center; margin-bottom: 18px;
    }
    .pin-dot {
      width: 42px; height: 42px; border-radius: 10px;
      border: 2px solid rgba(59,130,246,0.4); background: rgba(30,41,59,0.8);
      transition: all 0.15s;
    }
    .pin-dot.filled {
      background: #3b82f6; border-color: #3b82f6;
      box-shadow: 0 0 12px rgba(59,130,246,0.5);
    }
    .error-msg { color: #ef4444; font-size: 13px; text-align: center; margin-bottom: 12px; }
    .keypad-grid {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 18px;
    }
    .keypad-btn {
      background: rgba(51,65,85,0.8); border: 1px solid rgba(100,116,139,0.2);
      color: #f1f5f9; font-size: 20px; font-weight: 600; height: 56px; border-radius: 12px;
      cursor: pointer; transition: all 0.15s;
    }
    .keypad-btn:hover { background: rgba(59,130,246,0.2); border-color: rgba(59,130,246,0.5); transform: scale(1.04); }
    .keypad-btn:active { transform: scale(0.96); }
    .btn-action { font-size: 14px; color: #94a3b8; }
    .resend-otp-box { text-align: center; }
    .btn-resend-otp {
      background: none; border: 1px solid rgba(100,116,139,0.3); color: #60a5fa;
      font-size: 13px; border-radius: 8px; padding: 8px 14px; cursor: pointer; transition: all 0.2s;
    }
    .btn-resend-otp:hover:not(:disabled) { background: rgba(59,130,246,0.1); }
    .btn-resend-otp:disabled { opacity: 0.5; cursor: not-allowed; }
  `]
})
export class PinModalComponent implements OnChanges {
  private otpService = inject(OtpService);
  private notification = inject(NotificationService);

  @Input() isOpen = false;
  @Input() title = 'Xác thực OTP Giao Dịch';
  // isSetupMode kept for backwards compat but not used
  @Input() isSetupMode = false;

  @Output() confirmed = new EventEmitter<string>();
  @Output() cancelled = new EventEmitter<void>();

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
      this.otpMessage.set('');
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

    this.otpService.verifyOtp(codeStr, this.title).subscribe({
      next: (res) => {
        if (res.data) {
          this.notification.success('Xác thực OTP thành công!');
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
