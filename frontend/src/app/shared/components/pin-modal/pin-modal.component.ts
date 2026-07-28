import { Component, EventEmitter, Input, Output, signal, HostListener, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PinService } from '../../../core/services/pin.service';
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
          <div class="lock-icon">🔒</div>
          <h3 class="pin-title">{{ title }}</h3>
          <p class="pin-subtitle">{{ subtitle }}</p>
        </div>

        <!-- 6-digit Dots Display -->
        <div class="pin-dots-container">
          <div
            *ngFor="let i of [0,1,2,3,4,5]"
            class="pin-dot"
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
      background: #ffffff; width: 100%; max-width: 380px; border-radius: 28px; padding: 32px 28px;
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

    .btn-close-modal {
      position: absolute; top: 20px; right: 20px; background: #f1f5f9; border: none;
      width: 32px; height: 32px; border-radius: 50%; color: #64748b; font-size: 1rem;
      cursor: pointer; transition: all 0.15s; display: flex; align-items: center; justify-content: center;
    }
    .btn-close-modal:hover { background: #e2e8f0; color: #0f172a; }

    .lock-icon {
      width: 56px; height: 56px; background: #ecfdf5; color: #059669; border-radius: 20px;
      font-size: 1.6rem; display: flex; align-items: center; justify-content: center; margin: 0 auto 14px;
      border: 1px solid #a7f3d0;
    }
    .pin-title { font-size: 1.25rem; font-weight: 800; color: #0f172a; margin: 0 0 6px 0; }
    .pin-subtitle { font-size: 0.85rem; color: #64748b; margin: 0 0 24px 0; }

    /* Dots */
    .pin-dots-container {
      display: flex; justify-content: center; gap: 14px; margin-bottom: 24px;
    }
    .pin-dot {
      width: 18px; height: 18px; border-radius: 50%; border: 2px solid #cbd5e1;
      transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .pin-dot.filled {
      background: #059669; border-color: #059669; transform: scale(1.15);
      box-shadow: 0 0 10px rgba(5,150,105,0.4);
    }

    .error-msg {
      color: #dc2626; font-size: 0.82rem; font-weight: 700; margin-bottom: 16px; height: 20px;
    }

    /* Keypad Grid */
    .keypad-grid {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; max-width: 280px; margin: 0 auto;
    }
    .keypad-btn {
      height: 60px; border-radius: 18px; border: 1px solid #f1f5f9; background: #f8fafc;
      font-size: 1.4rem; font-weight: 700; color: #0f172a; cursor: pointer; transition: all 0.12s;
      display: flex; align-items: center; justify-content: center; user-select: none;
    }
    .keypad-btn:hover { background: #e2e8f0; border-color: #cbd5e1; }
    .keypad-btn:active { transform: scale(0.94); background: #cbd5e1; }
    .btn-action { font-size: 1.1rem; color: #64748b; background: #ffffff; border-color: #e2e8f0; }

    .pin-footer-note {
      font-size: 0.76rem; color: #94a3b8; margin-top: 20px; line-height: 1.4;
    }
  `]
})
export class PinModalComponent {
  private pinService = inject(PinService);
  private notification = inject(NotificationService);

  @Input() isOpen = false;
  @Input() title = 'Xác thực Mã PIN';
  @Input() subtitle = 'Nhập Mã PIN 6 số để xác nhận giao dịch';
  @Input() isSetupMode = false;

  @Output() confirmed = new EventEmitter<string>();
  @Output() cancelled = new EventEmitter<void>();

  digits = signal<number[]>([]);
  isError = signal(false);
  errorMessage = signal('');

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
        this.processPinSubmit();
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
    this.cancelled.emit();
  }

  private processPinSubmit(): void {
    const pinStr = this.digits().join('');
    
    if (this.isSetupMode) {
      // In setup mode, pass pinStr directly back
      this.confirmed.emit(pinStr);
      this.clearDigits();
      return;
    }

    // Verify PIN mode via Backend API
    this.pinService.verifyPin(pinStr).subscribe({
      next: (res) => {
        if (res.data) {
          this.confirmed.emit(pinStr);
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
